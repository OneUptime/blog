# Validation Summary: How to Configure Network-Based LUKS Unlock with Tang on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Tang
- Clevis
- LUKS
- cryptsetup
- systemd socket activation
- initramfs-tools
- Shamir Secret Sharing

## Sources Consulted
- Clevis upstream README: https://github.com/latchset/clevis
- Tang upstream README and protocol notes: https://github.com/latchset/tang
- Ubuntu `clevis-luks-unlock(1)` manpage: https://manpages.ubuntu.com/manpages/stonking/man1/clevis-luks-unlock.1.html
- Ubuntu `clevis-luks-unlockers(7)` manpage: https://manpages.ubuntu.com/manpages/stonking/man7/clevis-luks-unlockers.7.html
- Ubuntu `tang(8)` manpage: https://manpages.ubuntu.com/manpages/stonking/man8/tang.8.html
- Ubuntu package metadata for `tang`, `tang-common`, `clevis`, `clevis-luks`, and `clevis-initramfs` via `apt-cache`
- Ubuntu Noble `tang` package contents, including `tangd.socket`, `tangd@.service`, `tang-show-keys(1)`, and `tangd-rotate-keys(1)`

## Issues Found
- The post incorrectly stated that Tang listens on port 7500 by default. Ubuntu's packaged `tangd.socket` listens on port 80 by default, while the standalone Tang command defaults to port 9090. I changed the text to explain the Ubuntu default and added the systemd socket override needed to use port 7500 with the rest of the examples.
- The post used `/var/db/tang/` as the Tang key directory for Ubuntu. Ubuntu's packaged systemd service runs `tangd` with `/var/lib/tang`, so I changed the Ubuntu-specific key paths to `/var/lib/tang/`.
- The post used `sudo tangd-keygen /var/db/tang/` for key rotation. In Ubuntu's package, the supported rotation helper is `tangd-rotate-keys` under `/usr/libexec`, and it accepts `-d <KEYDIR>`. I changed the command to `sudo /usr/libexec/tangd-rotate-keys -d /var/lib/tang`.
- The post showed `sudo tang-show-keys` after switching all client examples to port 7500. `tang-show-keys` defaults to localhost port 80, so I changed it to `sudo tang-show-keys 7500`.
- The post described `clevis luks bind -s 2` as choosing a LUKS key slot. The Clevis manpage describes `-s` as the LUKSMeta metadata slot, so I changed the heading and wording to "metadata slot."
- The test command comment said `clevis luks unlock -d /dev/sda3 -n test_unlock` tests without unlocking. That command unlocks the device using the given mapper name; only `-t SLT` tests a passphrase for a slot without unlocking. I changed the comment to say it unlocks to a temporary mapper name.

## Review Notes
The high-availability SSS example matches the Clevis upstream pattern for multiple Tang pins. For root-volume network unlocks, deployments may also need network availability in early boot depending on the initramfs stack and network configuration, but the existing post's `clevis-initramfs` and `update-initramfs` guidance is directionally correct for Ubuntu initramfs-tools.
