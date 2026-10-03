# Resume Studio

Resume Studio is a privacy-first resume builder built with React, TypeScript, and Vite. It supports 15 registered templates, a shared resume data model, live preview, local autosave, multiple resume versions, customization, section management, undo/redo, and versioned JSON import/export.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Resume data is stored in this browser's local storage.

## Checks

```sh
npm run lint
npm test
npm run build
```

PDF output uses the browser print dialog. Advanced sections share a common item editor so the section model remains extensible.
