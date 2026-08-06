# D&D 5E Character Sheet

A no-install character sheet for D&D 5th Edition. Auto-calculates modifiers,
saving throws, skills, passive perception, and spellcasting DC/attack bonus as
you fill it in..

## File structure
```
index.html              → page layout, styling, and markup
js/app.js                → application logic (calculations, choice panels, save/load)
js/data/races.js          → playable races/species
js/data/classes.js        → classes and subclasses
js/data/backgrounds.js     → backgrounds
js/data/spells.js          → spell lists, descriptions, and damage/effect data
js/data/equipment.js       → weapons and equipment reference data
js/data/reference.js       → general reference lists (languages, tool proficiencies)
```
To add a new race, class, background, or spell, edit the matching file in
`js/data/` — you don't need to touch `index.html` or `js/app.js` for content
additions. Load order matters (data files must load before `app.js`), so keep
the `<script>` tags in `index.html` in their existing order if you ever move
things around.

## Use it right now
Open `index.html` in any browser — no server or installation needed. (Because
the page now loads its data from separate `.js` files, some browsers block
`file://` script loading with strict local security settings; if `index.html`
opens but looks blank or broken when double-clicked, run a tiny local server
in the folder instead, e.g. `python3 -m http.server` then visit
`http://localhost:8000`. This isn't needed at all once it's hosted on GitHub
Pages — see below.)

## Put it on GitHub so your friends can use it
1. Create a new repository on GitHub (e.g. `dnd-character-sheet`).
2. Upload the **entire folder** — `index.html` and the `js/` folder with all
   its contents — preserving the folder structure (drag-and-drop the whole
   folder works, or `git add`/`commit`/`push`).
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch", pick the
   `main` branch and `/ (root)` folder, then save.
5. GitHub will give you a live link, usually
   `https://<your-username>.github.io/<repo-name>/` within a minute or two.
6. Share that link with your friends — each person fills out their own sheet in
   their own browser.

## Saving characters
Nothing is uploaded anywhere. Each person's data stays in their own browser tab.
- **Save Character (.json)** downloads their character as a small file they can
  keep, back up, or send to you.
- **Load File** re-opens a previously saved `.json` file to keep editing it.
- **Download as PDF** opens the browser's print dialog — choose "Save as PDF" as
  the destination to get a printable copy of the sheet.
