# Validation Summary: How to Build Differential Backup Scheduling

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Differential, full, and incremental backup strategy
- Bash scripting
- GNU tar and GNU find
- cron system crontab entries
- Python sqlite3, tarfile, hashlib, and pathlib
- Kubernetes CronJob
- Amazon S3 storage classes and Boto3 S3 uploads/copies
- Prometheus alerting rules and PromQL

## Sources Consulted
- GNU tar manual / local `tar --help`: https://www.gnu.org/software/tar/manual/
- GNU findutils manual / local `find --help`: https://www.gnu.org/software/findutils/manual/
- Linux crontab(5) manual: https://man7.org/linux/man-pages/man5/crontab.5.html
- Python tarfile documentation: https://docs.python.org/3/library/tarfile.html
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- Python sqlite3 documentation: https://docs.python.org/3/library/sqlite3.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Boto3 S3 upload documentation: https://docs.aws.amazon.com/boto3/latest/guide/s3-uploading-files.html
- Amazon S3 storage classes documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus PromQL operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Bash backup script ignored the `full` and `differential` arguments used by the cron examples. Updated `main()` to support `auto`, `full`, and `differential` modes.
- The Bash differential metadata did not identify which full archive a differential belonged to, and the restore script could apply a differential from the wrong backup generation. Added `base_full_backup` metadata and changed restore selection to match differentials to the selected full backup.
- The Bash differential script left `/tmp/changed_files.txt` behind when no files changed. Added cleanup before returning.
- The restore script used `rm -rf "$RESTORE_TARGET"/*`, which does not remove dotfiles. Replaced it with a `find ... -mindepth 1` cleanup.
- The Bash implementation was described as production-ready even though the file-level example does not replay deletions. Adjusted the wording and noted the need for a deletion manifest for exact point-in-time restores.
- Python examples used MD5 for checksums. Replaced MD5 with SHA-256 to avoid relying on a legacy hash algorithm for integrity checks.
- Python restore examples used `tarfile.extractall()` without an explicit extraction filter. Updated extraction calls to use `filter='data'`, matching current Python tarfile safety guidance.
- The storage-tiering Python snippet referenced `Path`, `datetime`, `timedelta`, `boto3`, and `logger` without imports or initialization. Added the missing imports and logger setup.
- The backup decision engine snippet returned SQLite timestamp strings but later treated them as `datetime` objects, and it referenced an undefined `_get_full_timestamp()` helper. Added timestamp parsing and the missing helper.
- The backup decision engine return annotation said `str` even though the method returns `(backup_type, reasons)`. Removed the inaccurate annotation.
- The backup verifier snippet referenced `hashlib`, `tarfile`, `tempfile`, `datetime`, `Path`, and `logger` without imports or initialization. Added the missing imports and logger setup.
- The Prometheus differential-size alert divided two vectors with non-matching labels, so it would not evaluate as intended. Changed it to compare scalar maxima for full and differential backup sizes.

## Review Notes
The Kubernetes CronJob and cron examples are structurally valid for the shown use case. The examples remain simplified: exact file-level point-in-time restore semantics require deletion manifests, filesystem quiescing or snapshots for live data consistency, and hardened handling for unusual path names.
