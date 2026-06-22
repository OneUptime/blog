# Validation Summary: How to Set Up Rclone for Cloud Storage Sync on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Rclone
- Amazon S3
- Google Cloud Storage
- Microsoft Azure Blob Storage
- Google Drive
- Dropbox
- FUSE mounts
- systemd services and timers
- cron
- Rclone RC Web GUI/API
- Rclone serve protocols: HTTP, WebDAV, SFTP, FTP, Restic

## Sources Consulted
- Rclone documentation: https://rclone.org/docs/
- Rclone config create command: https://rclone.org/commands/rclone_config_create/
- Rclone copy command: https://rclone.org/commands/rclone_copy/
- Rclone sync command: https://rclone.org/commands/rclone_sync/
- Rclone filtering documentation: https://rclone.org/filtering/
- Rclone global flags: https://rclone.org/flags/
- Rclone mount command: https://rclone.org/commands/rclone_mount/
- Rclone Google Cloud Storage backend: https://rclone.org/googlecloudstorage/
- Rclone Azure Blob backend: https://rclone.org/azureblob/
- Rclone crypt backend: https://rclone.org/crypt/
- Rclone Remote Control/API: https://rclone.org/rc/
- Rclone serve FTP command: https://rclone.org/commands/rclone_serve_ftp/
- Rclone serve SFTP command: https://rclone.org/commands/rclone_serve_sftp/

## Issues Found
- The Google Cloud Storage non-interactive example used `project_number=your-project-id`, but the rclone GCS backend expects a project number for that option. Changed the placeholder to a numeric project number.
- The cross-provider copy example implied rclone would handle cloud-to-cloud transfers server-side when possible. Clarified that rclone streams through the machine running rclone unless server-side copy is supported.
- The filter file used `- size:100M`, which is not valid rclone filter-file syntax. Moved size filtering to the supported `--max-size 100M` flag.
- The combined include/exclude example mixed `--include` and `--exclude` in a way that would not reliably exclude matching files in `drafts/`. Rewrote it with ordered `--filter` rules.
- The crypt verification example used a wildcard in a remote path with `rclone cat`, which is not valid filter/glob usage. Changed it to list encrypted filenames with `rclone lsf`.
- The mount examples installed FUSE 3 but used `fusermount` commands. Updated Ubuntu examples to `fusermount3` and noted that older FUSE 2 systems use `fusermount`.
- A mount log example wrote to `/var/log` as a normal user. Changed it to a user-writable path under `$HOME/.local/share/rclone`.
- The backup script created a file under `~/scripts` without creating the directory first and wrote logs to `/var/log` as a normal user. Added directory creation and changed logs to a user-writable path.
- Cron examples wrote log files to `/var/log`, which regular user cron jobs usually cannot write. Changed them to `/home/user/.local/share/rclone/...`.
- The systemd timer examples used `sudo cat > /etc/systemd/...`, but shell redirection would not run under sudo. Changed these examples to `sudo tee ... > /dev/null`.
- The performance section described `--checksum` as a faster S3 method. Changed the comment to describe its actual behavior: checksum comparison instead of modtime when supported.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. Some examples still use placeholders such as `/home/user`, bucket names, and credentials; readers must replace them with real values. The `rclone selfupdate` example is valid for self-managed rclone binaries, but package-manager or snap installations may be better updated through their original installation method.
