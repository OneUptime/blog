# Validation Summary: How to Copy SSH Keys to Remote Servers with ssh-copy-id on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- OpenSSH
- ssh-copy-id
- ssh client configuration options
- sshd authorized_keys and sshd_config
- Bash shell scripting

## Sources Consulted
- Ubuntu ssh-copy-id(1) man page: https://manpages.ubuntu.com/manpages/stonking/man1/ssh-copy-id.1.html
- Local Ubuntu OpenSSH client help output: `ssh-copy-id -h`
- Local Ubuntu OpenSSH man page: `man ssh-copy-id`
- OpenBSD/OpenSSH sshd_config(5) man page: https://man.openbsd.org/sshd_config
- Local Ubuntu OpenSSH man page: `man sshd_config`
- Local Ubuntu OpenSSH man page: `man sshd`

## Issues Found
- The post said `ssh-copy-id` connects using password authentication. The official man page describes password authentication as the presumed/common case but also supports use with multiple identities, so this was changed to "typically connects" for accuracy.
- The basic usage comment said the command copies the default public key. The official `ssh-copy-id` behavior uses agent keys when available, otherwise the most recent matching `~/.ssh/id*.pub` file, so the wording was changed to "available public key or keys."
- The `-i` explanation said the filename should end in `.pub`. The official man page states that if the filename does not end in `.pub`, `ssh-copy-id` appends `.pub`, so the explanation was corrected.
- The non-standard port section incorrectly said `-p` must be passed through using `-o Port=` and showed an invalid quoted alternate syntax. Current Ubuntu `ssh-copy-id` supports `-p port` directly, and `-o Port=2222` is the correct alternate form, so the example was fixed.
- The SSH daemon hardening snippet used `ChallengeResponseAuthentication no`. OpenSSH documents this as a deprecated alias for `KbdInteractiveAuthentication`, so the snippet was updated to use `KbdInteractiveAuthentication no`.

## Review Notes
The remaining commands and examples are technically valid for current Ubuntu/OpenSSH usage. The `UsePAM no` line is correctly marked optional with a warning to consult distro documentation; on Ubuntu, changing it can affect PAM account and session handling.
