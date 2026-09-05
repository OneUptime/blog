# Validation Summary: How to Replace a Failed MinIO Drive and Trigger Automatic Erasure-Code Healing

## Status
validated

## Post Type
Technical operations guide with Linux shell commands.

## Technologies Covered
- MinIO AIStor and the `mc` administrative client
- Reed-Solomon erasure coding, quorum, and automatic drive healing
- Linux block devices, XFS, persistent mounts, and systemd logging
- Prometheus v3 metrics
- S3 object access, bit rot inspection, and SHA-256 integrity checks

## Sources Consulted
- [MinIO drive failure recovery](https://docs.min.io/aistor/operations/failure-and-recovery/recover-after-drive-failure/): replacement requirements, persistent mounting, and restart-free recovery.
- [MinIO healing](https://docs.min.io/aistor/operations/core-concepts/healing/): reconstruction prerequisites and bit rot inspection.
- [MinIO erasure coding](https://docs.min.io/aistor/operations/core-concepts/erasure-coding/): data/parity counts and read/write quorum.
- [MinIO metrics overview](https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/) and [v3 metric reference](https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v3/): erasure-set gauges and healing counters.
- [mc admin info](https://docs.min.io/aistor/reference/cli/admin/mc-admin-info/): `--uncached`, `--offline`, `--watch`, and `--interval`.
- [mc admin prometheus metrics](https://docs.min.io/aistor/reference/cli/admin/mc-admin-prometheus/mc-admin-prometheus-metrics/): v3 selection, cluster filtering, and omitted-type behavior.
- [mc admin heal](https://docs.min.io/aistor/reference/cli/admin/mc-admin-heal/): target syntax and active-scan status.
- [mc admin object info](https://docs.min.io/aistor/reference/cli/admin/mc-admin-object-info/): Admin API shard inspection and `--bitrot`.
- [mc alias set](https://docs.min.io/aistor/reference/cli/mc-alias/mc-alias-set/), [mc stat](https://docs.min.io/aistor/reference/cli/mc-stat/), and [mc cat](https://docs.min.io/aistor/reference/cli/mc-cat/): alias and object command syntax.
- [MinIO Ubuntu installation](https://docs.min.io/aistor/installation/linux/install/deploy-aistor-on-ubuntu-server/): service identity, volume subdirectories, and required filesystem permissions.
- [mkfs.xfs](https://man7.org/linux/man-pages/man8/mkfs.xfs.8.html): formatting and label flags.
- [findmnt](https://man7.org/linux/man-pages/man8/findmnt.8.html), [lsblk](https://man7.org/linux/man-pages/man8/lsblk.8.html), and [wipefs](https://man7.org/linux/man-pages/man8/wipefs.8.html): mount/device inspection and non-writing signature checks.
- [mount](https://man7.org/linux/man-pages/man8/mount.8.html), [umount](https://man7.org/linux/man-pages/man8/umount.8.html), and [fstab](https://man7.org/linux/man-pages/man5/fstab.5.html): persistent device identification and mount behavior.
- [journalctl](https://man7.org/linux/man-pages/man1/journalctl.1.html): unit, time-range, and follow options.
- [smartmontools upstream smartctl manual](https://raw.githubusercontent.com/smartmontools/smartmontools/master/smartmontools/smartctl.8.in): extended device information and platform-specific device handling.
- [GNU df manual](https://man7.org/linux/man-pages/man1/df.1.html) and [GNU sha256sum manual](https://man7.org/linux/man-pages/man1/sha256sum.1.html): filesystem display flags and hashing standard input.
- [Amazon S3 Object API](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Object.html): multipart/encryption exceptions to ETag-as-MD5 assumptions.

## Issues Found
- **Unstated platform and product scope:** The generic introduction presented systemd/fstab operations and current AIStor client behavior without an explicit scope. Added a brief Linux/AIStor and compatible-client prerequisite, including hot-swap-capable hardware.
- **Quorum threshold wording:** “Above” quorum implied that the minimum sufficient drive count was insufficient. Changed this to “meet” quorum, consistent with the formulas already present.
- **Missing replacement filesystem permissions:** A newly formatted filesystem does not retain the old service-account ownership. Added the requirement to grant the actual service user read, write, and traversal access after mount verification; otherwise healing can fail with access errors.
- **Mount point versus volume path:** The original wording required the mount itself to equal the configured volume path. Configurations may use a subdirectory of the mount. Clarified that the original mount point must be restored and the configured volume path must reside on it. Also clarified that the replacement contains no MinIO data before healing starts, since healing itself populates it.
- **Blocking monitoring commands:** `journalctl -f` follows indefinitely, preventing the following watch command from running in the same shell until interrupted. Specified separate terminals.
- **S3 versus Admin API:** The sample included `mc admin object info` while describing all checks as S3 access. Corrected the description to distinguish S3 object reads from Admin API shard inspection.

## Review Notes
- The main recovery procedure, replacement drive characteristics, same-pool capacity limitation, and avoidance of manually copying backend data agree with the cited recovery guidance.
- The quorum formulas are correct, including the `K + 1` write threshold at half-set parity. Parity is object-specific; changing a configured parity value does not rewrite old objects.
- Both v3 metrics filters are documented. Erasure-set metrics have `pool_id` and `set_id` labels; healing object counters use `type` and `server`, so correlate them with affected-node logs rather than expecting set labels on every metric. Some counters describe the current healing run and may reset.
- The supplied documentation links resolve to the intended official resources. The author profile is an attribution link and was not used as technical evidence.
- Current AIStor documentation is the review baseline, not a guarantee that every flag exists in historical community MinIO or older `mc` releases. Kubernetes replacement requires its platform-specific procedure.
- Validated all Bash blocks with `bash -n`. No live MinIO deployment or spare Linux disk was supplied, so formatting, unmounting, drive replacement, healing, and object reads were not executed. This is documentation and syntax validation, not an integration or hardware recovery test.
