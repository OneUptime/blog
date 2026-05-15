# Validation Summary: How to Write Custom USBGuard Rules for USB Device Authorization on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- USBGuard
- USBGuard rule language
- USBGuard CLI
- USB interface class matching

## Sources Consulted
- USBGuard rule language documentation: https://usbguard.github.io/documentation/rule-language
- USBGuard rules.conf man page: https://manpages.ubuntu.com/manpages/resolute/man5/usbguard-rules.conf.5.html
- USBGuard command-line interface man page: https://www.systutorials.com/docs/linux/man/1-usbguard/
- Red Hat Enterprise Linux 9 Security hardening, "Protecting systems against intrusive USB devices": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/protecting-systems-against-intrusive-usb-devices_security-hardening

## Issues Found
- The syntax overview described `with-interface` and `with-connect-type` style filters as conditions. USBGuard treats these as device attributes; rule conditions are introduced with `if`. Updated the wording to distinguish attributes from conditions.
- The device-name example used `allow name "Logitech*"` and described it as regex-like matching. The rule language documents exact string values and set operators for `name`, not wildcard or regex matching. Replaced it with a `name one-of { ... }` example using exact names.
- The BadUSB example used `with-interface one-of { 03:*:* 08:*:* }` while the comment said it blocks devices presenting both HID and mass storage interfaces. `one-of` matches either interface class; changed it to `all-of`.
- The server policy used `with-connect-type ""` for internal USB controllers. RHEL examples for root hubs match by Linux Foundation hub IDs and `with-interface 09:00:00` without an empty connect-type value. Removed the empty `with-connect-type` attribute.
- The kiosk policy used `reject with-interface all`, which is not valid USBGuard interface syntax. Changed it to a bare `reject` rule, which matches all remaining devices after the earlier allow rules.

## Review Notes
The remaining CLI examples (`append-rule`, `list-rules`, `remove-rule`, `list-devices -b`) match documented USBGuard commands. RHEL documentation recommends avoiding hash attributes in some custom policies because hashes might not be persistent; the post's hash example remains technically valid, but administrators should understand that portability and persistence can vary.
