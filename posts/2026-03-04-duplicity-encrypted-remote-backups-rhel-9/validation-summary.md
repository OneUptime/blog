# Validation Summary: How to Set Up Duplicity for Encrypted Remote Backups on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Duplicity
- GnuPG/GPG
- SFTP
- Amazon S3 and S3-compatible object storage
- Bash scripting
- cron

## Sources Consulted
- Duplicity stable man page: https://duplicity.gitlab.io/stable/duplicity.1.html
- Duplicity boto3 S3 backend documentation: https://duplicity.readthedocs.io/en/latest/duplicity.backends.s3_boto3_backend.html
- Fedora EPEL 9 duplicity package page: https://packages.fedoraproject.org/pkgs/duplicity/duplicity/epel-9.html
- Red Hat blog: How to install EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux
- Red Hat Enterprise Linux 9 package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/package_manifest/
- Local Duplicity CLI help output from duplicity 2.1.4

## Issues Found
- The installation command assumed `duplicity` is available directly from standard RHEL 9 repositories. The package is provided by EPEL 9, so the post now enables CodeReady Builder and installs the EPEL release package before installing Duplicity.
- The S3 examples used host-style URLs such as `s3://s3.amazonaws.com/my-backup-bucket/home` and `s3://minio.example.com/backup-bucket/home`. Current Duplicity boto3 examples use `s3:///bucket/prefix`, with `--s3-endpoint-url` for non-Amazon S3-compatible services, so both examples were corrected.
- The restore example used `--file-to-restore`, which is not present in current Duplicity help and is documented as `--path-to-restore`. The option was updated.
- The introduction stated that Duplicity produces encrypted, signed backup volumes by default. Signing requires a configured signing key, so the wording now says backups are encrypted and can be signed when a signing key is configured.

## Review Notes
The remaining Duplicity commands, including `full`, implicit incremental backups, `--full-if-older-than`, `remove-older-than`, `remove-all-but-n-full`, `cleanup`, `list-current-files`, `collection-status`, `verify`, `--encrypt-key`, `--sign-key`, `PASSPHRASE`, and cron scheduling are consistent with current Duplicity CLI documentation and local help output. In production, storing passphrases directly in a shell script should be replaced with a more secure secret management approach, but the example is technically valid.
