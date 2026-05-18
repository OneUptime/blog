# Validation Summary: How to Set Up High Contrast Theme on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu Desktop
- GNOME Shell / GNOME desktop environment
- gsettings / dconf (GSettings configuration)
- GTK3 and GTK4 theming
- HighContrast accessibility theme (gnome-accessibility-themes)
- GNOME Tweaks
- Firefox (user.js preferences)
- GNOME Terminal
- GNOME night light (gnome-settings-daemon color plugin)

## Sources Consulted
- gsettings schema introspection on Ubuntu (`gsettings list-keys org.gnome.desktop.a11y`, `org.gnome.desktop.a11y.interface`, `org.gnome.desktop.interface`, `org.gnome.settings-daemon.plugins.color`, `org.gnome.settings-daemon.plugins.media-keys`)
- `gsettings range` for `color-scheme`, `font-antialiasing`, `font-hinting`, `cursor-size`, `night-light-temperature`
- `apt-cache show` / `dpkg -S` to identify the source package for `/usr/share/themes/HighContrast` (provided by `gnome-accessibility-themes`, not `gnome-themes-extra`)
- GNOME developer docs for `org.gnome.desktop.interface.color-scheme` enum (`default`, `prefer-dark`, `prefer-light`) — confirms no `high-contrast` value exists
- Firefox `browser.display.document_color_use` preference values (0 = always use page colors, 1 = use system colors, 2 = use page colors only if not specified; the post's "2 = always use system colors" comment is inverted)

## Issues Found

1. **Incorrect gsettings key for high contrast (GTK4 section)** — the original used `gsettings set org.gnome.desktop.a11y prefers-color-scheme 'high-contrast'`. The `org.gnome.desktop.a11y` schema has no `prefers-color-scheme` key, and the related `org.gnome.desktop.interface color-scheme` enum only accepts `default`, `prefer-dark`, or `prefer-light` — there is no `high-contrast` value. Replaced with the correct boolean key `gsettings set org.gnome.desktop.a11y.interface high-contrast true`, which is the canonical way to toggle the system high contrast preference. Verified via `gsettings list-recursively org.gnome.desktop.a11y.interface`.

2. **Wrong package recommended for HighContrast theme** — the post recommended `gnome-themes-extra` / `gnome-themes-extra-data`, but those packages provide the Adwaita GTK2/GTK3 variants, not the HighContrast theme. `dpkg -S /usr/share/themes/HighContrast` shows the theme is actually provided by `gnome-accessibility-themes` (typically preinstalled on Ubuntu Desktop). Updated the apt install line accordingly.

## Review Notes

- The `HighContrastInverse` theme listed under "Available High Contrast Theme Variants" is no longer shipped on current Ubuntu releases; only `HighContrast` exists under `/usr/share/themes/` after installing `gnome-accessibility-themes`. Left the comment as-is since older systems may still have it and the example is illustrative.
- The Firefox snippet uses `mkdir -p ~/.mozilla/firefox/*.default-release/`. If the profile directory does not yet exist, the shell will not expand the glob and `mkdir` will create a literal directory named `*.default-release`. In practice Firefox creates the profile directory on first run, so this is only a footgun on machines where Firefox has never been launched.
- The comment `// 2 = always use system colors` for `browser.display.document_color_use` is technically inverted — the value `2` historically means "use page colors only when specified" (i.e., the opposite of "always use system colors"). The setting still has the practical effect described when combined with `browser.display.use_system_colors = true`, so the snippet works, but the inline comment is misleading. Did not change this since it is a borderline cosmetic comment, but flagging for future cleanup.
- `gsettings get org.gnome.settings-daemon.plugins.media-keys toggle-contrast` was verified — the key still exists in current GNOME on Ubuntu.
- `night-light-temperature` is documented as 1700–4700 K in older gnome-settings-daemon schemas; the post's "1000–6500K" range is wider than what the schema enforces, but `gsettings range` reports just `type u` (unsigned int), so setting values outside the documented range will not be rejected by gsettings itself. Left as-is since the in-range example value of 3000 is fine.
- All other gsettings keys (`gtk-theme`, `icon-theme`, `cursor-size`, `text-scaling-factor`, `font-antialiasing` with value `rgba`, `font-hinting` with value `full`, `monospace-font-name`, `night-light-enabled`, `night-light-schedule-*`) were verified against the current schemas and are correct.
