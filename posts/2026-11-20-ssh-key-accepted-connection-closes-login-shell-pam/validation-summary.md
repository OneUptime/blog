# Validation Summary: SSH Key Accepted, Then Connection Closes: Shell, PAM, and ForceCommand

## Status

validated

## Post Type

Technical troubleshooting guide with shell commands and configuration guidance.

## Technologies Covered

- SSH and OpenSSH 9.6p1 on Ubuntu 24.04 LTS
- OpenSSH authentication, connection sharing, Match rules, authorized-key restrictions, and forced commands
- Linux-PAM account and session processing
- Bash login and noninteractive startup files
- Linux Name Service Switch, filesystem permissions, home directories, and chroot environments
- systemd journal inspection

## Sources Consulted

- [Ubuntu Noble ssh_config(5)](https://manpages.ubuntu.com/manpages/noble/man5/ssh_config.5.html): ControlMaster, ControlPath, and IdentitiesOnly.
- [Ubuntu Noble sshd_config(5)](https://manpages.ubuntu.com/manpages/noble/man5/sshd_config.5.html): AuthenticationMethods, Match, UseDNS, UsePAM, ForceCommand, and ChrootDirectory; the package metadata confirms the OpenSSH 9.6p1 family.
- [Ubuntu Noble sshd(8)](https://manpages.ubuntu.com/manpages/noble/man8/sshd.8.html): test modes, connection specifications, authorized_keys options, certificate restrictions, and SSH startup hooks.
- [OpenSSH V_9_6_P1 sshconnect2.c](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/sshconnect2.c): public-key offer acceptance, signing, partial success, and completed authentication messages.
- [OpenSSH V_9_6_P1 auth.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_6_P1/auth.c): shell eligibility checks and reverse/forward DNS validation.
- [OpenSSH V_9_6_P1 auth2.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_6_P1/auth2.c): PAM account processing before the authentication-success response.
- [OpenSSH V_9_6_P1 servconf.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_6_P1/servconf.c): connection-specification parsing and Match evaluation.
- [OpenSSH V_9_6_P1 session.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_6_P1/session.c): forced commands, internal SFTP, shell execution, home-directory handling, and chroot setup.
- [Ubuntu Noble journalctl(1)](https://manpages.ubuntu.com/manpages/noble/man1/journalctl.1.html): unit and time filters, pager control, and short-iso-precise output.
- [Ubuntu Noble getent(1)](https://manpages.ubuntu.com/manpages/noble/man1/getent.1.html): NSS-backed passwd lookups.
- [Ubuntu Noble namei(1)](https://manpages.ubuntu.com/manpages/noble/man1/namei.1.html): pathname traversal, symlinks, and long-format ownership and permissions.
- [Ubuntu Noble nologin(8)](https://manpages.ubuntu.com/manpages/noble/man8/nologin.8.html): refusal message and unsuccessful exit.
- [Ubuntu Noble bash(1)](https://manpages.ubuntu.com/manpages/noble/man1/bash.1.html): login startup-file order, noninteractive SSH startup behavior, exit, exec, and errexit.
- [Ubuntu Noble pam.conf(5)](https://manpages.ubuntu.com/manpages/noble/man5/pam.conf.5.html): includes, module types, and control flags.
- [Ubuntu Noble pam_unix(8)](https://manpages.ubuntu.com/manpages/noble/man8/pam_unix.8.html): account and password expiration checks.
- [Ubuntu Noble pam_nologin(8)](https://manpages.ubuntu.com/manpages/noble/man8/pam_nologin.8.html): maintenance login restrictions.
- [Linux-PAM v1.5.3 pam_limits documentation](https://github.com/linux-pam/linux-pam/blob/v1.5.3/modules/pam_limits/pam_limits.8.xml): session processing and failure return values.

## Issues Found

No technical issues found.

## Review Notes

- The post is technically relevant and correctly distinguishes public-key offer acceptance, partial authentication, completed authentication, and later session failures. No README changes were necessary.
- The diagnostic commands and configuration names are valid for the stated target. All five Bash code blocks passed a local `bash -n` syntax check. Server commands were checked against documentation and source, not executed against an Ubuntu server or the illustrative destination.
- The effective-policy example correctly supplies both the remote address and host used for Match evaluation, and accounts for UseDNS behavior and service configuration overrides. The configuration dump does not evaluate per-key restrictions or run PAM.
- Forced-command precedence, shell-based command execution, internal SFTP, and the distinction between terminal denial and authentication denial are accurately described.
- The shell eligibility discussion correctly distinguishes a regular executable file with at least one execute bit from the target user's ability to execute it. The chroot exception is appropriately acknowledged.
- Bash startup-file guidance is accurate. Ubuntu also documents `/etc/bash.bashrc` for noninteractive SSH invocation; the post's advice to follow sourced files and inspect startup behavior remains valid.
- PAM account denial and session failure are correctly treated separately. Required-module control semantics and the cited modules' roles are accurate; session-open/session-close log entries alone do not establish causation.
- The home-directory warning is appropriately qualified: a failed directory change can be nonfatal. Chroot ownership requirements and the need for shell runtime dependencies inside the jail are correct.
- The version scope is explicit: Ubuntu 24.04 LTS uses the OpenSSH 9.6p1 package family with distribution updates. This is not a claim that 9.6p1 is the newest upstream release, and no deprecated option requiring replacement was identified.
- Referenced technical URLs resolve to the intended documentation or versioned source. Several Ubuntu pages initially timed out in the browsing tool; direct HTTP retrieval subsequently returned HTTP 200 and the expected content. The author-profile URL is attribution rather than technical evidence.
