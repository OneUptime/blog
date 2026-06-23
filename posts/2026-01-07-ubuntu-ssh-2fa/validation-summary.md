# Validation Summary: How to Set Up Two-Factor Authentication (2FA) for SSH on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Ubuntu (20.04, 22.04, 24.04)
- OpenSSH server (`sshd`)
- PAM (Pluggable Authentication Modules)
- Google Authenticator PAM module (`libpam-google-authenticator`)
- TOTP (Time-based One-Time Password, RFC 6238)
- systemd / `systemd-timesyncd` / `timedatectl`
- Bash scripting

## Sources Consulted
- Google Authenticator libpam (official repo & README): https://github.com/google/google-authenticator-libpam
- `google-authenticator(1)` command-line options (`--time-based`, `--disallow-reuse`, `--force`, `--rate-limit`, `--rate-time`, `--window-size`, `--qr-mode`)
- OpenSSH `sshd_config(5)` — `KbdInteractiveAuthentication`, `ChallengeResponseAuthentication` (deprecated/renamed), `UsePAM`, `AuthenticationMethods`, `PubkeyAuthentication`, `PasswordAuthentication`
- `pam.d(5)` / `pam_succeed_if(8)` / `pam.conf` semantics (control syntax `[success=N default=ignore]`, `success=done`)
- RFC 6238 (TOTP): https://tools.ietf.org/html/rfc6238
- Ubuntu package documentation for `libpam-google-authenticator` and `systemd-timesyncd`
- SELinux `audit2allow(1)` / `semodule(8)` workflow

## Issues Found
1. **Dangerous PAM rule that silently disables 2FA (fixed).** The "Allowing Fallback Authentication" section instructed adding `auth [success=done default=ignore] pam_succeed_if.so service = sshd` to `/etc/pam.d/sshd`. Because that file is only ever evaluated for the `sshd` service, the `service = sshd` condition always matches, so `success=done` is always taken — causing the auth stack to succeed before reaching `pam_google_authenticator.so` and disabling 2FA for **all** SSH logins. The stated intent ("skip 2FA for local console logins") was also incorrect, since `/etc/pam.d/sshd` does not govern console logins (those use the `login` PAM service). Replaced with an accurate explanation that console logins already bypass SSH 2FA, plus correct recovery guidance (use a scratch code, or remove `~/.google_authenticator` from the console).

2. **Incorrect SELinux remediation (fixed).** The SELinux troubleshooting section suggested `sudo setsebool -P authlogin_yubikey 1` to unblock the module. That boolean controls the YubiKey PAM module and has no effect on `pam_google_authenticator.so`. Replaced with the standard, correct approach of generating an allow rule from the logged AVC denial via `audit2allow -M` and loading it with `semodule -i`.

## Review Notes
- **Service name caveat:** The post uses `systemctl restart sshd` / `systemctl status sshd` / `journalctl -u sshd`. On Ubuntu the canonical unit is `ssh.service`; `sshd` works via the alias shipped by `openssh-server`, so the commands are functional. On Ubuntu 24.04 (socket activation via `ssh.socket`), restarting the service is still sufficient because per-connection `sshd` instances re-read `sshd_config` on each new connection. Left as-is since it works in practice, but `ssh` is the more portable name.
- **PAM module path:** `ls /lib/x86_64-linux-gnu/security/pam_google_authenticator.so` is correct on amd64 Ubuntu; with the usr-merge, `/lib` is symlinked to `/usr/lib`, so `/usr/lib/x86_64-linux-gnu/security/...` also resolves. Path is architecture-specific (differs on arm64).
- The transcribed `google-authenticator` interactive prompts (time-based, disallow reuse, window size of 3→17 permitted codes, rate-limiting 3 attempts/30s) match the tool's actual output. The non-interactive flags in the automation script are all valid options.
- TOTP/RFC 6238 explanation, 30-second window, 6-digit codes, 5 emergency scratch codes (8 digits each), `AuthenticationMethods publickey,keyboard-interactive` (AND vs space-separated OR), and the `@include common-auth` comment-out step for key+TOTP are all technically correct.
- Minor (not changed): `head -n 10 ~/.google_authenticator` to view scratch codes also exposes the secret key on line 1; the file layout is secret → `"` option lines → scratch codes.
