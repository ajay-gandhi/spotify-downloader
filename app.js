const Spotify = require("spotify-web-api-node");
const searchYoutube = require("youtube-api-v3-search");
const fs = require("fs");
const https = require("https");
const ytdownload = require("./ytdl");
const config = require("./config");

// 50 is max
const SPOTIFY_TRACKS_PER_PAGE = 50;

const TRACK_DATA_FILE = `${__dirname}/tracks.json`;

/*********************************** Setup ************************************/
if (!config.access_token || !config.refresh_token) {
  console.log("You must authorize this application first! Read the README");
  process.exit(1);
}

const spotifyApi = new Spotify(config);
spotifyApi.setAccessToken(config.access_token);
spotifyApi.setRefreshToken(config.refresh_token);

/********************************** Helpers ***********************************/

const fail = (err) => {
  console.log("Something went wrong!", err);
  process.exit(1);
};

const sleep = async t => new Promise(r => setTimeout(r, t));

const fetchTracks = async (offset) => {
  const response = await spotifyApi.getMySavedTracks({
    limit: SPOTIFY_TRACKS_PER_PAGE,
    offset,
  }).catch((err) => {
    if (err.message === "Unauthorized" && err.statusCode === 401) {
      // Need to refresh tokens
      return spotifyApi.refreshAccessToken().then((data) => {
        console.log("Refreshed access token!");

        // Set new tokens for this instance
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);

        // Save tokens to config
        config.expires_in = data.body["expires_in"];
        config.access_token = data.body["access_token"];
        config.refresh_token = data.body["refresh_token"];
        fs.promises.writeFile(`${__dirname}/config.json`, JSON.stringify(config, null, 2));

        return spotifyApi.getMySavedTracks({
          limit: SPOTIFY_TRACKS_PER_PAGE,
          offset,
        });
      }, fail);
    }
    fail(err);
  });

  return {
    total: response.body.total,
    tracks: response.body.items,
  };
};

const fetchLibrary = async () => {
  // https://developer.spotify.com/documentation/web-api/reference/#endpoint-get-users-saved-tracks
  const { total, tracks } = await fetchTracks(0);
  console.log(`Initial fetch returned ${tracks.length} tracks out of ${total}`);
  while (tracks.length < total) {
    const { tracks: nextTracks } = await fetchTracks(tracks.length);
    tracks.push(...nextTracks);
    if (tracks.length % 200 === 0) {
      console.log(`  Fetched ${tracks.length} tracks...`);
    }
    await sleep(500);
  }
  console.log(`Fetched ${tracks.length} total tracks`);
  return tracks;
};

const download = (url, filename) => {
  const file = fs.createWriteStream(filename);
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.log("issues downloading from YT", res.statusCode, res.headers);
      }
      res.pipe(file).on("finish", () => resolve(true));
    }).on("error", (e) => {
      resolve(false);
    });
  });
};

/************************************ App *************************************/

(async () => {
  const trackData = await fs.promises.readFile(TRACK_DATA_FILE)
    .then(buffer => JSON.parse(buffer.toString()))
    .catch(async (err) => {
      // Starting from scratch
      console.log("Starting from scratch");

      if (err.code !== "ENOENT") {
        fail(err);
      }

      // Fetch library
      const savedTracks = await fetchLibrary();

      // Write library to local file for us to resume
      console.log(`\nWriting...`);
      await fs.promises.writeFile(TRACK_DATA_FILE, JSON.stringify(savedTracks, null, 2));
      console.log("Done");

      return savedTracks;
    });

  // Download tracks
  console.log("Beginning track downloading");
  for (let i = 0; i < trackData.length; i++) {
    if (i % 100 === 0) {
      console.log(`  Reached track ${i}`);
    }
    const thisTrack = trackData[i];
    if (!thisTrack.downloaded) {
      const trackName = `${thisTrack.track.name} ${thisTrack.track.artists[0].name}`;
      const ytSearch = await searchYoutube(config.youtubeKey, { q: trackName });
      if (!ytSearch.items || ytSearch.items.length < 1) {
        // Skip because no results
        thisTrack.downloaded = true;
        thisTrack.downloadError = "No results found on Youtube";
        continue;
      }

      const videoId = ytSearch.items[0].id.videoId;
      const { url, ext } = await ytdownload(videoId);
      if (!url) {
        thisTrack.downloaded = true;
        thisTrack.downloadError = "Could not find URL with ytdl";
        continue;
      }

      const success = await download(url, `${__dirname}/tracks/${trackName}.${ext}`);
      thisTrack.downloaded = true;
      if (!success) {
        thisTrack.downloadError = `Could not download from URL: ${url}`;
      }

      if (i % 10 === 0) {
        // Save progress
        await fs.promises.writeFile(TRACK_DATA_FILE, JSON.stringify(trackData, null, 2));
        await sleep(1000);
      }
    }
  }
  console.log(`Done. All ${trackData.length} tracks downloaded to ${__dirname}/tracks/`);
})();
