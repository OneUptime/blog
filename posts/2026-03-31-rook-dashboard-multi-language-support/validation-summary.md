# Validation Summary: How to Configure Dashboard Multi-Language Support

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph Dashboard (Angular-based web UI)
- Ceph Manager (mgr) module
- Angular i18n / internationalization
- Transifex (translation management platform)
- kubectl

## Sources Consulted
- Ceph Dashboard source: `src/pybind/mgr/dashboard/controllers/home.py` — language detection logic (cd-lang cookie, Accept-Language header fallback)
- Ceph Dashboard source: `src/pybind/mgr/dashboard/frontend/src/app/shared/components/language-selector/supported-languages.enum.ts` — authoritative list of supported locales
- Ceph Dashboard source: `src/pybind/mgr/dashboard/frontend/project.json` — Angular build configuration with locale mappings
- Ceph Dashboard source: `src/pybind/mgr/dashboard/module.py` and `settings.py` — CLI command definitions (confirmed no `set-locale` / `get-locale` commands)
- Ceph Developer Documentation: `doc/dev/developer_guide/dash-devel.rst` — i18n extraction commands and Transifex project URL
- Transifex project: https://www.transifex.com/ceph/ceph-dashboard/

## Issues Found

### 1. Fabricated CLI commands: `ceph dashboard set-locale` / `get-locale`
**What was wrong:** The post claimed administrators could run `ceph dashboard set-locale zh-Hans` and `ceph dashboard get-locale` to set and verify a cluster-wide default language. These commands do not exist in the Ceph CLI.
**What was changed:** Replaced the "Setting the Default Language" section to accurately describe the language selection priority: (1) `cd-lang` browser cookie, (2) browser `Accept-Language` header, (3) build-time default. Replaced the fabricated commands with a working Python script that lists available locale directories.
**Why:** Running nonexistent commands would produce errors and confuse readers.

### 2. Wrong i18n file path and format
**What was wrong:** The post referenced `/usr/share/ceph/mgr/dashboard/frontend/dist/assets/i18n/` and assumed translations are stored as JSON files (e.g., `de-DE.json`). In reality, the Ceph Dashboard uses Angular AOT compilation, producing separate full application builds per locale as subdirectories under `frontend/dist/` (e.g., `dist/de/`, `dist/zh-Hans/`).
**What was changed:** Updated the `ls` command to list `frontend/dist/` instead of `assets/i18n/`. Replaced the translation quality verification script (which read nonexistent JSON files) with a script that lists available locale directories and a link to Transifex for completeness percentages.
**Why:** The original commands would fail since the path and file format don't exist.

### 3. Incomplete and incorrect locale codes in supported languages list
**What was wrong:** The post listed only 7 languages with incorrect runtime locale codes (e.g., `de-DE`, `es-ES`, `fr-FR`). The actual runtime locale codes are shortened: `de`, `es`, `fr`, `ko`, `pt`. Additionally, 6 supported languages were missing: Czech (cs), Chinese Traditional (zh-Hant), Indonesian (id), Italian (it), Japanese (ja), and Polish (pl).
**What was changed:** Updated the list to include all 13 supported languages with their correct runtime locale codes.
**Why:** Incomplete list and wrong codes would mislead readers trying to configure or verify language support.

### 4. Incorrect claim about user preference storage
**What was wrong:** The post stated "This setting is stored per user account and persists across sessions," implying server-side per-user storage. The language preference is actually stored as a browser cookie (`cd-lang`).
**What was changed:** Updated to state the preference is stored as a browser cookie (`cd-lang`) and persists across sessions in the same browser.
**Why:** This distinction matters — the setting won't follow a user across different browsers or devices.

### 5. Summary referenced nonexistent CLI command
**What was wrong:** The summary section recommended using `ceph dashboard set-locale` which doesn't exist.
**What was changed:** Rewrote the summary to accurately describe the cookie-based language preference and Accept-Language fallback mechanism.
**Why:** Consistency with the corrected content above.

## Review Notes
- The `npm run i18n:extract` command and Transifex project URL are correct.
- The browser Accept-Language header behavior is correctly described (it is the fallback mechanism when no `cd-lang` cookie exists).
- The Ceph Dashboard frontend path within the container (`/usr/share/ceph/mgr/dashboard/frontend/`) is correct for the base path, though the `dist/` subdirectory structure was corrected.
- The UI steps for setting language preference (user icon > User profile > Language dropdown) are reasonable descriptions of the Dashboard UI flow, though the exact menu labels may vary between Ceph versions.
- Translation coverage varies significantly by language. Readers should check Transifex for current completeness percentages before relying on non-English locales in production.
