# Validation Summary: How to Enable and Configure OpenSSH Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- OpenSSH server and client
- SSH public key authentication
- sshd_config and ssh_config
- UFW firewall rules
- PAM-based TOTP two-factor authentication
- systemd service management

## Sources Consulted
- Ubuntu Server documentation: OpenSSH server: https://ubuntu.com/server/docs/how-to/security/openssh-server/
- Ubuntu Server documentation: Two factor authentication with TOTP/HOTP: https://documentation.ubuntu.com/server/how-to/security/two-factor-authentication-with-totp-or-hotp
- Ubuntu Server documentation: Firewalls and UFW: https://ubuntu.com/server/docs/how-to/security/firewalls/
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config
- Local Ubuntu man pages for sshd_config(5), ssh_config(5), ssh-copy-id(1), ssh-keygen(1)

## Issues Found
- The hardening and two-factor authentication examples used `ChallengeResponseAuthentication`, which the OpenSSH manual documents as a deprecated alias. Updated both examples to use `KbdInteractiveAuthentication`.
- The sample hardening configuration included a commented `Protocol 2` directive. Modern OpenSSH no longer supports protocol 1, and the `Protocol` option is not a current sshd_config keyword, so the example was changed to a note that protocol 2 is always used.
- The `AcceptEnv LANG LC_*` comment said it disabled locale forwarding, but `AcceptEnv` permits matching client-sent environment variables. Updated the comment to match the directive.
- The `ClientAliveInterval` / `ClientAliveCountMax` comment described a user idle timeout. OpenSSH uses these settings to disconnect unresponsive clients after keepalive probes, not to enforce shell inactivity. Updated the wording accordingly.

## Review Notes
- The main commands and configuration examples are otherwise consistent with Ubuntu and OpenSSH documentation.
- Ubuntu's current OpenSSH documentation also recommends using `/etc/ssh/sshd_config.d/*.conf` snippets for custom settings, because files included there can override the main configuration. The post's direct-edit approach is still technically valid.
