# Validation Summary: How to Back Up and Restore Vault

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (Raft integrated storage backend)
- HashiCorp Consul (storage backend)
- systemd (services and timers)
- AWS S3 / AWS CLI (KMS server-side encryption)
- Google Cloud Storage / gsutil
- Kubernetes (CronJob, ServiceAccount, Secret)
- GPG (symmetric and recipient-based encryption)
- Prometheus Operator (PrometheusRule)
- Bash scripting
- Mermaid diagrams

## Sources Consulted
- HashiCorp Vault docs — `vault operator raft snapshot` commands: https://developer.hashicorp.com/vault/docs/commands/operator/raft
- HashiCorp Vault docs — Raft integrated storage: https://developer.hashicorp.com/vault/docs/configuration/storage/raft
- HashiCorp Consul docs — `consul snapshot` commands: https://developer.hashicorp.com/consul/commands/snapshot
- systemd unit file documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html (Environment, EnvironmentFile, ExecStartPre semantics)
- systemd timer docs: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- Kubernetes CronJob API reference (batch/v1, GA since 1.21): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- AWS CLI `s3 cp` reference (`--sse`, `--sse-kms-key-id`): https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- gsutil retention command: https://cloud.google.com/storage/docs/gsutil/commands/retention
- Prometheus Operator PrometheusRule CRD documentation
- Bash manual for `set -u` behavior with positional parameters

## Issues Found

1. **Systemd service had a broken `ExecStartPre` token export.**
   The original service unit used `ExecStartPre=/bin/bash -c 'export VAULT_TOKEN=$(cat $VAULT_TOKEN_FILE)'` to load the token. Because each `ExecStartPre`/`ExecStart` directive runs as a separate process, the exported variable dies with the subshell and is not visible to `ExecStart`. Replaced with `EnvironmentFile=/etc/vault.d/backup-token.env` (the documented systemd way to inject runtime environment variables), with a comment noting the file must be in `KEY=VALUE` format containing `VAULT_TOKEN=<token>`.

2. **Three scripts had unreachable usage checks due to `set -u` plus direct `$1` access.**
   `vault-restore.sh`, `consul-vault-restore.sh`, and `verify-vault-backup.sh` all used `set -euo pipefail` followed by `SNAPSHOT_FILE=$1` (or `BACKUP_FILE=$1`). With `set -u`, accessing an unset positional parameter aborts the script immediately with `unbound variable`, so the `if [ -z "$..." ]` usage-message check would never run when invoked without arguments. Changed each to `${1:-}` so the empty-string check is reachable and the user gets the intended usage message.

## Review Notes

- The comment in the manual-snapshot example ("The snapshot file contains encrypted data that requires unseal keys to restore") is slightly imprecise: the snapshot can be restored into an unsealed cluster via the API, and the *resulting* data requires unseal keys matching the snapshot's seal in order to decrypt. The wording is informally correct and was left as-is.
- `apk add --no-cache aws-cli` inside the Kubernetes CronJob assumes the `community` repository is enabled in the `hashicorp/vault:1.15` image (it is, in current Alpine 3.x bases), and that the container runs as a user able to install packages. This works for the official image, but readers customizing the base image should verify their Alpine version exposes the `aws-cli` package.
- `VAULT_SKIP_VERIFY=true` in the CronJob disables TLS verification against the in-cluster Vault address; this is acceptable for a sample but production deployments should mount the cluster CA and remove the skip-verify flag.
- The systemd backup script's pre-flight check (`vault status > /dev/null 2>&1`) treats a sealed Vault (exit code 2) as a failure. That is acceptable because raft snapshots cannot be taken from a sealed cluster, though the error message ("Vault is not accessible") could more accurately read "Vault is unavailable or sealed."
- `stat -f%z ... || stat -c%s ...` correctly handles both BSD/macOS and GNU/Linux `stat` flavors.
- The Kubernetes CronJob uses `apiVersion: batch/v1`, which is GA since Kubernetes 1.21 — appropriate for current clusters.
