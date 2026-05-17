# Validation Summary: How to Write Your First Snapcraft.yaml on Ubuntu

## Status
validated

## Post Type
Tutorial / Beginner guide

## Technologies Covered
- Snapcraft (snap packaging tool)
- snapcraft.yaml schema (metadata, parts, apps, plugs, daemons)
- Snap base snaps (core22, core20, bare)
- Snapcraft plugins (nil, make, cmake, python, go, dump)
- craftctl (core22+ build scriptlet helper)
- Multipass (default Snapcraft build backend)
- Ubuntu

## Sources Consulted
- Snapcraft documentation – snapcraft.yaml reference: https://snapcraft.io/docs/snapcraft-yaml-reference
- Snapcraft – Nil plugin: https://documentation.ubuntu.com/snapcraft/stable/common/craft-parts/reference/plugins/nil_plugin/
- Snapcraft – Go plugin: https://documentation.ubuntu.com/snapcraft/stable/common/craft-parts/reference/plugins/go_plugin/
- Snapcraft – `snapcraft lint` command reference: https://documentation.ubuntu.com/snapcraft/stable/reference/commands/lint/
- Snapcraft – Build overrides and `CRAFT_PART_INSTALL`: https://documentation.ubuntu.com/snapcraft/8.14/explanation/build-overrides/
- Snapcraft – Change from core20 to core22: https://documentation.ubuntu.com/snapcraft/stable/how-to/change-bases/change-from-core20-to-core22/
- Snapcraft – Customise the build with craftctl: https://documentation.ubuntu.com/snapcraft/8.14/common/craft-parts/how-to/customise-the-build-with-craftctl/
- Snapcraft – Services and daemons: https://snapcraft.io/docs/services-and-daemons/
- Snapcraft – Set up Snapcraft: https://documentation.ubuntu.com/snapcraft/stable/how-to/set-up-snapcraft/

## Issues Found

1. **`touch snap/snapcraft.yaml` would fail because `snap/` does not exist.** `touch` does not create parent directories. Added an explicit `mkdir snap` step before `touch snap/snapcraft.yaml`.

2. **`$SNAPCRAFT_PART_INSTALL` used in a core22 example.** For `base: core22` (which the post recommends), the canonical part environment variable is `$CRAFT_PART_INSTALL` (the legacy `SNAPCRAFT_*` names belong to core20). Changed the `override-build` example to use `$CRAFT_PART_INSTALL`.

3. **`snapcraft lint` mis-described as a pre-build YAML validator.** `snapcraft lint` actually lints a built `.snap` file (it requires a snap file argument) and is not a YAML schema validator. Reworked the "Validating Your snapcraft.yaml" section so that `snapcraft` is shown as the YAML validator (errors surface during build) and `snapcraft lint ./my-app_1.0_amd64.snap` is correctly shown as a post-build linter on the produced snap.

4. **`nil` plugin example was inaccurate.** The post claimed `nil` "stages files" and showed `plugin: nil` with `source: files/`. The nil plugin is a no-op: it does not copy source files into the install directory. Without an `override-build` (e.g. `cp -r . $CRAFT_PART_INSTALL/`) or use of `stage-packages`, nothing would end up in the snap. Rewrote the description and replaced the example with a typical `nil` use case (a part that only pulls in `stage-packages`).

## Review Notes

- The post uses `go/1.21/stable` as the Go toolchain snap channel. This is a valid track but is now older; readers may wish to pick a more current Go track when copy-pasting. Left as-is because it is technically valid and version freshness is stylistic.
- The list of daemon types (`simple`, `forking`, `oneshot`, `notify`) is correct but not exhaustive — `dbus` is also supported. Not added, since the post’s intent is an introductory subset.
- The post correctly notes that `snap/snapcraft.yaml` is the modern convention over a bare `snapcraft.yaml` at the project root.
- `core24` exists (Ubuntu 24.04 base) but is not mentioned. Not flagged as an error since the post is scoped to introducing common bases, but readers building new projects today may want to consider `core24`.
- The `craftctl default` / `craftctl set version=...` snippet correctly replaces the older `snapcraftctl` form used in core20.
