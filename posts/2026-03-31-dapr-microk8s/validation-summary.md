# Validation Summary: How to Use Dapr with MicroK8s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MicroK8s (Canonical's lightweight Kubernetes distribution)
- Dapr (Distributed Application Runtime)
- Helm 3
- Kubernetes (Deployments, annotations, port-forwarding)
- Snap package manager
- Prometheus / Grafana (via MicroK8s observability addon)

## Sources Consulted
- MicroK8s official documentation — https://microk8s.io/docs
- MicroK8s addons list — https://microk8s.io/docs/addons
- MicroK8s Services and Ports — https://microk8s.io/docs/services-and-ports
- Dapr Kubernetes deployment docs — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Helm charts repository — https://github.com/dapr/helm-charts
- Dapr annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI installation docs — https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr quickstarts (hello-kubernetes) — https://github.com/dapr/quickstarts/tree/master/tutorials/hello-kubernetes
- MicroK8s observability addon enable script — https://github.com/canonical/microk8s-core-addons/blob/main/addons/observability/enable
- MicroK8s prometheus addon deprecation — https://github.com/canonical/microk8s-core-addons/blob/main/addons/prometheus/enable

## Issues Found
1. **Redundant storage addon**: The post enabled both `microk8s enable storage` and `microk8s enable hostpath-storage`. The `storage` addon is deprecated in MicroK8s 1.24+ and is now an alias for `hostpath-storage`. Running both is redundant and the deprecated name may confuse readers or produce warnings on newer versions. **Fix:** Removed the `microk8s enable storage` line and kept only `microk8s enable hostpath-storage`.

## Review Notes
- The `--set global.ha.enabled=false` Helm value is already the default in the Dapr chart, so it is technically unnecessary. However, it serves as useful documentation to make the single-node intent explicit, so it was left in place.
- The MicroK8s channel `1.32/stable` is a specific version pin. Readers may want to adjust this to the latest stable channel for their use case.
- The `KUBECONFIG` path `/var/snap/microk8s/current/credentials/client.config` requires the user to be in the `microk8s` group (which the post correctly sets up earlier). An alternative approach is `microk8s config > ~/.kube/config`.
- All Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are correct per current Dapr documentation.
- The sample container image `ghcr.io/dapr/samples/hello-k8s-node:latest` matches the official Dapr quickstart tutorials.
- The Grafana service name, namespace, and default credentials are all correct for the MicroK8s observability addon.
