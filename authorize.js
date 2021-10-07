const http = require("http");
const Spotify = require("spotify-web-api-node");
const url = require("url");
const fs = require("fs");
const config = require("./config");

const PORT = 11234;
const SCOPES = ["user-library-read"];

/************************ Step 1: Print authorize URL *************************/
const spotifyApi = new Spotify({
  redirectUri: `http://localhost:${PORT}`,
  clientSecret: config.spotifyClientSecret,
  clientId: config.spotifyClientId,
});

// Create the authorization URL
const authorizeURL = spotifyApi.createAuthorizeURL(SCOPES);
console.log("Visit this URL to authorize this application:");
console.log(authorizeURL);

/***************************** Step 2: Get tokens *****************************/
const server = http.createServer((request, response) => {
  if (request.url.startsWith("/callback")) {
    const query = url.parse(request.url, true).query;
    console.log("Received authorization code:", query.code);

    // Retrieve an access token and a refresh token
    spotifyApi.authorizationCodeGrant(query.code).then((data) => {
      config.expires_in = data.body["expires_in"];
      config.access_token = data.body["access_token"];
      config.refresh_token = data.body["refresh_token"];
      fs.writeFileSync(`${__dirname}/config.json`, JSON.stringify(config, null, 2));
      console.log("Successfully retrieved tokens!");
      process.exit(0);
    }, (err) => {
      console.log("Something went wrong!", err);
      process.exit(1);
    });
  }
  response.end();
});

server.listen(PORT);
