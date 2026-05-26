# Validation Summary: How to Use Ansible to Set Up Two-Factor Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- OpenSSH server configuration
- Linux PAM
- Google Authenticator PAM module
- TOTP two-factor authentication

## Sources Consulted
- Ansible `lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- Google Authenticator PAM module documentation: https://github.com/google/google-authenticator-libpam
- Google Authenticator CLI manual source: https://raw.githubusercontent.com/google/google-authenticator-libpam/master/man/google-authenticator.1.md
- Google Authenticator PAM module manual source: https://raw.githubusercontent.com/google/google-authenticator-libpam/master/man/pam_google_authenticator.8.md
- Linux PAM configuration manual: https://man7.org/linux/man-pages/man5/pam.d.5.html
- `pam_succeed_if(8)` manual: https://man7.org/linux/man-pages/man8/pam_succeed_if.8.html

## Issues Found
- The SSH login flow diagram implied that the server/PAM module contacts the Google Authenticator app to request and verify the TOTP code. I changed the explanation and diagram to show that the user reads the code from the authenticator app and the PAM module verifies it locally against the shared secret.
- The SSH configuration example set `ChallengeResponseAuthentication yes`. OpenSSH documents `ChallengeResponseAuthentication` as a deprecated alias for `KbdInteractiveAuthentication`, and the post already enables `KbdInteractiveAuthentication`; I removed the deprecated alias task.
- The `google-authenticator` command included `--no-confirm`, which is not listed in the current official command-line manual. I removed that flag and kept `--force`, which is the documented non-interactive write option.
- The complete role snippet used `tfa_package_name` without defining it. I added a default expression that selects `libpam-google-authenticator` for Debian-family systems and `google-authenticator` otherwise, matching the earlier examples.
- The test playbook checked `sshd -T | grep challengeresponseauthentication`, which may fail on modern OpenSSH because the current setting name is `kbdinteractiveauthentication`. I updated the check to verify `kbdinteractiveauthentication yes`.

## Review Notes
- The examples are still intentionally generic. Production roles should account for distribution-specific SSH service names, `sshd_config.d` availability, and existing PAM stack differences before rollout.
