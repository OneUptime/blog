# Validation Summary: How to Build Flatpak Applications on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Flatpak
- flatpak-builder
- Flatpak manifests in JSON and YAML
- Flatpak runtimes, SDKs, BaseApps, modules, sources, and finish arguments
- Flathub submission workflow
- AppStream/MetaInfo XML
- GitHub Actions for Flatpak builds

## Sources Consulted
- Flatpak Manifests documentation: https://docs.flatpak.org/en/latest/manifests.html
- Flatpak Builder Command Reference: https://docs.flatpak.org/en/latest/flatpak-builder-command-reference.html
- Flatpak Sandbox Permissions documentation: https://docs.flatpak.org/en/latest/sandbox-permissions.html
- Flatpak Module Sources documentation: https://docs.flatpak.org/en/latest/module-sources.html
- Flatpak Available Runtimes documentation: https://docs.flatpak.org/en/latest/available-runtimes.html
- Flatpak Single-file Bundles documentation: https://docs.flatpak.org/en/latest/single-file-bundles.html
- Flatpak Electron guide: https://docs.flatpak.org/en/latest/electron.html
- Flathub Requirements: https://docs.flathub.org/docs/for-app-authors/requirements
- Flathub Submission documentation: https://docs.flathub.org/docs/for-app-authors/submission
- Flathub MetaInfo guidelines: https://docs.flathub.org/docs/for-app-authors/metainfo-guidelines
- flatpak/flatpak-github-actions documentation: https://github.com/flatpak/flatpak-github-actions
- GNOME Release Calendar: https://release.gnome.org/calendar/
- Flathub org.gnome.Platform and org.gnome.Sdk listings: https://flathub.org/en/apps/org.gnome.Platform and https://flathub.org/en/apps/org.gnome.Sdk
- Flathub org.freedesktop.Platform listing: https://flathub.org/en/apps/org.freedesktop.Platform

## Issues Found
- The Flathub beta remote was described as a GNOME SDK repository. Changed the comment to describe it as the Flathub beta remote.
- `org.electronjs.Electron2.BaseApp` was listed as a standard runtime. Changed this to explain that Electron apps typically use `org.freedesktop.Platform` plus the Electron BaseApp.
- Runtime examples used outdated GNOME 46 and Freedesktop 23.08 branches. Updated examples to GNOME 50 and Freedesktop 25.08, which are current supported branches as of 2026-05-19.
- Manifest examples used `app-id`, which is still accepted in some examples but is deprecated in the current Flatpak Builder command reference in favor of `id`. Updated JSON and YAML examples to use `id`.
- The Node.js build example used `npm install` in a way that would normally require network access during the build. Updated it to use offline installation and include a generated sources file placeholder.
- The finish-args example granted explicit access to `org.freedesktop.portal.Desktop`, but Flatpak allows portal APIs under `org.freedesktop.portal.*` by default. Replaced the misleading permission entry with a comment.
- The Flathub submission workflow described creating a standalone repository named after the app ID. Updated it to match the current documented `flathub/flathub` fork, `new-pr` branch, and PR target workflow.
- The Flathub requirements list omitted the requirement that submitted manifests use a runtime hosted on Flathub and the latest supported runtime version at submission time. Added that requirement.
- The MetaInfo XML example was too minimal for Flathub validation. Added required metadata license, project license, developer, and launchable entries.
- The GitHub Actions example used an old unofficial action namespace and image. Updated it to the official `flatpak/flatpak-github-actions/flatpak-builder@v6` action and current `ghcr.io/flathub-infra/flatpak-github-actions` image namespace.

## Review Notes
- The GitHub Actions container image tag should be kept aligned with the runtime used by the manifest when a matching image is available. The official action documentation currently demonstrates the `gnome-48` image namespace, while GNOME 50 runtime and SDK are current on Flathub.
- The examples are illustrative and still use placeholder source URLs, commits, checksums, and application IDs. A real submission must replace these with valid upstream sources, exact checksums, and an application ID that follows Flathub's ID rules.
