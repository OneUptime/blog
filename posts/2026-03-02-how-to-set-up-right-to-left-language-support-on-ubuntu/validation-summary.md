# Validation Summary: How to Set Up Right-to-Left Language Support on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (apt package management, locale, language packs)
- GNOME desktop (gsettings, Region & Language settings)
- xkb keyboard layouts (ara, il, ir)
- localectl
- Fonts (Noto, Amiri, Scheherazade, Culmus, Farsiweb, Nafees, SIL Ezra)
- fontconfig (fc-cache, fc-list, fc-match)
- fribidi (bidirectional text utility)
- IBus and m17n input method framework
- Pango / GTK text rendering (pango-view)
- LibreOffice CTL (Complex Text Layout)
- Firefox locale packages
- gedit, GNOME Terminal

## Sources Consulted
- [Ubuntu package: fonts-hosny-amiri](https://packages.ubuntu.com/search?keywords=fonts-hosny-amiri) — confirms Amiri is an Arabic Naskh font, not Hebrew
- [Ubuntu package: fonts-hosny-thabit](https://packages.ubuntu.com/search?keywords=fonts-hosny-thabit) — confirms Thabit is a fixed-width Arabic font, not Urdu
- [Ubuntu package search: ibus-table-arabic](https://packages.ubuntu.com/search?keywords=ibus-table-arabic) — confirms the package does NOT exist in any Ubuntu suite
- [Ubuntu package: m17n-lib-mimx](https://packages.ubuntu.com/jammy/m17n-lib-mimx) — confirms package exists
- [Ubuntu package: fonts-sil-ezra](https://packages.ubuntu.com/search?keywords=fonts-sil-ezra) — confirms it is a Hebrew Unicode font
- [Ubuntu package: fonts-sil-scheherazade](https://packages.ubuntu.com/fonts-sil-scheherazade) — confirms availability in jammy and noble
- [Ubuntu package: fonts-arabeyes, fonts-culmus, fonts-farsiweb, fonts-nafees, fonts-noto, fonts-noto-extra](https://packages.ubuntu.com/) — confirmed available
- [Debian Manpages: libfribidi-bin / fribidi(1)](https://manpages.debian.org/testing/libfribidi-bin/fribidi.1.en.html) — confirms `libfribidi-bin` provides the `fribidi` CLI tool with `--charset` option
- [LibreOffice Help: Languages Using Complex Text Layout](https://help.libreoffice.org/Common/Languages_Using_Complex_Text_Layout) — confirms `Ctrl+Right Shift` / `Ctrl+Left Shift` are the correct shortcuts for paragraph direction (not `Ctrl+Shift+D` / `Ctrl+Shift+E`)
- [Ubuntu Community Wiki: IBus](https://help.ubuntu.com/community/ibus) — confirms ibus-m17n is the standard package for Arabic and many RTL scripts

## Issues Found

1. **Wrong font placement: `fonts-hosny-amiri` listed under Hebrew.** Amiri is a classical Arabic Naskh typeface designed by Khaled Hosny — it has no Hebrew coverage. Fix: removed from the Hebrew install line and replaced with `fonts-sil-ezra`, which is genuinely a Hebrew Unicode font available in Ubuntu repos.

2. **Wrong font placement: `fonts-hosny-thabit` listed under Urdu.** Thabit is a fixed-width OpenType Arabic font, not an Urdu font. Fix: removed it from the Urdu install line, leaving `fonts-nafees` (the canonical Urdu Naskh package).

3. **Non-existent package: `ibus-table-arabic`.** Direct search of `packages.ubuntu.com` across all suites (jammy, noble, questing, resolute, stonking) returns no results. Fix: removed the install line and rewrote the section to recommend `ibus-m17n m17n-lib-mimx` as the primary path for Arabic IBus input — both packages exist and m17n provides multiple Arabic input methods.

4. **Wrong LibreOffice shortcuts.** The post claimed `Ctrl+Shift+D` (RTL) and `Ctrl+Shift+E` (LTR) toggle paragraph direction. LibreOffice's documented default shortcuts when CTL is enabled are `Ctrl+Right Shift` (RTL) and `Ctrl+Left Shift` (LTR). Fix: corrected the shortcuts in the LibreOffice section.

## Review Notes
- `m17n-lib-mimx` provides binary modules primarily used by `ja-anthy.mim` and `ispell.mim`, so it is not strictly required for Arabic input via `ibus-m17n`. It is harmless to install alongside, and the package does exist, so it was retained.
- `fonts-sil-scheherazade` was migrated upstream to `fonts-sil-scheherazade-new` in some distributions; the original `fonts-sil-scheherazade` is still available in Ubuntu 22.04 / 24.04 / 26.04, so the existing reference works.
- The Firefox `firefox-locale-*` packages only apply when Firefox is installed from the Ubuntu apt archive (Debian package). If a user installed Firefox via the official Snap (the default on modern Ubuntu), language packs are managed inside the Snap and apt installation will not affect the Snap-managed Firefox. This is a minor caveat that was not added to keep the post focused.
- The `pango-view` command line example uses `Scheherazade 20` as the font family; users who install only the newer SIL package will need to use `Scheherazade New` as the family name instead.
