# Validation Summary: How to Build Snaps with Snapcraft on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Snap packages
- Snapcraft
- snapcraft.yaml
- Snapcraft plugins
- LXD
- Multipass
- GitHub Actions

## Sources Consulted
- Snapcraft setup documentation: https://documentation.ubuntu.com/snapcraft/8.9.0/how-to/setup/set-up-snapcraft/
- Snapcraft build environment options: https://documentation.ubuntu.com/snapcraft/stable/reference/build-environment-options/
- Snapcraft lifecycle and parts documentation: https://documentation.ubuntu.com/snapcraft/8.9.4/explanation/parts-lifecycle/
- Snapcraft command reference: https://documentation.ubuntu.com/snapcraft/stable/reference/commands/
- Snapcraft clean command reference: https://documentation.ubuntu.com/snapcraft/stable/reference/commands/clean/
- Snapcraft build command reference: https://documentation.ubuntu.com/snapcraft/stable/reference/commands/build/
- Snapcraft snapcraft.yaml reference: https://documentation.ubuntu.com/snapcraft/stable/reference/project-file/snapcraft-yaml/
- Snapcraft architecture reference: https://documentation.ubuntu.com/snapcraft/stable/reference/architectures/
- Snapcraft NPM plugin reference: https://documentation.ubuntu.com/snapcraft/stable/common/craft-parts/reference/plugins/npm_plugin/
- Snapcraft Python plugin reference: https://documentation.ubuntu.com/snapcraft/stable/reference/plugins/python_plugin/
- Snapcraft Go plugin reference: https://documentation.ubuntu.com/snapcraft/en/latest/common/craft-parts/reference/plugins/go_plugin/
- Snap hook documentation: https://snapcraft.io/docs/reference/development/supported-snap-hooks/
- Snap install modes documentation: https://snapcraft.io/docs/explanation/snap-development/install-modes/
- GitHub artifact action deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- Canonical Snapcraft build action repository: https://github.com/canonical/action-build

## Issues Found
- The post said Snapcraft uses Multipass for clean build VMs and described standard builds as running in a Multipass VM. Current Snapcraft setup documentation says Snapcraft supports LXD and Multipass, with LXD the default provider for core22 and higher on Linux. Updated the wording to describe an isolated build provider instead of assuming Multipass.
- The LXD example used `SNAPCRAFT_BUILD_ENVIRONMENT=lxd`, which is not the current documented way to choose LXD. Replaced it with the documented `snapcraft --use-lxd` command.
- The NPM plugin example set `npm-node-version` without `npm-include-node: true`. Current plugin documentation requires `npm-node-version` when including Node in the final package. Added `npm-include-node: true` so the version pin has the intended effect.
- The lifecycle listed `snap` as the final step. Current Snapcraft lifecycle documentation names the final step and command `pack`. Updated the lifecycle diagram and table.
- The example `snapcraft clean --step build` used an option that is not present in the current clean command reference. Replaced it with `snapcraft clean`, and corrected the specific part clean example to use the part name from the sample YAML.
- The architecture build comment implied `--build-for` only requires a build provider. Current architecture documentation says `--build-for` selects a build-for entry from the build plan. Updated the comment accordingly.
- The local snap install command omitted `--dangerous`. Current snap install-mode documentation says local unsigned snaps need `--dangerous`; added it to the devmode install command.
- The debugging section used `snapcraft --shell` for a failed build. Current command documentation distinguishes `--debug` for opening a shell when the build fails from `--shell`, which opens a shell instead of running a step. Changed the failure-debugging command to `snapcraft --debug`.
- The debugging shell example used a hard-coded `/root/parts/...` path. Replaced it with the documented part environment variables `CRAFT_PART_BUILD` and `CRAFT_PART_INSTALL`.
- The GitHub Actions workflow used `actions/upload-artifact@v3`, which GitHub deprecated for GitHub.com after January 30, 2025. Updated it to `actions/upload-artifact@v4`.

## Review Notes
The examples continue to use `base: core22`, which remains valid. A future refresh could update the primary example to `core24` or newer for new projects, but that is an editorial modernization rather than a correctness fix.
