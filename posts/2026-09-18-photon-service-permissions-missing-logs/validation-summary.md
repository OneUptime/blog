# Validation Summary: How to Diagnose File Permission and Missing Log Problems in Photon OS Services

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and a systemd service drop-in.

## Technologies Covered
- Photon OS service administration
- systemd service identity, execution settings, managed state directories, and filesystem sandboxing
- systemd-journald and journalctl
- Linux filesystem ownership, permissions, umask, ACLs, mounts, and symbolic links
- GNU coreutils, util-linux namei, and log rotation

## Sources Consulted
- [Photon OS 5: Investigating Unexpected Behavior](https://vmware.github.io/photon/docs-v5/troubleshooting-guide/kernel-problems-and-boot-and-login-errors/investigating-unexpected-behavior/) — service status and journal inspection.
- [Photon OS 5: Default Permissions and umask](https://vmware.github.io/photon/docs-v5/administration-guide/security-policy/default-permissions-and-umask/) — restrictive default permissions.
- [systemd.exec, upstream v252 manual](https://github.com/systemd/systemd/blob/v252/man/systemd.exec.xml), including its [complete raw source](https://raw.githubusercontent.com/systemd/systemd/v252/man/systemd.exec.xml) — execution identity, working directory, umask, state directories, logging destinations, and sandboxing.
- [journald.conf, upstream v252 manual](https://github.com/systemd/systemd/blob/v252/man/journald.conf.xml) — storage modes, persistence, and retention.
- [systemctl upstream manual, rendered by man7.org](https://man7.org/linux/man-pages/man1/systemctl.1.html) — status, cat, show, property selection, edit, and manager reload behavior.
- [journalctl upstream manual, rendered by man7.org](https://man7.org/linux/man-pages/man1/journalctl.1.html) — unit and boot filters, boot listing, disk usage, and pager control.
- GNU coreutils manuals rendered by man7.org: [ls](https://man7.org/linux/man-pages/man1/ls.1.html), [id](https://man7.org/linux/man-pages/man1/id.1.html), [chown](https://man7.org/linux/man-pages/man1/chown.1.html), and [chmod](https://man7.org/linux/man-pages/man1/chmod.1.html) — command syntax and permission changes.
- [util-linux namei manual](https://man7.org/linux/man-pages/man1/namei.1.html) — long-format pathname inspection.
- [getfacl manual](https://man7.org/linux/man-pages/man1/getfacl.1.html) — ACL inspection.
- [Linux path_resolution manual](https://man7.org/linux/man-pages/man7/path_resolution.7.html) — directory traversal, symlinks, and mount-point resolution.
- [logrotate upstream manual](https://man7.org/linux/man-pages/man8/logrotate.8.html) — rotated-file ownership and application file reopening.

## Issues Found
No technical issues found.

## Review Notes
- Checked every command block and the service configuration snippet against the documentation. The command options and configuration directives remain supported; no deprecated syntax was identified.
- The ownership example correctly gives root control of configuration while allowing the assumed myapp group to read the file and traverse the directory. The example assumes that the account, group, and configuration paths already exist and that administrative commands run with appropriate privileges.
- StateDirectory=myapp creates the system service state directory under /var/lib with ownership derived from the configured service identity. StateDirectoryMode=0750 and UMask=0027 are valid octal settings. The post correctly distinguishes directory creation from application path configuration.
- The stdout/stderr journal settings and the distinction between filesystem permissions and service sandbox restrictions are accurate.
- The journal commands correctly select current and previous boots. Previous-boot access depends on retained logs and reader permissions. Storage=auto can provide persistence when /var/log/journal exists; explicitly setting Storage=persistent is not the only way to obtain persistent logging. The post does not incorrectly require that explicit setting.
- All four technical reference links in the post resolved to the intended Photon OS or upstream systemd resources. The systemd links deliberately target v252; they are versioned references, not claims that v252 is the newest release. Older Photon installations should be checked against their installed systemd manuals.
- systemctl cat displays files on disk, which may differ from the manager's loaded configuration before a reload. The post also uses systemctl show and directs readers to reload after changes. systemctl edit normally reloads the manager automatically after a successful edit, so an additional explicit reload is harmless.
- This was a source-based technical review on the local workspace. No live Photon OS service, reboot, permission mutation, or log rotation was executed. README.md was left unchanged.
