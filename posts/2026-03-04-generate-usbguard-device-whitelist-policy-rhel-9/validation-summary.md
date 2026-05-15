# Validation Summary: How to Generate a USBGuard Device Whitelist Policy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- USBGuard
- USBGuard rule language
- USBGuard command-line interface
- Linux shell commands and file permissions

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening guide, "Creating a custom policy for USB devices": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/creating-a-custom-policy-for-usb-devices_protecting-systems-against-intrusive-usb-devices
- USBGuard Rule Language documentation: https://usbguard.github.io/documentation/rule-language
- USBGuard Configuration documentation: https://usbguard.github.io/documentation/configuration
- USBGuard command-line interface man page: https://manpages.ubuntu.com/manpages/questing/man1/usbguard.1.html

## Issues Found
- The command `sudo usbguard generate-policy > /etc/usbguard/rules.conf` used privileged execution only for `usbguard`, not for the shell redirection. I changed the workflow to generate a local `rules.conf` and install it with `sudo install -m 0600 -o root -g root`, matching Red Hat's documented approach.
- The generated-policy examples did not account for RHEL 9 guidance to avoid persistent hash attributes because they might not be stable. I added `--no-hashes` to the RHEL policy-generation examples and added a short note explaining the Red Hat recommendation.
- The server and workstation examples could create or overwrite `/etc/usbguard/rules.conf` without ensuring the expected restrictive file mode. I changed the empty-file creation to `install -m 0600` and added `chmod 0600` after `tee` writes.
- The hash-based section incorrectly used `usbguard list-devices -b` as if `-b` meant "show hashes"; the USBGuard CLI documents `-b` as `--blocked`. I changed the command to `usbguard list-devices` and clarified that hashes are used only when present.
- The hash-based section overstated hash rules as "maximum security" and claimed they ensure only the exact physical device is allowed. I revised the wording to "maximum specificity" and noted the RHEL persistence caveat.
- The export example used `sudo cat /etc/usbguard/rules.conf > /tmp/usbguard-policy-export.conf`, which is an unnecessary and potentially misleading privileged-redirection pattern. I changed it to `sudo cp /etc/usbguard/rules.conf /tmp/usbguard-policy-export.conf`.
- The blocked-device examples used `usbguard list-devices | grep block`; I changed them to the documented `usbguard list-devices --blocked` option.

## Review Notes
The post is technically relevant and the corrected commands align with the USBGuard CLI documentation and RHEL 9 policy-management guidance. The hash-based rules remain valid USBGuard syntax, but on RHEL they should be tested before being used in persistent policies because Red Hat warns that hash attributes might not be persistent.
