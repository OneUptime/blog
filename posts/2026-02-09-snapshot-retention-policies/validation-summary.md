# Validation Summary: How to Implement Volume Snapshot Retention Policies

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- CSI VolumeSnapshot API
- Kubernetes CronJobs
- kubectl
- Bash
- jq

## Sources Consulted
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CSI Volume Snapshot API reference: https://kubernetes-csi.github.io/docs/api/volume-snapshot.html
- jq manual / local jq 1.7 behavior for `fromdateiso8601`, `test`, and numeric conversion
- GNU coreutils `date` local behavior for `date -d`
- EUR-Lex GDPR Article 5 storage limitation text: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679
- 45 CFR 164.316 HIPAA documentation retention requirement: https://ecfr.io/Title-45/Section-164.316
- SEC retention of audit and review records: https://www.sec.gov/rules-regulations/2003/01/retention-records-relevant-audits-reviews

## Issues Found
- Added a prerequisite note that VolumeSnapshot resources require the snapshot CRDs, snapshot controller, validating webhook, and a CSI driver with snapshot support. Kubernetes documents VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass as CRDs, not core API resources, and notes that snapshot support is CSI-driver dependent.
- Hardened the count-based retention script so snapshots without a `pvc-name` label are ignored instead of producing an empty selector value.
- Corrected storage-size calculations in the reporting and cost scripts. `status.restoreSize` is a Kubernetes `Quantity`, not guaranteed to be a plain `Gi` string, so the examples now handle `Gi`, `Mi`, `Ti`, and byte values and safely return `0` when no restore sizes are available.
- Removed an unused and misleading `EXPIRY_DATE` variable from the expiring-soon report.
- Hardened the expiring-soon report so snapshots without a `retention-days` label are skipped instead of causing `jq` conversion errors.
- Corrected the compliance-retention wording. GDPR does not define a blanket seven-year retention period for financial data, so the example now describes this as a documented GDPR-related retention period rather than a universal GDPR rule. HIPAA wording was narrowed to documentation retention.

## Review Notes
- The Kubernetes API versions used in the post, including `batch/v1` for CronJob and `snapshot.storage.k8s.io/v1` for VolumeSnapshot, are current.
- The examples still assume Linux userland tools such as GNU `date`, `jq`, `bc`, and `column` are available wherever the shell scripts run.
- The examples intentionally use labels for retention policy selection. In production, RBAC for the `snapshot-manager` service account and the `VolumeSnapshotClass` deletion policy should be reviewed before deploying these jobs.
