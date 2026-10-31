# Portfolio maintenance rules

- The active website source is in `portfolio/`; its contents are published at the GitHub Pages repository root.
- Keep all visitor-facing website text in English, except the user-approved temporary Chinese devlog body placeholders.
- Whenever portfolio files or folders are added, modified, renamed, moved, or removed, review and update the terminal's virtual file list, `ls` output, `cd`/`cat` suggestions, navigation targets, and simulated removal log together. They must reflect the same current portfolio structure, including nested content. Do not add build tools or implementation files to the visitor-facing virtual file list.
- The removal easter egg is triggered identically by `rm -rf` and `rm -rf /` (not `-rm -rf`). It is a visual simulation only: never execute a real shell deletion or delete site assets. Keep its log synchronized with the virtual files and directories, listing children before their containing directories.
- Preserve the removal animation's 1 ms per-character timing, no pauses between log lines, and one-minute browser access restriction unless the user requests a change.
- Before completing a content update, verify the file list, command navigation, and removal log agree; update relevant checks when the virtual structure changes.

- `README.md` in the virtual terminal opens the personal devlog reader (`readme.html`, `archive.js`, `archive.css`). Keep it out of `cd` suggestions and available under `cat`/`ls`. Reader implementation assets are not extra virtual portfolio files. The GitHub repository README remains the short website description.

- Maintain the virtual directory tree in `portfolio/filesystem.js` (published as `filesystem.js`). All terminal listing, completion, navigation, and removal logs derive from this one tree. Use uppercase underscore-separated directory names for multiword categories (for example, `PROGRAMMING_LANGUAGES`). Sort sibling directories lexicographically A–Z at every level, with digits before letters. Show directories before files in mixed lists; sort files within their group. Keep the `..` navigation option after the directory choices. Apply this ordering consistently to listings, suggestions, and recursive removal logs.
