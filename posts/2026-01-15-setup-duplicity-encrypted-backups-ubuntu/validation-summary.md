# Validation Summary: How to Set Up Duplicity for Encrypted Backups on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Duplicity
- Duply
- GnuPG/GPG
- Amazon S3 and S3-compatible storage
- Google Cloud Storage interoperability
- Azure Blob Storage
- Dropbox
- Backblaze B2
- SFTP, rsync, WebDAV, FTP
- Bash, cron, and systemd timers
- OneUptime heartbeat monitoring

## Sources Consulted
- Duplicity stable man page: https://duplicity.us/stable/duplicity.1.html
- Local Duplicity CLI help for Ubuntu package `duplicity 2.1.4`: `duplicity --help`
- Ubuntu Duply man page: https://manpages.ubuntu.com/manpages/jammy/man1/duply.1.html
- Duply upstream script/config template: https://duply.net/tmp/duply.sh
- Backblaze B2 Duplicity integration guide: https://www.backblaze.com/docs/cloud-storage-configure-backblaze-b2-with-duplicity-on-linux
- Local GnuPG CLI help for `gpg 2.4.4`: `gpg --help`

## Issues Found
- The symmetric encryption example used `--no-encryption`, which disables encryption. Changed it to a normal passphrase-based Duplicity backup and added a separate unencrypted example.
- The Google Cloud Storage section used `gs://` and Application Default Credentials. Current Duplicity documents GCS through S3 interoperability with HMAC credentials and `--s3-endpoint-url https://storage.googleapis.com`; updated the dependency, URL, credentials, and backup command.
- The Azure example used older `AZURE_ACCOUNT_NAME` and `AZURE_ACCOUNT_KEY` variables. Updated it to `AZURE_CONNECTION_STRING`, which is what the current Azure backend expects.
- The Backblaze B2 example exported unsupported `B2_ACCOUNT_ID` and `B2_APPLICATION_KEY` variables. Updated the example to pass the key ID and application key in the `b2://` URL and added the `b2sdk` dependency.
- Replaced removed or stale Duplicity options including `--s3-use-new-style`, `--file-to-restore`, and `--max-upload-rate` with current alternatives.
- Replaced the asynchronous upload examples with S3 multipart concurrency examples using `--s3-multipart-max-procs`, which is supported by the current CLI.
- Corrected the Duply S3 profile sample so credentials are passed through environment variables rather than `TARGET_USER` and `TARGET_PASS`, and removed the unsupported `GPG_PW_FILE` example.
- Removed the invalid `duply documents restore` command without a target path.
- Fixed the production Bash script's `((errors++))` statements under `set -euo pipefail` so error counting does not terminate the script prematurely.

## Review Notes
- The post is now technically consistent with Duplicity 2.1.4 on Ubuntu Noble and current Duplicity stable documentation. Some examples still require users to install backend-specific Python libraries and provide real credentials, keys, buckets, and paths before running them.
