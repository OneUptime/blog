# Validation Summary: How to Create Backup Policies for Talos Linux Clusters

## Status
validated

## Post Type
Guide / Tutorial — design and implementation of backup policies for Talos Linux clusters using Velero, Gatekeeper, and Prometheus.

## Technologies Covered
- Talos Linux (`talosctl`)
- Kubernetes (Namespaces, labels, annotations)
- Velero (schedule CRDs, snapshot data movement, metrics)
- OPA / Gatekeeper (ConstraintTemplate, custom constraints, Rego)
- Prometheus / Prometheus Operator (PrometheusRule)
- Bash, jq, yq

## Sources Consulted
- Talos Controllers and Resources docs: https://www.talos.dev/v1.9/learn-more/controllers-resources/
- siderolabs/talos issue on machineconfig output formatting: https://github.com/siderolabs/talos/issues/10399
- Velero schedule create and snapshot-move-data flag: https://github.com/vmware-tanzu/velero/issues/6820 and https://github.com/vmware-tanzu/velero/issues/6870
- Velero metrics source: https://github.com/vmware-tanzu/velero/blob/main/pkg/metrics/metrics.go (defines `velero_backup_last_successful_timestamp`)
- Gatekeeper ConstraintTemplates: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper How-To (constraint apiVersion): https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Prometheus Operator PrometheusRule CRD: `monitoring.coreos.com/v1` (current stable)

## Issues Found

1. **jq filter on `talosctl get members -o json` was incorrect.** The original script used `jq -r '.[].spec.addresses[0]'`, but `talosctl get` with `-o json` emits JSON Lines (one object per line, not an array). The `.[]` operator would fail on each individual object. Changed to `jq -r '.spec.addresses[0]'`, which correctly processes each line as a separate document, and added a brief comment explaining the output format.

2. **`talosctl get machineconfig -o yaml` output cannot be passed directly to `talosctl validate`.** `talosctl get` returns a COSI-wrapped resource (top-level `metadata` and `spec` fields), whereas `talosctl validate --config` expects a raw v1alpha1 document with top-level `version:`, `machine:`, `cluster:` keys. The validation step in the original script would have failed. Updated the script to pipe through `yq '.spec'` so the saved file is a raw machine config that validate can consume.

## Review Notes

- **Velero `--snapshot-move-data` caveat:** The flag exists on `velero schedule create` but was broken in Velero 1.12.0 (it propagated as "auto" instead of "true" on the created backups; see velero#6820). The fix landed in 1.12.1 / 1.13.0. Readers running 1.12.0 should upgrade before relying on the flag inside schedules. Not surfaced in the post; minor caveat only.
- **TTL math is correct** for all examples: 24h, 168h (7d), 720h (30d), 2160h (90d), 8760h (365d).
- **`velero_backup_last_successful_timestamp`** is the correct metric name and is labeled by `schedule`, so the `schedule=~"critical.*"` matcher works as written.
- **Gatekeeper API versions are current:** `templates.gatekeeper.sh/v1` for `ConstraintTemplate` and `constraints.gatekeeper.sh/v1beta1` for constraints — both match official docs (there is no `constraints.gatekeeper.sh/v1` as of current Gatekeeper releases).
- **`s3_bucket_size_bytes`** is not a built-in metric; it implies a custom S3 exporter. The example is presented illustratively, which is fine.
- **Annotation prefix `backup.policy/*`** uses a valid DNS-subdomain prefix and is acceptable Kubernetes annotation syntax.
- No restructuring or stylistic changes were made; only the two technically incorrect script lines were edited.
