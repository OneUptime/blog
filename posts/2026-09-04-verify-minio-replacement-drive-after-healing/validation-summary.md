# Validation Summary: How to Verify MinIO Recognizes a Replacement Drive After Healing

## Status

validated

## Post Type

Technical operations guide / recovery verification runbook.

## Technologies Covered

- MinIO AIStor and the `mc` administrative client
- Erasure coding, drive replacement, automatic healing, and bit rot checks
- Prometheus metrics API v3
- Linux block devices, XFS, persistent filesystem mounts, and systemd logs
- S3 object reads, versioning, ETags, and SHA-256 integrity verification
- Bash pipelines

## Sources Consulted

- MinIO AIStor drive recovery: https://docs.min.io/aistor/operations/failure-and-recovery/recover-after-drive-failure/
- MinIO AIStor healing: https://docs.min.io/aistor/operations/core-concepts/healing/
- MinIO AIStor erasure coding: https://docs.min.io/aistor/operations/core-concepts/erasure-coding/
- MinIO AIStor node maintenance: https://docs.min.io/aistor/operations/node-maintenance/
- MinIO AIStor metrics v3 reference: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v3/
- `mc admin info`: https://docs.min.io/aistor/reference/cli/admin/mc-admin-info/
- `mc admin prometheus metrics`: https://docs.min.io/aistor/reference/cli/admin/mc-admin-prometheus/mc-admin-prometheus-metrics/
- `mc admin heal`: https://docs.min.io/aistor/reference/cli/admin/mc-admin-heal/
- `mc admin logs`: https://docs.min.io/aistor/reference/cli/admin/mc-admin-logs/
- `mc admin object info`: https://docs.min.io/aistor/reference/cli/admin/mc-admin-object-info/
- `mc stat`: https://docs.min.io/aistor/reference/cli/mc-stat/
- `mc cat`: https://docs.min.io/aistor/reference/cli/mc-cat/
- util-linux `findmnt` manual: https://man7.org/linux/man-pages/man8/findmnt.8.html
- util-linux `lsblk` manual: https://man7.org/linux/man-pages/man8/lsblk.8.html
- systemd `journalctl` manual: https://man7.org/linux/man-pages/man1/journalctl.1.html
- GNU coreutils `df` manual: https://man7.org/linux/man-pages/man1/df.1.html
- GNU coreutils `sha256sum` manual: https://man7.org/linux/man-pages/man1/sha256sum.1.html
- Local Bash built-in documentation: `bash -c 'help set'` (`pipefail` semantics).
- Amazon S3 object and ETag reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_Object.html

## Issues Found

1. **Missing health metrics in the filter.** The erasure-set regex selected overall set health and tolerances but omitted `read_health` and `write_health`, although the completion checklist required both. Added these alternatives so the command prints the required evidence.
2. **Incorrect healing metric type and scope.** Time since last activity was described as a counter; it is a gauge. The scan, healed-object, and object-error counters describe the current self-healing run, while lock-error counts have a server-uptime scope. Corrected the explanation and added reset/run-boundary handling so snapshots cannot be treated as an uninterrupted lifetime history.
3. **Unspecified product and platform scope.** The references describe current AIStor, while the title and commands could be read as applying to any MinIO release. Clarified the current AIStor server/client and Linux/systemd assumptions without asserting a minimum release that the documentation does not establish for every feature.
4. **Hardware verification overstatement.** Mount and inventory commands do not measure drive performance. Clarified the need for specifications or prior benchmarks and included the documented same-drive-type requirement.
5. **Historical versus recent logs.** The text grouped both logging commands under a historical time-window check. Clarified that the journal supplies retained time-window records, while `mc admin logs` supplies recent/live output with a default recent-entry limit of ten.
6. **Checksum pipeline could hide read failure.** Bash normally returns the final command's status, so a successful hash process can mask a failed object download. Added `set -o pipefail` and required pipeline success before accepting the digest.
7. **Administrative versus S3 checks.** Clarified that `mc admin object info --bitrot` is an administrative shard check rather than an S3 operation; `mc stat` and `mc cat` provide the S3-facing checks.

## Review Notes

- Confirmed the documented `mc admin info` flags, Prometheus v3 syntax, pool/set metric labels, targeted healing syntax, existing-scan behavior, and object-info bit rot flag. The four official documentation links in the post resolve to the intended resources.
- The recovery guidance correctly requires XFS, stable mount identity, equal-or-greater replacement capacity/performance, automatic healing, and preserving MinIO's exclusive control of backend files. The restart is an optional maintenance verification step; it is not required to initiate replacement-drive healing.
- A healthy metric value indicates quorum availability and does not by itself prove every shard is restored. The post appropriately also requires full drive counts, no healing drives, error review, and object checks. Missing metrics must not be interpreted as zeros.
- Read/write tolerance need not be identical: when parity is half the set width, write quorum requires one more drive than read quorum. Existing objects retain their recorded parity if configuration changes. The post intentionally uses expected configured values rather than a universal numeric tolerance.
- ETags are correctly rejected as universal MD5 checksums. Explicit historical-version checks are appropriate; `mc cat` and `mc stat` support `--version-id`. Sampling provides evidence for the sampled objects, not exhaustive verification of all retained data.
- This was a documentation and shell-syntax review. No live MinIO deployment, replacement disk, production credentials, or trusted object manifest was supplied, so healing, metrics output, device performance, and object digests were not tested against a running cluster.
