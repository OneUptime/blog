# Validation Summary: How to Configure Git Config for Multiple Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Git configuration
- Git conditional includes
- OpenSSH client configuration
- SSH key generation and SSH agent usage
- GPG commit signing
- GitHub and GitLab SSH authentication workflows

## Sources Consulted
- Git `git-config` documentation: https://git-scm.com/docs/git-config
- Git 2.13 release announcement covering conditional includes: https://github.blog/open-source/git/git-2-13-has-been-released/
- OpenBSD `ssh_config(5)` manual for `Host`, `HostName`, `IdentityFile`, and `IdentitiesOnly`: https://man.openbsd.org/ssh_config
- GitHub Docs, checking for existing GPG keys: https://docs.github.com/en/authentication/managing-commit-signature-verification/checking-for-existing-gpg-keys
- GitHub Docs, signing commits and `commit.gpgsign`: https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits
- Pro Git, signing your work with `user.signingkey`: https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work
- Local command documentation checks: `git config --help`, `ssh-keygen` usage output, `ssh_config(5)` man page, and `ssh -G`

## Issues Found
- The `~/.gitconfig` example placed `[core] autocrlf = input` after the `includeIf` blocks. Git inserts included files immediately at the include directive, so the later parent-file `core.autocrlf` value would override the work config's `core.autocrlf = true`. Moved the shared `[core]` and `[init]` defaults before the `includeIf` blocks so account-specific included config can override shared defaults as described.

## Review Notes
- The guide's `gitdir:~/work/` conditional include examples are valid; Git treats a trailing slash pattern as recursively matching repositories under that directory.
- The SSH host alias examples are valid for OpenSSH. `IdentitiesOnly yes` is correctly used with `IdentityFile` to restrict which configured or agent identities are offered.
- The GPG examples use valid Git configuration keys, and `gpg --list-secret-keys --keyid-format=long` is a valid way to find signing key IDs.
