# spotify-downloader

> Download your Spotify liked songs through YT

## Usage

1. Set up a Spotify developer application. Add a redirect URI of `http://localhost:11234`
2. [Set up a YouTube developer application.](https://developers.google.com/youtube/v3/getting-started)
3. Enter the following information in `config.json`:

```json
{
  "spotifyClientId": "id from spotify",
  "spotifyClientSecret": "secret from spotify",
  "youtubeKey": "key from youtube API"
}
```

4. Run `authorize.js`, follow the instructions, and authorize the application.
5. Run `app.js`
