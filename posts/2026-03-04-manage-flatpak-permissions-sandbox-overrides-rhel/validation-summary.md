# Validation Summary: How to Manage Flatpak Permissions and Sandbox Overrides on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- Flatpak
- Flatpak sandbox permissions and overrides
- Flatseal
- Linux filesystem paths and command-line usage

## Sources Consulted
- Flatpak Command Reference: https://docs.flatpak.org/en/latest/flatpak-command-reference.html
- Flatpak Sandbox Permissions: https://docs.flatpak.org/en/latest/sandbox-permissions.html
- Flathub Flatseal listing: https://flathub.org/apps/com.github.tchx84.Flatseal
- Red Hat RHEL desktop Flatpak documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_the_desktop_environment_in_rhel_8/using_the_desktop_environment_in_rhel_8

## Issues Found
- The revoke-device example used `--no-device=all`, but the official Flatpak option is `--nodevice=all`. Updated the command so it works with `flatpak override`.
- The `flatpak override --show` comment described the output as filesystem access grants, but the command shows configured override entries. Updated the comment to avoid implying it lists all manifest permissions.
- The device grant example described `--device=all` as a webcam-specific permission. Flatpak device values are broad categories such as `dri`, `input`, `usb`, `kvm`, `shm`, and `all`, so the comment now describes it as broad device access.

## Review Notes
The Flatseal install command assumes the `flathub` remote is already configured. The command syntax and application ID are correct, but RHEL users may need to enable or add the Flathub remote first depending on their system configuration.
