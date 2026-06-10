# Validation Summary: How to Build Vault SSH OTP

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- HashiCorp Vault (SSH secrets engine, OTP mode)
- vault-ssh-helper
- PAM (Pluggable Authentication Modules)
- OpenSSH server (sshd)
- Bash scripting
- pamtester, sshpass

## Sources Consulted
- Vault SSH OTP docs: https://developer.hashicorp.com/vault/docs/secrets/ssh/one-time-ssh-passwords
- Vault SSH API: https://developer.hashicorp.com/vault/api-docs/secret/ssh
- Vault `ssh` command: https://developer.hashicorp.com/vault/docs/commands/ssh
- vault-ssh-helper releases: https://releases.hashicorp.com/vault-ssh-helper/
- OpenSSH 8.7 release notes: https://www.openssh.com/txt/release-8.7
- pamtester / PAM testing references

## Issues Found

1. **Outdated vault-ssh-helper version.** Post referenced `0.2.1`, but the latest release at https://releases.hashicorp.com/vault-ssh-helper/ is `0.2.4`. Updated both the download URL and unzip filename.

2. **Misleading `ttl` parameter on OTP role.** The post included `ttl=30s` on the OTP role and listed it in the role configuration options table as "OTP validity period." OTP credentials are one-time-use and validated immediately; the role-level `ttl` does not meaningfully control OTP validity in the way the post implied. Removed `ttl=30s` from the "Advanced Role Configuration" example and removed the `ttl` row from the configuration options table. Added `exclude_cidr_list` (a real OTP role parameter) in its place.

3. **Non-existent `pam_parse` command.** The Troubleshooting section recommended `sudo pam_parse /etc/pam.d/sshd` to check PAM syntax. `pam_parse` is not a standard Linux command. Replaced with `pamtester sshd ubuntu authenticate`, which is the conventional way to exercise a PAM service stack.

4. **"Short TTLs" security recommendation.** The recommendation to "Set short OTP TTLs (30 seconds or less) to minimize exposure" reinforced the same misconception. Reworded to explain that OTPs are inherently one-time use and invalidated immediately after verification.

5. **Security checklist item.** Removed the corresponding "OTP TTL set to 30 seconds or less" checklist item that referenced the non-applicable `ttl` parameter.

6. **Misleading section comment.** "Update the SSH daemon configuration to use PAM and allow password authentication" contradicted the snippet, which sets `PasswordAuthentication no`. The OTP is delivered through `KbdInteractiveAuthentication` via PAM, not password auth. Corrected the description.

## Review Notes

- `ChallengeResponseAuthentication` is a deprecated alias for `KbdInteractiveAuthentication` as of OpenSSH 8.7. The post includes both directives, which works for backward compatibility but `ChallengeResponseAuthentication` could be dropped on modern OpenSSH-only deployments. Left as-is since it remains functional and aids compatibility with older sshd.
- `tls_skip_verify = false` shown in the vault-ssh-helper config is the default. Leaving the explicit declaration is fine and reinforces the secure default.
- The PAM configuration block uses `auth requisite pam_exec.so ...` which matches the vault-ssh-helper documentation and is correct.
- The example OTP response output (`lease_duration 768h`) reflects Vault's default system lease (~32 days). Official docs sometimes show smaller values like `600`, but `768h` is plausible when the mount/system defaults are unchanged, so it was left as-is.
