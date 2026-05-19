# Validation Summary: How to Choose Between Snap, Flatpak, and AppImage on Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu package management
- Snap and snapd
- Flatpak and Flathub
- AppImage
- APT
- FUSE

## Sources Consulted
- Snap documentation: Manage updates - https://snapcraft.io/docs/how-to-guides/manage-snaps/manage-updates/
- Snap documentation: Snap confinement - https://snapcraft.io/docs/explanation/security/snap-confinement/
- Snap documentation: Install the daemon - https://snapcraft.io/docs/tutorials/install-the-daemon/
- Local Snap CLI and Snap Store metadata via `snap info` and `snap find`
- Flatpak documentation: Using Flatpak - https://docs.flatpak.org/en/latest/using-flatpak.html
- Flatpak command reference - https://docs.flatpak.org/en/latest/flatpak-command-reference.html
- Flathub documentation: Verified apps - https://docs.flathub.org/docs/for-users/verification
- AppImage documentation: FUSE troubleshooting - https://docs.appimage.org/user-guide/troubleshooting/fuse.html
- Kdenlive official downloads page - https://kdenlive.org/download/
- Local Ubuntu APT package metadata via `apt-cache policy`

## Issues Found
- The quick reference table described Flatpak updates as automatic with a manual trigger. Flatpak's documented CLI update workflow is manual via `flatpak update`, so this was changed to "Manual by default."
- The quick reference table said AppImage has no sandbox security. AppImages are not sandboxed by default, but external sandboxing is possible, so this was clarified to "None by default."
- The post said snapd is pre-installed on all Ubuntu systems. Official Snap documentation describes it as pre-installed on Ubuntu 18.04 and above/current Ubuntu releases, so the claim was narrowed.
- The post listed Heroku CLI as an available classic snap, but `snap info heroku` currently returns no matching snap. The example was removed from the list.
- The snap install example used `postgresql14`, but the current Snap Store does not provide that snap name. It was changed to the current `postgresql` snap.
- The AppImage section said AppImages have no runtime dependencies beyond bundled system libraries. Official AppImage troubleshooting documents the FUSE requirement for common Type 2 AppImages, so the wording was corrected.
- The Flatpak verification command implied that `flatpak remote-info ... | grep Verified` reliably reports Flathub verification. Flathub documents verification primarily as an app-page badge and verified subset mechanism, so the example was corrected to direct readers to the Flathub app page.
- The AppImage setup command used `sudo apt install fuse libfuse2`. On Ubuntu 24.04 and newer, AppImage documentation notes that `libfuse2` was renamed to `libfuse2t64`; local APT metadata confirmed `libfuse2` has no candidate on Ubuntu 24.04. The command was changed to show the correct release-specific packages.
- The post made an absolute "no performance penalty" claim. It was narrowed to say there is no system-wide performance penalty just from having multiple formats installed, with disk space as the main cost.

## Review Notes
The post is technically sound after the corrections. Some package availability and publisher verification details can change over time, so future reviews should re-check the Snap Store and Flathub metadata for named examples.
