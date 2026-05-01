# Validation Summary: How to Deploy Velero for Kubernetes Backup via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Velero
- Kubernetes
- AWS S3
- MinIO

## Sources Consulted
- Velero release `v1.18.0`: https://github.com/velero-io/velero/releases/tag/v1.18.0
- Velero AWS plugin release `v1.14.0`: https://github.com/velero-io/velero-plugin-for-aws/releases/tag/v1.14.0
- Velero Install CLI docs (`v1.18`): https://velero.io/docs/v1.18/velero-install/
- Velero Backup Reference (`v1.18`): https://velero.io/docs/v1.18/backup-reference/
- Velero File System Backup docs: https://velero.io/docs/main/file-system-backup/
- Velero MinIO evaluation install docs: https://velero.io/docs/main/contributions/minio/
- Velero AWS plugin compatibility README (`release-1.14`): https://github.com/velero-io/velero-plugin-for-aws/blob/release-1.14/README.md
- Portainer Kubernetes Applications docs: https://docs.portainer.io/user/kubernetes/applications
- Portainer Inspect an application docs: https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post pinned Velero CLI `v1.13.2` and AWS plugin `v1.9.2`, which are no longer current. I updated them to Velero `v1.18.0` and `velero-plugin-for-aws:v1.14.0` so the examples match current releases and the documented plugin compatibility matrix.
- The CLI download snippet claimed to work for Linux/macOS, but the archive shown was Linux-only. I corrected the comment so the command accurately describes a Linux x86_64 install.
- The install commands omitted `--use-node-agent`, but later sections assumed the `node-agent` DaemonSet existed and described file-system backups. I added `--use-node-agent` to both install examples so the deployment matches the rest of the guide.
- The MinIO example used a concrete `s3Url=http://minio:9000`, which is too environment-specific for a generic guide. I replaced it with `http://<minio-endpoint>:9000` so readers provide the real endpoint for their MinIO deployment.
- The scheduled-backup example said “1:00 AM UTC” but the cron expression did not specify a timezone. I changed the schedule to `CRON_TZ=UTC 0 1 * * *` so the command matches the explanation.
- The deployment annotation example used `kubectl annotate deployment`, which only annotates the Deployment object metadata and does not add the required pod annotation that Velero reads for file-system backup. I replaced it with a `kubectl patch deployment` command that updates `.spec.template.metadata.annotations`.
- The conclusion described `--use-restic` as a current file-system-backup option alongside `--use-node-agent`. Current Velero documentation marks the restic backup path as deprecated and disabled for new backups in 1.17 and 1.18, so I updated the wording to recommend `--use-node-agent` and note the deprecation.

## Review Notes
- The guide is technically relevant and salvageable; the main problems were version drift and a few command mismatches with current Velero behavior.
- The Portainer section is operationally correct at a UI level, but it remains a monitoring/inspection step rather than a Portainer-native Velero deployment workflow.
- The updated CLI install example is intentionally Linux x86_64 only. macOS users need the matching macOS archive or Homebrew, as described in Velero’s install documentation.
