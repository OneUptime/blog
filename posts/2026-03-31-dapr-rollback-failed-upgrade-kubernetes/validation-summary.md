# Validation Summary: How to Roll Back a Failed Dapr Upgrade on Kubernetes

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes
- Helm 3
- Dapr CLI

## Sources Consulted
- Helm official documentation for `helm rollback`, `helm history`, `helm get manifest`, and `helm upgrade --dry-run` commands (https://helm.sh/docs/)
- Dapr Helm chart source on GitHub (https://github.com/dapr/dapr/tree/master/charts/dapr) for control plane component names, container names, image names, and resource kinds (Deployment vs StatefulSet)
- Dapr CLI documentation for `dapr status -k` (https://docs.dapr.io/reference/cli/dapr-status/)
- Kubernetes documentation for `kubectl set image`, `kubectl rollout status`, and `kubectl delete pod` commands (https://kubernetes.io/docs/reference/)

## Issues Found
- **Missing `dapr-placement-server` in manual rollback section**: The manual rollback commands only covered three Deployments (dapr-operator, dapr-sentry, dapr-sidecar-injector) but omitted the `dapr-placement-server` StatefulSet. This is a core Dapr control plane component responsible for actor placement. Skipping it during a manual rollback would leave a version-mismatched control plane. Added the missing `kubectl set image statefulset/dapr-placement-server` command with the correct container name and image (`daprio/placement`).

## Review Notes
- The Docker image registry used in examples (`docker.io/daprio/`) is correct for the example version 1.12.5, but newer Dapr releases (1.13+) have transitioned to GitHub Container Registry (`ghcr.io/dapr/`). The blog's approach of first running `helm get manifest --revision` to discover the actual image tags mitigates this, since users will see whichever registry their previous revision used.
- Dapr 1.14+ introduced a `dapr-scheduler-server` StatefulSet as an additional control plane component. Since the example version is 1.12.5, omitting the scheduler is correct, but users on 1.14+ would need to include it in a manual rollback as well.
- The staging namespace approach for testing upgrades has a caveat: Dapr's sidecar injector uses a cluster-scoped mutating webhook, so installing a second Dapr instance in a staging namespace could cause webhook conflicts. Users should be aware of this when testing in shared clusters.
- The `helm history` example output is intentionally simplified (omits UPDATED, CHART, APP VERSION columns) for readability, which is fine for illustration purposes.
