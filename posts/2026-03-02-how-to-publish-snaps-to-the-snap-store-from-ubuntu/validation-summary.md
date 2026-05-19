# Validation Summary: How to Publish Snaps to the Snap Store from Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Snapcraft CLI (login, register, upload, release, revisions, status, metrics, close, set-default-track, list-tracks, export-login)
- Snap Store (channels, tracks, risks, revisions)
- snapcraft.yaml configuration (base, parts, apps, plugs, confinement, grade)
- GitHub Actions (snapcore/action-build@v1, snapcore/action-publish@v1)
- Ubuntu One SSO authentication
- core22 base snap, Go plugin / build-snaps

## Sources Consulted
- Snapcraft commands reference: https://documentation.ubuntu.com/snapcraft/stable/reference/commands/
- Snapcraft authentication docs: https://snapcraft.io/docs/snapcraft-authentication
- Snapcraft login command reference: https://documentation.ubuntu.com/snapcraft/stable/reference/commands/login/
- Snapcraft export-login command reference: https://documentation.ubuntu.com/snapcraft/stable/reference/commands/export-login/
- Snapcraft 7 release notes: https://snapcraft.io/docs/release-notes-snapcraft-7-0
- Snapcraft forum (snapcraft-authentication-options): https://forum.snapcraft.io/t/snapcraft-authentication-options/30473
- Snapcraft forum (store-requests / track creation requests): https://forum.snapcraft.io/c/store-requests/
- Snap revisions explanation: https://snapcraft.io/docs/explanation/how-snaps-work/revisions/
- snapcore/action-build and action-publish GitHub Actions

## Issues Found
1. **`snapcraft login --with credentials.txt` is deprecated and no longer supported.** Since Snapcraft 7, non-interactive authentication is driven by the `SNAPCRAFT_STORE_CREDENTIALS` environment variable. The `--with` flag is not documented on the current `snapcraft login` command reference. I removed the `snapcraft login --with credentials.txt` example, kept the `SNAPCRAFT_STORE_CREDENTIALS` export, and added a short note explaining the deprecation so readers understand why only the env-var path is shown.

2. **`snapcraft create-track` is not a real Snapcraft CLI command.** The Snapcraft commands reference lists `list-tracks` and `set-default-track`, but track creation is performed manually by Canonical in response to a forum post in the store-requests category (https://forum.snapcraft.io/c/store-requests/). I replaced the bogus `snapcraft create-track my-app-name --version=1.0` example with a valid `snapcraft list-tracks my-app-name` example and added a clarifying paragraph explaining that new tracks must be requested via the Snapcraft forum.

## Review Notes
- `snapcraft list-revisions` is correct — it is a valid command (also aliased as `snapcraft revisions`).
- `snapcraft set-default-track`, `snapcraft status`, `snapcraft metrics`, `snapcraft release`, `snapcraft upload`, `snapcraft register`, `snapcraft whoami`, `snapcraft close`, and `snapcraft export-login --snaps=... --channels=... -` are all verified valid as written.
- The `core22` base is still supported at the time of validation, though newer bases (`core24`) exist; the post's use of `core22` remains accurate but may become dated as `core24` becomes the recommended default for new snaps.
- The `go/1.21/stable` build-snap reference will become outdated as the Go snap track set evolves; readers should consult current Go snap tracks when adopting this snippet.
- The `snapcore/action-build@v1` and `snapcore/action-publish@v1` actions are the canonical GitHub Actions for snap CI publishing and are pinned appropriately for a tutorial.
- The store listing URL pattern (`https://snapcraft.io/<snap-name>/listing`) and publisher dashboard (`https://snapcraft.io/publisher`) are accurate.
- The claim that snaps refresh "within 24 hours" matches the default snapd refresh behavior (snapd checks for updates roughly four times per day by default, so a 24-hour upper bound is a reasonable simplification for the target audience).
