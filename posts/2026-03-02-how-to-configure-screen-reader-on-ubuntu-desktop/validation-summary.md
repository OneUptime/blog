# Validation Summary: How to Configure Screen Reader on Ubuntu Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Desktop
- GNOME accessibility settings
- Orca screen reader
- Speech Dispatcher
- eSpeak NG
- Firefox accessibility with Orca
- GNOME Terminal accessibility
- BRLTTY and BrlAPI
- GNOME screen magnifier
- AT-SPI / pyatspi

## Sources Consulted
- Ubuntu Desktop documentation: Read the screen aloud - https://documentation.ubuntu.com/desktop/en/latest/how-to/accessibility/orca/read-screen-aloud/
- Ubuntu Desktop documentation: Get started with the screen reader - https://documentation.ubuntu.com/desktop/en/latest/tutorial/get-started-with-the-screen-reader/
- GNOME Orca help: Welcome / introduction - https://gnome.pages.gitlab.gnome.org/orca/help/
- GNOME Orca help: Keyboard layout - https://gnome.pages.gitlab.gnome.org/orca/help/howto_keyboard_layout.html
- GNOME Orca help: Controlling and learning to use Orca - https://gnome.pages.gitlab.gnome.org/orca/help/commands_controlling_orca.html
- GNOME Orca help: Reading commands - https://gnome.pages.gitlab.gnome.org/orca/help/commands_reading.html
- GNOME Orca help: Flat review commands - https://gnome.pages.gitlab.gnome.org/orca/help/commands_flat_review.html
- GNOME Orca help: Structural navigation commands - https://gnome.pages.gitlab.gnome.org/orca/help/commands_structural_navigation.html
- GNOME Orca help: Speech settings commands - https://gnome.pages.gitlab.gnome.org/orca/help/commands_speech_settings.html
- GNOME Orca help: Voice preferences - https://gnome.pages.gitlab.gnome.org/orca/help/preferences_voice.html
- GNOME Orca help: Speech preferences - https://gnome.pages.gitlab.gnome.org/orca/help/preferences_speech.html
- BRLTTY reference manual - https://brltty.app/doc/Manual-BRLTTY/English/BRLTTY.html
- Local Ubuntu 24.04 command/schema checks: `orca --help`, `brltty --help`, `gsettings list-keys org.gnome.desktop.a11y.applications`, and `gsettings list-keys org.gnome.desktop.a11y.magnifier`

## Issues Found
- The introduction said Orca provides magnification. Current GNOME Orca documentation describes Orca as providing speech and refreshable braille access; GNOME's screen magnifier is separate. Updated the introduction and magnification section accordingly.
- Several Orca keyboard shortcuts were incorrect or not current defaults, including Learn Mode, Find, flat review, Say All, reading current line/word/character, Firefox browse/focus mode, and speech toggling. Replaced them with current GNOME Orca desktop/laptop layout commands.
- The Firefox section listed `Orca + F` for find and `Orca + t` for Browse/Focus mode. Updated it to `Orca + A` for Browse/Focus mode and `Orca + Z` for structural navigation, with `H`, `K`, and `E` retained for supported document navigation.
- The GNOME Terminal section recommended enabling "Use transparent background" to help Orca track the cursor. This is not an accessibility setting and is not supported by GNOME Terminal or Orca documentation. Removed that instruction and corrected the terminal review shortcuts.
- The BRLTTY section used `brltty --list-drivers`, which is not a valid option in the installed BRLTTY CLI. Changed it to `brltty --help`, which lists the supported braille driver codes.
- The verbosity section used a nonexistent `org.gnome.orca verbosity-level` gsettings schema/key and listed unsupported numeric levels. Replaced it with `Orca + V` and the Orca Preferences speech verbosity setting.
- The magnifier section used nonexistent `org.gnome.desktop.a11y.magnifier active`. Removed that command and kept the valid `screen-magnifier-enabled` and `mag-factor` settings.
- The speech settings section described eSpeak NG as the fixed default synthesizer and stated "100 = normal" for rate. Updated this to reflect Orca's Speech Dispatcher-backed synthesizer choices and generic rate adjustment.

## Review Notes
- The post is technically relevant and remains a useful Ubuntu Desktop accessibility guide after correction.
- Commands that depend on a running graphical session, active AT-SPI bus, audio stack, or specific hardware were checked against official documentation and installed CLI/schema metadata rather than executed end-to-end.
