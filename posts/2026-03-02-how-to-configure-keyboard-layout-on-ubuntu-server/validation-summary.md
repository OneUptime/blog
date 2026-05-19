# Validation Summary: How to Configure Keyboard Layout on Ubuntu Server

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu Server
- systemd `localectl`
- Debian/Ubuntu `keyboard-configuration`
- `console-setup` and `setupcon`
- Linux console keymaps with `loadkeys` and `dumpkeys`
- XKB keyboard models, layouts, variants, and options
- Remote console access through IPMI/iDRAC/ILO

## Sources Consulted
- Ubuntu manpage: `localectl(1)` - https://manpages.ubuntu.com/manpages/jammy/man1/localectl.1.html
- Ubuntu manpage: `keyboard(5)` - https://manpages.ubuntu.com/manpages/jammy/man5/keyboard.5.html
- Ubuntu manpage: `setupcon(1)` - https://manpages.ubuntu.com/manpages/stonking/man1/setupcon.1.html
- Ubuntu manpage: `setxkbmap(1)` - https://manpages.ubuntu.com/manpages/noble/man1/setxkbmap.1.html
- systemd `vconsole.conf(5)` - https://www.freedesktop.org/software/systemd/man/vconsole.conf.html
- Local command help/man output for `localectl`, `setupcon`, `loadkeys`, and `dumpkeys`
- Local XKB rules files: `/usr/share/X11/xkb/rules/base.lst` and `/usr/share/X11/xkb/rules/evdev.lst`

## Issues Found
- The description said the post resolved layout issues over SSH. SSH sessions use the client-side keyboard input path, while the article's troubleshooting advice is about local and remote console access. Changed this to "remote consoles."
- Console keymap examples used `gb` for UK in `localectl set-keymap`. `gb` is the XKB layout name, while Linux console examples commonly use `uk`. Updated console keymap searches and `set-keymap` examples to use `uk`; retained `gb` where the post discusses XKB layouts.
- The post described `setupcon --force --save-only` as applying the console configuration. `--save-only` saves generated console-setup files and does not apply the layout immediately. Updated the comment and kept `setupcon` as the immediate apply step.
- The noninteractive `dpkg-reconfigure keyboard-configuration` example was described as setting the layout. Without preseeding, it applies existing debconf selections rather than choosing a new layout. Updated the comment to reflect that behavior.
- The console-only section treated `/etc/vconsole.conf` as the Ubuntu persistence path. Ubuntu's `keyboard(5)` documents `/etc/default/keyboard` as the shared Debian/Ubuntu configuration read by `setupcon`, so the section now persists console layout through `/etc/default/keyboard`.
- The remapping section implied `XKBOPTIONS` could be persisted through `/etc/vconsole.conf`. `vconsole.conf` supports `KEYMAP`, `KEYMAP_TOGGLE`, and font-related settings, not XKB option fields. Updated the persistence note to reference `/etc/default/keyboard` on Ubuntu.
- The cloud instance explanation tied the default US layout to host hardware. Cloud console behavior is better described as a virtual or serial console default, so the wording was corrected.
- The immediate-apply section parsed `XKBLAYOUT` from `/etc/default/keyboard` and passed it directly to `loadkeys`. That can fail for XKB names such as `gb` or multi-layout values such as `us,de`. Replaced it with `setupcon -k` for configured keyboard application and a simple explicit `loadkeys us` temporary example.

## Review Notes
The post is technically relevant and salvageable. `localectl` behavior can vary slightly by distribution packaging, so Ubuntu-specific guidance should continue to prefer `/etc/default/keyboard` and `setupcon` when discussing persistent console configuration.
