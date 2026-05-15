# Validation Summary: How to Set Up OpenVPN with Two-Factor Authentication on RHEL

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenVPN 2.x server and client configuration
- OpenVPN PAM authentication plugin
- Linux PAM
- Google Authenticator PAM module / TOTP
- SELinux
- systemd / journald

## Sources Consulted
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- OpenVPN auth-pam plugin source and behavior: https://build.openvpn.net/doxygen/auth-pam_8c_source.html
- Google Authenticator PAM module README: https://github.com/google/google-authenticator-libpam
- google-authenticator(1) manual page: https://man.archlinux.org/man/google-authenticator.1.en
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat blog, installing EPEL on RHEL 9: https://www.redhat.com/en/blog/install-epel-linux
- Red Hat EPEL overview and support caveats: https://access.redhat.com/solutions/3358
- RFC 6238, TOTP: https://www.rfc-editor.org/rfc/rfc6238

## Issues Found
- The original PAM stack used `pam_unix.so` before `pam_google_authenticator.so forward_pass`. That would send the combined password+OTP string to the Unix password check and fail. Changed the order so `pam_google_authenticator.so forward_pass` runs first and `pam_unix.so use_first_pass` verifies the forwarded password.
- The EPEL setup command used `dnf install epel-release`, which is not the recommended RHEL 9 bootstrap path. Updated it to enable CodeReady Builder and install the official EPEL release RPM URL.
- The OpenVPN log check used a fixed `/var/log/openvpn/openvpn.log` path, which is not reliable for systemd-managed RHEL services unless logging is explicitly configured. Changed it to `journalctl -u openvpn-server@server -f`.
- The SELinux section suggested `authlogin_yubikey`, which is unrelated to OpenVPN reading users' `.google_authenticator` files. Removed it and kept the relevant `openvpn_enable_homedirs` boolean.
- The static challenge example said `1` means the OTP is echoed and used an unmapped PAM plugin configuration. Changed the example to `static-challenge "Enter OTP: " 0` and added the auth-pam plugin argument mapping that passes the static challenge response as `OTP` to the PAM token prompt.

## Review Notes
The OpenVPN client example still uses `cipher AES-256-GCM`, which OpenVPN 2.6 accepts, but larger future updates could modernize it with `data-ciphers` alongside matching server configuration. The tutorial remains technically valid after the corrections above.
