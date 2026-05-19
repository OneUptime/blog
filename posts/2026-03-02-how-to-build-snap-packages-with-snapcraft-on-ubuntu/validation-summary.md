# Validation Summary: How to Build Snap Packages with Snapcraft on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Snap packages
- Snapcraft CLI
- LXD
- Multipass
- snapcraft.yaml configuration
- Snap lifecycle parts and plugins

## Sources Consulted
- Snapcraft documentation: Set up Snapcraft - https://documentation.ubuntu.com/snapcraft/stable/how-to/set-up-snapcraft/
- Snapcraft documentation: Build environment options - https://documentation.ubuntu.com/snapcraft/8.9.4/reference/build-environment-options/
- Snapcraft documentation: Commands - https://documentation.ubuntu.com/snapcraft/stable/reference/commands/
- Snapcraft documentation: build command - https://documentation.ubuntu.com/snapcraft/stable/reference/commands/build/
- Snapcraft documentation: clean command - https://documentation.ubuntu.com/snapcraft/stable/reference/commands/clean/
- Snapcraft documentation: pack command - https://documentation.ubuntu.com/snapcraft/latest/reference/commands/pack/
- Snapcraft documentation: Parts lifecycle / lifecycle details - https://documentation.ubuntu.com/snapcraft/8.3/common/craft-parts/explanation/lifecycle.html
- Snapcraft documentation: Parts and Steps - https://documentation.ubuntu.com/snapcraft/stable/reference/parts/parts-and-steps/
- Snapcraft documentation: Part environment variables - https://documentation.ubuntu.com/snapcraft/8.9.3/reference/parts/part-environment-variables/
- Snapcraft documentation: Customise the build with craftctl - https://documentation.ubuntu.com/snapcraft/stable/common/craft-parts/how-to/customise-the-build-with-craftctl/
- Snapcraft documentation: Architectures - https://documentation.ubuntu.com/snapcraft/stable/reference/architectures/
- Snapcraft documentation: Select architectures - https://documentation.ubuntu.com/snapcraft/stable/how-to/crafting/select-architectures/
- Snap documentation: Install modes - https://snapcraft.io/docs/explanation/snap-development/install-modes/

## Issues Found
- The build environment example used `snapcraft --build-environment=lxd`, which is not a supported current Snapcraft CLI option. Removed that command; the post already shows the supported `--use-lxd` option.
- The lifecycle omitted the current `overlay` step and named the final step `snap`. Updated the lifecycle to `pull -> overlay -> build -> stage -> prime -> pack` and added a short overlay explanation.
- The cross-compilation note said different-architecture builds require LXD or Multipass and do not work with destructive mode unless already on the target architecture. Updated it to match current core22/core24 documentation: `--build-for` selects a target from the build plan, and destructive-mode builds must be narrowed to one target and depend on the project's cross-compilation support.
- The caching section included `snapcraft state`, which is not listed in current Snapcraft commands. Removed the unsupported command.
- The local install command used only `--devmode` for a locally built snap. Added `--dangerous`, which is needed for local unasserted snaps and is documented for local testing.

## Review Notes
Snapcraft is evolving quickly around core22/core24, platforms, and build-plan behavior. The post is now technically valid for the current Snapcraft 8 documentation, but future updates may want to prefer `CRAFT_*` environment variables in examples because those are the current primary names, with many `SNAPCRAFT_*` names retained for compatibility.
