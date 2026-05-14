# Validation Summary: How to Use tar and gzip for System Backups on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- GNU tar
- gzip
- xz
- zstd
- Bash scripting
- cron
- SELinux file contexts
- POSIX ACLs
- Extended file attributes

## Sources Consulted
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html
- GNU tar `--one-file-system` documentation: https://www.gnu.org/s/tar/manual/html_node/one.html
- GNU gzip manual: https://www.gnu.org/s/gzip/manual/gzip.html
- Red Hat documentation, Archiving Files with tar and SELinux contexts: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/security-enhanced_linux/sect-security-enhanced_linux-maintaining_selinux_labels_-archiving_files_with_tar
- Red Hat documentation, Archiving File Systems With ACLs: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/storage_administration_guide/acls-archiving
- Local GNU tar 1.35 `--help` output
- Local GNU gzip 1.12 `--help` output

## Issues Found
- The backup examples used plain `tar -czvpf` commands for RHEL system backups. GNU tar stores basic ownership and mode data, but Red Hat documents that SELinux contexts are stored in extended attributes and are not retained by default. The examples now include `--acls --xattrs --selinux` so RHEL ACLs, extended attributes, and SELinux file contexts are preserved during archive creation and restore.
- The `p = preserve permissions` comment was misleading in create-mode examples because GNU tar documents `-p` as an extraction permission handling option. The comment was replaced with an RHEL metadata note tied to the added `--acls`, `--xattrs`, and `--selinux` options.
- The full-system backup example used `--one-file-system` without explaining that separate local filesystems, such as `/home`, `/var`, or `/boot`, will not be traversed from `/`. A concise comment was added to clarify that those mount points must be added explicitly or the option removed if they should be included.
- The split-archive creation example piped privileged tar output to an unprivileged `split` command writing under `/backup`. The `split` command now also runs with `sudo` so it can write to the backup directory on a typical RHEL system.
- The split-archive restore example extracted as an unprivileged tar command even though the other system restore examples use `sudo` and preserving ownership/metadata requires elevated privileges. The restore command now uses `sudo tar --acls --xattrs --selinux`.

## Review Notes
The commands and options are current for GNU tar and gzip. The compression comparison is broadly accurate, though actual speed and compression ratio depend on data type, compression level, and installed compressor versions. The rotation script is suitable as a simple example, but production backup scripts should also check the tar exit status before printing success, avoid suppressing useful errors, and consider checksums or off-host copies.
