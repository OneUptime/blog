# Validation Summary: How to Set Up Redis Automated Backup to Google Cloud Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-cli, redis-check-rdb)
- Google Cloud Storage (gsutil, GCS lifecycle policies)
- Google Cloud IAM (service accounts, roles)
- gcloud CLI
- systemd (service and timer units)
- Bash scripting

## Sources Consulted
- Google Cloud Storage gsutil documentation: https://cloud.google.com/storage/docs/gsutil
- GCS lifecycle configuration JSON format: https://cloud.google.com/storage/docs/lifecycle
- Google Cloud IAM roles for Storage: https://cloud.google.com/storage/docs/access-control/iam-roles
- Redis CLI --rdb option documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/cli/
- redis-check-rdb utility documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- systemd.timer manual: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- systemd OnCalendar syntax: https://www.freedesktop.org/software/systemd/man/systemd.time.html
- GNU coreutils stat format: https://www.gnu.org/software/coreutils/manual/html_node/stat-invocation.html

## Issues Found
1. **Step 2: Incorrect IAM role name in description text.** The text said "assign the Storage Object Creator role" but the command used `roles/storage.objectAdmin` (Storage Object Admin). These are different IAM roles — `roles/storage.objectCreator` only grants permission to create objects, while `roles/storage.objectAdmin` grants full read/write/delete/list access. The command is correct for this use case (the backup and restore scripts need upload, list, and download access), so the descriptive text was updated to say "Storage Object Admin" to match the actual role being granted.

## Review Notes
- The `stat -c%s` syntax is GNU/Linux-specific and will not work on macOS. This is fine since the post targets GCP VMs (Linux), but worth noting for readers who might test locally on macOS.
- The `date -Iseconds` and `date -d` flags are GNU date extensions, also Linux-specific. Same caveat applies.
- The monitoring script's use of `gsutil ls -l | sort | tail -2 | head -1` relies on the `TOTAL:` summary line sorting after file entries. This works because uppercase 'T' sorts after the leading whitespace of file entries in ASCII, but it is a somewhat fragile pattern. A more robust approach would be to use `gsutil ls` (without `-l`) for sorting by filename, since filenames contain sortable timestamps.
- The post uses `gsutil` commands throughout. Google has been recommending `gcloud storage` commands as the modern replacement, but `gsutil` remains fully supported and widely used.
