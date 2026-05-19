# Validation Summary: How to Configure Fonts for International Characters on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu package management with apt
- Fontconfig command-line tools and XML configuration
- Google Noto fonts and script-specific font packages
- GNOME GSettings font preferences
- fontTools Python library and command-line tools
- Firefox, LibreOffice, and GNOME Terminal font settings

## Sources Consulted
- Fontconfig user documentation: https://www.freedesktop.org/software/fontconfig/fontconfig-user.html
- Ubuntu manpage for fc-match: https://manpages.ubuntu.com/manpages/noble/man1/fc-match.1.html
- Ubuntu manpage for gsettings: https://manpages.ubuntu.com/manpages/jammy/man1/gsettings.1.html
- Ubuntu manpage for glib-compile-schemas and GSettings overrides: https://manpages.ubuntu.com/manpages/focal/man1/glib-compile-schemas.1.html
- Ubuntu package details for fonts-noto: https://packages.ubuntu.com/noble/fonts-noto
- Ubuntu package details for fonts-noto-color-emoji: https://packages.ubuntu.com/jammy/fonts-noto-color-emoji
- Official Noto Fonts documentation: https://notofonts.github.io/noto-docs/website/use/
- fontTools TTFont documentation: https://fonttools.readthedocs.io/en/latest/ttLib/ttFont.html
- Local Ubuntu 24.04 fontconfig command help and apt package metadata for the referenced packages.

## Issues Found
- The post used `fc-config --list`, but fontconfig does not provide an `fc-config` command on Ubuntu. Changed it to `fc-conflist`, which is the fontconfig utility for showing loaded ruleset files.
- The post described `gsettings set` commands under "Setting System-Wide Default Fonts", but `gsettings` writes settings for the current user session. Changed the heading and text to describe current-user GNOME font settings.
- The fonttools section said `pyftsubset --help` lists Unicode blocks covered by a font file. It only verifies the tool is installed and prints help. Updated the comment accordingly.
- The GNOME Terminal section referred to "Symbols Noto Color Emoji", but the installed font family is `Noto Color Emoji`. Updated the text to describe installing Noto Color Emoji for emoji fallback.

## Review Notes
The package names and fontconfig query examples were checked against Ubuntu package metadata and local fontconfig help. Some UI menu labels in Firefox, LibreOffice, and GNOME Terminal can vary by application version and desktop environment, but the technical guidance is broadly correct.
