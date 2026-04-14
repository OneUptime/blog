# Validation Summary: How to Upgrade Dapr on Kubernetes

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes
- Helm 3.x
- Dapr CLI
- kubectl

## Sources Consulted
- Dapr Kubernetes upgrade guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-upgrade/
- Dapr CLI reference (`dapr upgrade`): https://docs.dapr.io/reference/cli/dapr-upgrade/
- Dapr CLI installation: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr service invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr GitHub releases: https://github.com/dapr/dapr/releases
- Helm upgrade documentation: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found

1. **Invalid `--wait` flag on `dapr upgrade -k` (line 101)**: The `--wait` flag is not a valid option for the `dapr upgrade` CLI command. The official CLI reference only supports `--kubernetes`/`-k`, `--runtime-version`, `--set`, `--image-registry`, and `--help`. Removed `--wait` from the command.

2. **Incorrect resource type for placement server logs (lines 52, 206)**: The post used `deployment/dapr-placement-server` for `kubectl logs` commands, but the Dapr placement server runs as a StatefulSet, not a Deployment. Changed to `statefulset/dapr-placement-server` for consistency with the correct `statefulset/` reference already used on line 110.

3. **Incorrect CRD upgrade claim (line 189)**: The post stated "Helm does this automatically with --wait" regarding CRD updates. This is factually wrong — Helm does not upgrade CRDs on `helm upgrade` (this is a well-known Helm limitation). The official Dapr docs explicitly state CRDs must be updated manually. Replaced the entire CRD section with correct manual `kubectl apply` commands pointing to the CRD files in the Dapr GitHub repository.

4. **Missing `httpendpoints` in backup section**: The backup step did not include the `httpendpoints` CRD, which has been part of Dapr since before v1.14. Added `kubectl get httpendpoints -A -o yaml > httpendpoints-backup.yaml` to the backup commands.

## Review Notes
- The post uses Dapr v1.14.0 in all examples. The dapr-scheduler-server component shown in the `dapr status -k` output was introduced in v1.14, which is version-appropriate. However, readers upgrading from pre-1.14 versions should be aware that the scheduler is a new component they will see after upgrading.
- The `helm diff` plugin used in Step 4 (`helm diff upgrade`) is a third-party Helm plugin, not built into Helm. Users would need to install it separately. The post does not mention this prerequisite.
- The `--atomic` flag on `helm upgrade` is a valid and useful Helm feature but is not part of the official Dapr upgrade documentation. Its inclusion as a best practice is reasonable.
- The `dapr status -k` example output omits `dapr-dashboard`, which the official docs do include in their example output. This is minor since the dashboard is optional and not a core control plane component.
