# Validation Summary: How to Install and Configure Flatpak on RHEL

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

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Installing applications using Flatpak": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/administering_the_system_using_the_gnome_desktop_environment/assembly_installing-applications-using-flatpak_administering-the-system-using-the-gnome-desktop-environment
- Flatpak documentation, "Using Flatpak": https://docs.flatpak.org/en/latest/using-flatpak.html
- Flatpak command reference: https://flatpak-docs.readthedocs.io/en/latest/flatpak-command-reference.html
- Flathub documentation, "Installation": https://docs.flathub.org/docs/for-users/installation

## Issues Found
- The post installed `gnome-software-plugin-flatpak`, which is not the package Red Hat documents for RHEL Flatpak setup. Changed it to the optional `gnome-software` package for graphical management.
- The post described Flathub as the primary source for Flatpak applications without noting that it is a third-party remote on RHEL. Clarified that Flathub is a primary third-party source and added Red Hat's support caveat for third-party remotes.
- The Flathub remote URL used `https://dl.flathub.org/repo/flathub.flatpakrepo`. Changed it to the URL shown in the official Flatpak and Flathub documentation: `https://flathub.org/repo/flathub.flatpakrepo`.
- The update section used `flatpak update --no-deploy` as a way to check for updates without installing. Official Flatpak docs describe `--no-deploy` as downloading updates without deploying them, so it is not a pure check. Replaced it with `flatpak remote-ls --updates`, which lists refs with available updates.

## Review Notes
The Flatpak CLI was not installed in the review environment, so local `flatpak --help` checks could not be run. Commands were verified against official Flatpak and Red Hat documentation instead.
