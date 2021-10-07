const ytdl = require("ytdl-core");
const mime = require("mime-types");

module.exports = async (videoId) => {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // Download video information so that we can choose a format and get URL
  const info = await ytdl.getInfo(url);

  const format = info.formats.reduce((acc, c) => {
    // Isn't an audio format
    if (!c.mimeType || c.mimeType.indexOf("audio") < 0) return acc;

    // mp4 best
    if (c.container === "mp4") {
      if (acc.container !== "mp4") return c;
      if (c.audioBitrate > acc.audioBitrate && c.audioBitrate < 128) return c;

      // webm second best
    } else if (c.container === "webm" && acc.container !== "mp4") {
      if (c.audioBitrate > acc.audioBitrate) return c;
    }

    return acc;
  }, { container: "false", audioBitrate: 0 });

  return {
    url: format.url,
    ext: mime.extension(format.mimeType),
  };
};
