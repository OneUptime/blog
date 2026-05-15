# Validation Summary: How to Install and Configure USBGuard on RHEL to Block Rogue USB Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- USBGuard
- systemd
- Linux shell commands
- USBGuard daemon configuration
- USBGuard policy rules

## Sources Consulted
- Red Hat Enterprise Linux 9 Security Hardening, Chapter 14: Protecting systems against intrusive USB devices: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/protecting-systems-against-intrusive-usb-devices_security-hardening
- USBGuard rule language documentation: https://usbguard.github.io/documentation/rule-language
- USBGuard daemon configuration documentation: https://usbguard.github.io/documentation/configuration
- USBGuard command-line interface man page: https://manpages.ubuntu.com/manpages/questing/man1/usbguard.1.html

## Issues Found
- The policy generation command used `sudo usbguard generate-policy > /etc/usbguard/rules.conf`, which fails for a non-root shell because the redirection is performed before `sudo` runs. Changed it to run the redirection inside a root shell.
- The example USBGuard rule used a placeholder hash and an empty `with-connect-type` value in a `bash` code block. Replaced it with a syntactically valid example rule consistent with Red Hat's documented output format.
- The permanent device authorization example used a hand-written `append-rule` command. While `append-rule` is valid, Red Hat's documented workflow for permanently authorizing a recognized device is `usbguard allow-device ID -p`, so the post now uses that safer device-specific command.
- The comments for `PresentDevicePolicy` and `InsertedDevicePolicy` were inaccurate. Updated them to match the documented meanings: present devices are already connected when the daemon starts, and inserted devices are connected after the daemon starts.
- The monitoring section described `journalctl -u usbguard` as the USBGuard audit log. Red Hat documents `/var/log/usbguard/usbguard-audit.log` as the default audit log file unless Linux Audit is configured, so the command now tails that file.
- The troubleshooting section used `usbguard list-devices -b` as "detailed device info" and appended `list-devices` output directly to `rules.conf`. Changed this to list blocked devices with `--blocked`, permanently allow the selected device with `allow-device DEVICE_NUMBER -p`, and verify with `list-rules`.

## Review Notes
The post is technically relevant and broadly matches the RHEL 9 USBGuard workflow after the corrections. The default `ImplicitPolicyTarget` is already `block`, but explicitly setting it is still acceptable for clarity in a hardening guide.
