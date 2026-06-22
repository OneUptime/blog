# Validation Summary: How to Generate and Use SSH Keys on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH (`ssh`, `ssh-keygen`, `ssh-copy-id`, `ssh-add`, `ssh-agent`)
- Ed25519 and RSA key algorithms
- SSH client config (`~/.ssh/config`)
- SSH server config (`/etc/ssh/sshd_config`)
- `keychain` utility
- Ubuntu (systemd service management)
- GitHub / GitLab SSH key authentication

## Sources Consulted
- OpenSSH `ssh-keygen(1)` manual — https://man.openbsd.org/ssh-keygen
- OpenSSH `ssh_config(5)` manual — https://man.openbsd.org/ssh_config (AddKeysToAgent, IdentitiesOnly, ProxyJump, IdentityFile)
- OpenSSH `sshd_config(5)` manual — https://man.openbsd.org/sshd_config (PasswordAuthentication, PubkeyAuthentication, ChallengeResponseAuthentication, UsePAM)
- OpenSSH `ssh-copy-id(1)`, `ssh-add(1)`, `ssh-agent(1)` manuals
- GitHub docs — Adding a new SSH key to your account (https://github.com/settings/keys)
- GitLab docs — SSH keys user settings (https://gitlab.com/-/user_settings/ssh_keys)
- Ubuntu openssh-server packaging (ssh.service with sshd.service alias)

## Issues Found
- **Outdated GitLab settings URL**: The post referenced `https://gitlab.com/-/profile/keys` for adding an SSH key. GitLab migrated profile settings to `/-/user_settings/` (GitLab 16.x); the old path now only redirects. Updated to the current canonical URL `https://gitlab.com/-/user_settings/ssh_keys`.

## Review Notes
- All `ssh-keygen` invocations are correct: `-t ed25519`, `-t rsa -b 4096`, `-f` (filename), `-C` (comment), `-N ""` (empty/specific passphrase), `-p` (change passphrase), and `-lf` (show fingerprint) all match the official manual.
- `ssh-copy-id`, `ssh-add` (`-t`, `-l`, `-D`), and `ssh-agent -s` usage is accurate.
- SSH client config keywords (`AddKeysToAgent`, `IdentitiesOnly`, `IdentityFile`, `ProxyJump`, `HostName`, `User`, `Port`) are all valid.
- `sudo systemctl restart sshd` works on Ubuntu because the `openssh-server` package ships `ssh.service` with an `sshd.service` alias. On Ubuntu 24.04+, SSH defaults to socket activation (`ssh.socket`); restarting the service still applies `sshd_config` changes for new connections, so the instruction remains valid. Could optionally mention `systemctl restart ssh` as the canonical Ubuntu service name.
- `ChallengeResponseAuthentication` is still accepted by current OpenSSH as a deprecated alias for `KbdInteractiveAuthentication` (renamed in OpenSSH 8.7). The directive functions correctly; a future edit could prefer the newer name.
- File permission guidance (700 on `~/.ssh`, 600 on private keys/config, 644 on `.pub`) is correct.
- The `~/.ssh/.gitignore` tip is harmless but only meaningful if `~/.ssh` is ever under version control; not an error.
