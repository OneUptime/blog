# Validation Summary: How to Configure Keyboard-Only Navigation on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Desktop
- GNOME Shell keyboard navigation
- GNOME Accessibility settings
- `gsettings`
- `dconf`
- GNOME Terminal
- Nautilus
- Firefox keyboard navigation
- Orca screen reader

## Sources Consulted
- Ubuntu Desktop documentation: Navigate the interface using the keyboard - https://documentation.ubuntu.com/desktop/en/latest/how-to/accessibility/navigate-the-interface-using-the-keyboard/
- Ubuntu Desktop documentation: Keyboard navigation shortcuts - https://documentation.ubuntu.com/desktop/en/latest/reference/keyboard-navigation-shortcuts/
- Ubuntu Desktop documentation: Click and move the mouse pointer using the keypad - https://documentation.ubuntu.com/desktop/en/latest/how-to/accessibility/click-and-move-the-mouse-pointer-using-the-keypad/
- Ubuntu Desktop documentation: Turn on sticky keys - https://documentation.ubuntu.com/desktop/en/latest/how-to/accessibility/turn-on-sticky-keys/
- Ubuntu Desktop documentation: Turn on slow keys - https://documentation.ubuntu.com/desktop/en/latest/how-to/accessibility/turn-on-slow-keys/
- Ubuntu Desktop documentation: Turn on bounce keys - https://documentation.ubuntu.com/desktop/en/latest/how-to/accessibility/turn-on-bounce-keys/
- Ubuntu Desktop documentation: Get started with the screen reader - https://documentation.ubuntu.com/desktop/en/latest/tutorial/get-started-with-the-screen-reader/
- Ubuntu Desktop Guide: Useful keyboard shortcuts - https://help.ubuntu.com/stable/ubuntu-help/shell-keyboard-shortcuts.html
- GNOME Terminal help: Keyboard shortcuts - https://help.gnome.org/gnome-terminal/adv-keyboard-shortcuts.html
- Mozilla Support: Firefox keyboard shortcuts - https://support.mozilla.org/en-US/kb/Keyboard%20shortcuts
- Local GNOME schemas and CLI help: `gsettings list-keys`, `gsettings describe`, `gsettings range`, and `dconf help`

## Issues Found
- The post used `gsettings set org.gnome.desktop.a11y.keyboard stickykeys-latch-to-lock true`, but `stickykeys-latch-to-lock` is not a key in the current `org.gnome.desktop.a11y.keyboard` schema. Removed that command from both the Sticky Keys section and the accessibility setup script.
- The window-management shortcut list described `Alt + Tab` as switching windows in the same application group. Ubuntu's current documentation identifies `Super + \`` for switching windows in the same application, so the shortcut was corrected.
- The list said `Super + Down` restores or minimizes a window. Ubuntu documents this shortcut as restoring a maximized window; minimization is `Super + H`, which was already listed. Updated the description.
- The list included `Super + D` as an out-of-box show-desktop shortcut, but current Ubuntu keyboard navigation documentation does not list it. Replaced it with the documented `Ctrl + Alt + Tab` top-bar focus shortcut.
- The GNOME Terminal shortcut block was marked as `bash` even though it contains shortcut reference text, not shell commands. Changed the code fence to `text`.
- The GNOME Terminal tab navigation line had the order reversed. Updated `Ctrl + Page Up/Down` to "Previous/next tab" to match GNOME Terminal documentation.

## Review Notes
Most `gsettings` keys and values in the post were verified against the installed GNOME schemas. Keyboard shortcuts can vary if a user or distribution changes defaults, but the revised post matches current Ubuntu Desktop documentation for the documented defaults.
