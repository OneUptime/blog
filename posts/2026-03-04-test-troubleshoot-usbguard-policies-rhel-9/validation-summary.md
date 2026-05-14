# Validation Summary: How to Test and Troubleshoot USBGuard Policies on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- USBGuard
- systemd
- journalctl
- USBGuard policy rule language
- USBGuard daemon configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Protecting systems against intrusive USB devices": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/protecting-systems-against-intrusive-usb-devices_security-hardening
- USBGuard upstream rule language documentation: https://usbguard.github.io/documentation/rule-language
- USBGuard upstream daemon configuration documentation: https://usbguard.github.io/documentation/configuration
- USBGuard CLI man page reference: https://www.mankier.com/1/usbguard
- USBGuard D-Bus Devices interface documentation: https://usbguard.github.io/documentation/dbus/doc-org.usbguard.Devices.html

## Issues Found
- The post said to "test it without enforcement" but the commands installed the policy and restarted the daemon, which does enforce the policy. Changed the wording to describe staging the policy carefully and being ready to roll back.
- The policy installation examples used `cp`. Red Hat documents installing policy files with root ownership and `0600` permissions, so the examples now use `install -m 0600 -o root -g root`.
- The post described `usbguard list-devices -b` as listing all devices with full attributes. The USBGuard CLI documents `-b` as `--blocked`, so the all-device example now uses `usbguard list-devices`, and the allowed/blocked examples use `-a` and `-b`.
- The keyboard interface troubleshooting command used `list-devices -b`, which would only search blocked devices. It now searches the full device list.
- The lockout-prevention command used `sudo usbguard generate-policy > /etc/usbguard/rules.conf`; the shell redirection would not run under `sudo` for a normal user. It now uses `sudo sh -c 'usbguard generate-policy > /etc/usbguard/rules.conf'`.

## Review Notes
The article is technically relevant and accurate after the corrections. Red Hat recommends generating policies with `--no-hashes` because hash attributes might not be persistent; the post already warns that hash-based matching is brittle, but a future update could align the examples more closely with Red Hat's `--no-hashes` recommendation.
