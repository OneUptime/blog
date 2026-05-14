# Validation Summary: How to Set Up Flux CD on Hetzner Cloud Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Hetzner Cloud
- Kubernetes
- k3s
- Hetzner Cloud CSI Driver
- Hetzner Cloud Controller Manager
- Helm and Flux HelmRelease
- ingress-nginx
- PostgreSQL StatefulSet storage

## Sources Consulted
- Flux bootstrap GitHub CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Hetzner Cloud Helm charts repository: https://github.com/hetznercloud/helm-charts
- Hetzner Cloud CSI Driver Kubernetes getting-started documentation: https://github.com/hetznercloud/csi-driver/blob/main/docs/kubernetes/getting-started.md
- Hetzner Cloud CSI Driver Helm chart values: https://github.com/hetznercloud/csi-driver/blob/main/chart/values.yaml
- Hetzner Cloud Controller Manager Helm chart values: https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/main/chart/values.yaml
- Hetzner Cloud Controller Manager load balancer annotations: https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/main/docs/reference/load_balancer_annotations.md
- K3s networking services and external cloud controller documentation: https://docs.k3s.io/networking/networking-services

## Issues Found
- The k3s install commands did not prepare the cluster for an external cloud controller. Added `--disable-cloud-controller`, disabled ServiceLB, and set `--kubelet-arg=cloud-provider=external`; added a Flux bootstrap toleration for the temporary `node.cloudprovider.kubernetes.io/uninitialized` taint.
- The Hetzner Secret was named `hcloud-token`, but the current Hetzner CSI and CCM Helm charts default to a Secret named `hcloud` with key `token`. Renamed the Secret and updated references.
- The CCM Helm values enabled private networking without adding the required `network` key to the `hcloud` Secret. Changed the example to keep networking disabled by default and documented when to enable it.
- The Postgres StatefulSet referenced `postgres-credentials` but the example did not create it. Added the missing Secret manifest.
- The ingress-nginx HelmRelease referenced a HelmRepository and namespace that were not defined. Added the `ingress-nginx` namespace and official ingress-nginx HelmRepository.
- The Hetzner load balancer health-check interval annotation used `"5s"`, but the annotation expects an integer number of seconds. Changed it to `"5"`.
- The ingress example enabled private-IP load balancing while the CCM private-networking example is disabled by default. Changed `use-private-ip` to `"false"` for consistency.
- Flux notification examples used `notification.toolkit.fluxcd.io/v1` for Provider and Alert, while current Flux docs use `v1beta3` for those resources. Updated both manifests and removed the unsupported Discord `channel` field.

## Review Notes
The guide is technically valid after the fixes, but it remains a concise single-control-plane tutorial. A production version should cover high availability, firewalls, private networking details, encrypted GitOps secrets such as SOPS, Kubernetes version pinning, and backup/restore for persistent workloads.
