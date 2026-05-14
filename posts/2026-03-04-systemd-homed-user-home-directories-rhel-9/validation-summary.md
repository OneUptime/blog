# Validation Summary: How to Manage User Home Directories with systemd-homed on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd
- systemd-homed
- homectl
- LUKS2 home directory storage
- PAM integration with pam_systemd_home

## Sources Consulted
- systemd 252 homectl manual: https://www.freedesktop.org/software/systemd/man/252/homectl.html
- systemd 252 pam_systemd_home manual: https://www.freedesktop.org/software/systemd/man/252/pam_systemd_home.html
- systemd-homed service manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-homed.service.html
- systemd Home Directories design documentation: https://systemd.io/HOME_DIRECTORY/
- Red Hat Enterprise Linux 9 systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 authselect documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel

## Issues Found
- The post described systemd-homed accounts as "truly portable" without noting that destination systems must trust the signed user record. Updated the wording to say accounts are easier to move between machines that trust the record's signing key.
- The diagram implied the LUKS image portability metadata was only the `~/.identity` file. Updated it to mention both the LUKS2 header user record and `~/.identity`, matching systemd-homed's LUKS storage design.
- The Step 1 comment said "Install and start systemd-homed", but the command only starts and enables the service. Updated the comment to "Start systemd-homed".
- The post said automatic activation and deactivation happen on login/logout without naming the required PAM integration. Updated the comment to specify that this behavior requires `pam_systemd_home`.
- The portability command `homectl activate --identity=/media/usb/devuser.home` was incorrect because `--identity` expects a JSON user record, not a `.home` LUKS image. Replaced it with copying the `.home` image into `/home`, installing the source host's public signing key under `/var/lib/systemd/home/`, starting systemd-homed, and activating the user by name.

## Review Notes
The RHEL documentation covers systemd service management and authselect generally, while the detailed systemd-homed and homectl behavior is documented upstream in the systemd manuals. For future improvement, a RHEL-specific prerequisite note about PAM/NSS/authselect setup would make the tutorial more complete.
