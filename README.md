# Gridiron Assignor MVP

A standalone, local-first feedback demo for Texas football assigning. It includes a focused assignment board, role-based demo portals, roster, games, CSV imports, crew sizing, auxiliary staffing, ZIP-based distance estimates, availability blocks, and same-day conflict protection.

## Run it

Open `index.html` in any modern browser. No installation or server is needed.

## Current rules

- Crew size is selected for each game: 3 to 7 officials.
- Auxiliary staffing supports a `+ 4` package (Play Clock, Box, Chain 1, Chain 2) or a `+ 5` package that also includes Game Clock.
- A person cannot be assigned to more than one game on the same date.
- Recommendations prioritize years of experience and proximity using the official and venue ZIP codes.
- Data is stored only in the current browser using local storage; demo roles do not represent real accounts.
- The openings workflow allows an official to express interest, then requires an assignor to choose the person. It does not self-assign officials or auxiliary workers.
- Officials and auxiliary workers can accept or turn back their own pending assignment, and can block a full day or time window locally.

## Next sensible additions

1. Real driving distances and travel-time buffers.
2. XLSX support, richer CSV import validation, established crews, and editable assignments.
3. Shared accounts, database, and secure notifications for production use.
