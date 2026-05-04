# VMarket

VMarket is a static marketing-planning dashboard for `IOL`, `Title Sites`, and `Conde Naste`. It runs with plain HTML, CSS, and JavaScript, so it can be deployed directly to GitHub Pages without a backend.

## What It Does

- Starts with a clean, empty planner and three fixed brands
- Tracks campaign and product plans in one place
- Captures the campaign brief: objective, audience, need, desire, and value proposition
- Organizes delivery across `Design`, `Social`, `Content`, `Visuals`, and `Messaging`
- Provides a live task board plus visibility/engagement/conversion tracking
- Stores data in browser `localStorage`
- Supports JSON export/import for backups or sharing snapshots

## Files

- `index.html`
- `styles.css`
- `app.js`

## Local Preview

Open `index.html` directly in a browser, or run a simple static server from this folder:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Deploy To GitHub Pages

1. Push this folder to a GitHub repository.
2. Keep `index.html`, `styles.css`, and `app.js` at the repo root.
3. In GitHub, open `Settings` -> `Pages`.
4. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
5. Choose your main branch and `/ (root)` folder, then save.
6. Wait for GitHub Pages to publish the site and open the generated URL.

## Notes

- Because this is a static app, data is saved per browser using `localStorage`.
- GitHub Pages does not provide shared team storage by default.
- Use `Export` to download the current plan and `Import` to restore it elsewhere.
- `Clear Data` removes all saved campaigns and returns the app to a blank state.
