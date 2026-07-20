# cjoftherosary — Portfolio

A personal portfolio site for **Christine Jade Del Rosario**, built with vanilla HTML, CSS, and JavaScript. Content is managed via Firebase Firestore with a custom admin panel.

## Tech Stack

- **HTML5** — semantic markup
- **CSS3** — custom properties, grid, flexbox, animations
- **Vanilla JS** — no frameworks
- **Firebase Firestore** — dynamic portfolio entries
- **Firebase Auth** — admin panel authentication (Google sign-in)
- **Flourish** — embedded data visualizations
- **GitHub Pages** — hosting

## Project Structure

```
porfolio/
├── index.html          # Main portfolio page (HTML only)
├── admin.html          # Admin panel for managing entries (HTML only)
├── css/
│   ├── main.css        # Portfolio styles
│   └── admin.css       # Admin panel styles
├── js/
│   ├── main.js         # Portfolio logic (modals, filters, scroll reveal, Firebase)
│   └── admin.js        # Admin logic (auth, CRUD, drag-and-drop reorder)
├── pictures/           # Local image assets (fallback for external URLs)
│   ├── heart.png
│   ├── riopic.jpg
│   ├── womanlooking.jpg
│   ├── shooting.jpg
│   ├── Goya_Dog_1.jpg
│   ├── dramaticIrony.png
│   ├── graph.png
│   └── piechart.png
└── README.md
```

## Run Locally

Since this is a static site, you just need a local HTTP server. Pick any of these options:

### Option 1: Python (built-in)

```bash
cd porfolio
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000)

### Option 2: Node.js (npx)

```bash
cd porfolio
npx serve .
```

Then open the URL shown in the terminal (usually [http://localhost:3000](http://localhost:3000))

### Option 3: VS Code Live Server

1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` → **Open with Live Server**

> **Note**: Opening `index.html` directly in a browser (via `file://`) may cause CORS issues with Firebase. Always use an HTTP server.

## Deploy to GitHub Pages

1. Push your code to the `main` branch on GitHub:
   ```bash
   git add .
   git commit -m "Update portfolio"
   git push origin main
   ```

2. Go to your repo on GitHub → **Settings** → **Pages**

3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`

4. Click **Save**. Your site will be live at:
   ```
   https://<your-username>.github.io/porfolio/
   ```

## Admin Panel

The admin panel (`admin.html`) is protected by Google sign-in and restricted to a single email address. To manage portfolio entries:

1. Navigate to `/admin.html`
2. Sign in with the authorized Google account
3. Add, edit, reorder (drag-and-drop), or delete entries
4. Changes are saved to Firestore and appear on the public site immediately

## License

© 2026 Christine Jade Del Rosario. All rights reserved.
