> ## 🔒 INTERNAL USE ONLY — AppMod for Z Squad
> **The internal IBM site URL is strictly internal to the AppMod squad and must never be shared externally.**
> You are welcome to screenshare a live demo of the use cases to showcase what we have built, but do not share or distribute the actual URL with anyone outside the squad.

---

# IBM Bob Premium Package for Z — Workshop Lab Guide Site

A React + Vite lab guide site styled with IBM Carbon-inspired branding. Hosts seven hands-on labs for IBM Bob Premium Package for Z, and is designed to be deployed to GitHub Pages for client-facing workshops.

**Internal (IBM) live site:** [https://pages.github.ibm.com/CE4S/BOB-for-Z-Workshop/](https://pages.github.ibm.com/CE4S/BOB-for-Z-Workshop/)

---

## ⚠️ Important Rules for Use

This site contains **sensitive IBM content** that is actively evolving — new use cases and labs are added weekly as the product grows. Please follow these rules to protect our material:

- **Share the client-facing site link only during the event itself.** Do not distribute it too far in advance or leave it up indefinitely.
- **Delete or take down the client-facing site 2–3 days after the workshop ends.** This limits exposure and ensures participants are always seeing the most current content at the next event.
- **Use a unique username and password for every client deployment.** Never reuse credentials across different clients or events.
- **Share login credentials privately and only with attendees.** Treat them the same way you would any IBM confidential resource — do not post them publicly or in open channels.
- **Do not screenshot or redistribute lab content outside the event context.** The labs are living use cases that must be tested each time, as the product and underlying models are constantly evolving.

---

## Labs

| Lab | Topic | Duration | Difficulty |
|-----|-------|----------|------------|
| Lab 1 | Getting Started — workspace scan, Agent.md, Data Dictionary | 20 min | Beginner |
| Lab 2 | Technical Design Document generation | 10–15 min | Beginner |
| Lab 3 | Impact Analysis — field change ripple analysis | 30 min | Beginner |
| Lab 4 | Refactoring & Service Extraction | 60 min | Intermediate |
| Lab 5 | Spec-Driven Code Generation | 45 min | Intermediate |
| Lab 6 | UI Modernization — green screen to web UI | 45 min | Intermediate |
| Lab 7 | COBOL to Java Modernization | 30–45 min | Intermediate |

---

## Default Credentials (Internal)

- **Username:** `workshop`
- **Password:** `BobPremiumZ2025!`

---

## 🚀 Setting Up a Client-Facing Workshop Site

Follow these steps each time you need to spin up a public-facing version of this site for a client.

### Step 1 — Create a public GitHub repo

Go to [github.com/new](https://github.com/new) and create a new **public** repo.
- Name it something like `workshop-<clientname>` (e.g. `workshop-acme`)
- Note the full URL — you'll need it in the next step (e.g. `https://github.com/your-username/workshop-acme`)

### Step 2 — Copy this folder and let Bob do the wiring

1. On your machine, copy this entire repo folder into a new folder for the client.
2. Open that new folder in VS Code with Bob.
3. Paste the following prompt into Bob:

---

```
I have in this directory a Pages site originally built for an IBM GitHub repo but I need to edit it and place it in a git.com repo so that people outside of IBM can access it.

Help me edit this code for my github.com repo located here: <insert your repo URL>

Also update the login credentials so that:
- Username: Workshop_<clientname>
- Password: MainframeIBM1!

If there are any manual steps I need to take, output them clearly at the end.
```

---

Bob will:
- Update all hardcoded repo paths (`vite.config.js`, `App.jsx`, `LabContent.jsx`, `ResourcesPage.jsx`, `HomePage.jsx`, `LabView.jsx`, `Header.jsx`, `Sidebar.jsx`, `LoginPage.jsx`, `index.html`)
- Generate new SHA-256 hashes for the credentials and update `src/auth.js`
- Tell you any remaining manual steps (e.g. enabling GitHub Pages in the new repo settings)

### Step 3 — Push and enable GitHub Pages

Once Bob is done:

1. Commit and push everything to `main` on your new github.com repo.
2. Build and push the `gh-pages` branch manually (since GitHub Actions may not be available):
   ```bash
   cd PagesSite
   npm install
   npm run build
   cd dist
   git init
   git checkout -b gh-pages
   git add -A
   git commit -m "Deploy"
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -f origin gh-pages
   ```
>Get Bob to help with this above step if you'd like.

3. In your github.com repo: **Settings → Pages → Source → Deploy from a branch → `gh-pages`**

Your client site will be live at:
```
https://<your-github-username>.github.io/<your-repo-name>/
```
>The url will be on your Settings → Pages (at the top once deployed)
>You can view the status of your deployment in the Actions tab.(usually take 1-2 minutes)
---

# Manual Tasks - If You Want That

## Changing Credentials Manually-But Bob can do it-but just in case...

Credentials are stored as SHA-256 hashes in [`src/auth.js`](src/auth.js) — never as plaintext.

To generate hashes for new credentials:
```bash
node -e "const c=require('crypto'); console.log('user:', c.createHash('sha256').update('your-username').digest('hex')); console.log('pass:', c.createHash('sha256').update('your-password').digest('hex'));"
```

Then replace `USERNAME_HASH` and `PASSWORD_HASH` in [`src/auth.js`](src/auth.js).

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173/CE4S/BOB-for-Z-Workshop/](http://localhost:5173/CE4S/BOB-for-Z-Workshop/)

> **Note:** If you have re-pathed this for a different repo, update the URL to match the `base` in `vite.config.js`.

---

## Adding or Updating Lab Content

Lab content is served as static markdown from `public/lab-instructions/`. To add or update labs:

1. Edit or add `.md` files in `public/lab-instructions/`
2. Update `public/lab-instructions/index.json` with the new lab entry
3. Add any new images to `public/lab-instructions/images/`
4. Rebuild and redeploy the `gh-pages` branch

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Routing | react-router-dom v6 |
| Markdown | react-markdown + remark-gfm + rehype-raw |
| Diagrams | mermaid.js |
| Styling | Tailwind CSS + IBM Plex Sans/Mono |
| Deploy | Manual `gh-pages` branch push (or GitHub Actions if available) |
