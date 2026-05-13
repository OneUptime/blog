# Validation Summary: How to Set Up Flux CD on MicroK8s with HA Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MicroK8s
- Kubernetes
- dqlite
- Flux CD
- Flux GitHub bootstrap
- Flux HelmRepository and HelmRelease APIs
- ingress-nginx Helm chart
- Ubuntu snap packages

## Sources Consulted
- MicroK8s High Availability documentation: https://microk8s.io/docs/high-availability
- MicroK8s kubectl documentation: https://microk8s.io/docs/working-with-kubectl
- MicroK8s addons documentation: https://microk8s.io/docs/addons
- MicroK8s command reference: https://microk8s.io/docs/command-reference
- MicroK8s release notes: https://microk8s.io/docs/release-notes
- Snap Store MicroK8s package page: https://snapcraft.io/microk8s
- Flux GitHub bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Source API reference v1 and HelmRepository documentation: https://fluxcd.io/flux/components/source/api/v1/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml

## Issues Found
- The install command pinned MicroK8s to `1.29/stable`, which is outdated for a 2026 guide. Updated it to `1.34/stable`, matching the current stable MicroK8s release documentation consulted during review.
- The HA datastore verification command checked the Calico kube-controllers pod, which verifies a networking component rather than dqlite health. Replaced it with `microk8s status` output guidance showing `high-availability` and datastore node status.
- The kubeconfig export assumed `~/.kube` already existed. Added `mkdir -p ~/.kube` before writing the MicroK8s config.
- The Flux GitHub bootstrap example used `--owner=my-org` together with `--personal`. Flux documents `--personal` for user-owned repositories; org-owned repositories should omit it. Removed `--personal` from the org example.
- The HelmRelease targeted the `ingress-nginx` namespace without creating it. Added `install.createNamespace: true`, which Flux HelmRelease v2 supports for creating `targetNamespace` during install.
- The best-practice note said to always join additional nodes as HA control plane members. Narrowed this to the three-node HA case, since larger MicroK8s clusters can also use worker-only nodes.
- The API load balancer note incorrectly tied API availability to Flux's GitRepository source. Reworded it to apply to kubectl and automation clients.
- The certificate rotation recommendation suggested automating `microk8s refresh-certs` with a Flux-managed CronJob. Replaced this with a maintenance-window recommendation and `sudo microk8s refresh-certs -c`, because MicroK8s documents important cautions for CA refreshes in live multi-node clusters.

## Review Notes
- The Flux and Kubernetes manifests use current stable API versions (`source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, and `apps/v1`).
- `hostpath-storage` is valid for MicroK8s but remains local-node storage and is not suitable for production workloads that require replicated persistent volumes.
