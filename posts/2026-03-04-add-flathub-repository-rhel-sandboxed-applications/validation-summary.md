# Validation Summary: How to Add the Flathub Repository to RHEL for Sandboxed Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Flatpak
- Flathub
- GNOME Software
- DNF
- systemd timers

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing applications using Flatpak: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/administering_the_system_using_the_gnome_desktop_environment/assembly_installing-applications-using-flatpak_administering-the-system-using-the-gnome-desktop-environment
- Flatpak command reference: https://flatpak-docs.readthedocs.io/en/latest/flatpak-command-reference.html
- Flathub user installation documentation: https://docs.flathub.org/docs/for-users/installation
- Flathub Visual Studio Code app page: https://flathub.org/apps/com.visualstudio.code
- Flathub VLC app page: https://flathub.org/apps/org.videolan.VLC

## Issues Found
- The verification section used `flatpak remote-info --list flathub`, but `flatpak remote-info` requires both a remote and a ref. Replaced it with `flatpak remotes --columns=name,url | grep flathub` for remote URL verification.
- The repository URL comment was attached to `flatpak remote-ls`, which lists refs from the remote rather than showing the configured remote URL. Updated the comment and kept `remote-ls` as an application-listing check.
- The GNOME Software integration section installed `gnome-software-plugin-flatpak`, which is not the package documented by Red Hat for RHEL Flatpak workflows. Replaced it with installing `gnome-software` and `flatpak`.
- The Visual Studio Code example labeled `com.visualstudio.code` as OSS, but Flathub identifies that app ID as the proprietary Microsoft build. Updated the comment to "Visual Studio Code".
- The filter example denied all refs without allowing runtimes, which can block required runtime dependencies. Added `allow runtime/*` to permit runtime refs while keeping the application allowlist.
- The removal section used `flatpak uninstall --all` while saying it removed Flathub applications; Flatpak documents `--all` as removing all refs on the system. Replaced it with an example app uninstall and used `remote-delete --force` for removing the remote.
- The automatic-update command enabled `flatpak-update.timer`, but Flatpak does not provide that timer by default. Replaced it with a note to create a custom timer that runs `flatpak update -y --noninteractive`.

## Review Notes
Red Hat documents third-party Flatpak remotes as available but unsupported by Red Hat. The post remains technically valid as a Flathub setup guide, but production RHEL environments should consider that support boundary.
