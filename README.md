# spotify-downloader

> Download your Spotify liked songs through YT

## Usage

1. Set up a Spotify developer application. Add a redirect URI of `http://localhost:11234`
2. Enter the following information in `config.json`:

```json
{
  "spotifyClientId": "id from spotify",
  "spotifyClientSecret": "secret from spotify"
}
```

3. Run `authorize.js`, follow the instructions, and authorize the application.
4. Run `app.js`
