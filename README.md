# Gridiron Assignor MVP

A local-first web app for a single Texas football assignor. It starts with a focused assignment board, roster, games, CSV imports, crew sizing, auxiliary staffing, ZIP-based distance estimates, and all-day assignment conflict protection.

## Run it

Open `index.html` in any modern browser. No installation or server is needed.

## Current rules

- Crew size is selected for each game: 3 to 7 officials.
- Auxiliary staffing supports a `+ 4` package (Play Clock, Box, Chain 1, Chain 2) or a `+ 5` package that also includes Game Clock.
- A person cannot be assigned to more than one game on the same date.
- Recommendations prioritize years of experience and proximity using the official and venue ZIP codes.
- Data is stored only in the current browser using local storage.
- ZebraWeb `Crews.xls` exports can be imported directly. The export is HTML despite its filename; it supplies crew names and seven official role assignments, not ZIP codes or experience.
- The openings workflow allows an official to express interest, then requires an assignor to choose the person. It does not self-assign officials or auxiliary workers.

## Next sensible additions

1. Real driving distances and travel-time buffers.
2. Availability blocks and manual conflicts.
3. XLSX support, richer CSV import validation, and editable assignments.
4. ZebraWeb integration once partner API access is confirmed.
