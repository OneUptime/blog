# Validation Summary: How to Install MicroK8s on Ubuntu for Lightweight Kubernetes

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Ubuntu
- snapd / Snap channels and refresh settings
- MicroK8s
- Kubernetes
- CoreDNS
- Hostpath storage
- Traefik / Ingress
- Calico CNI and NetworkPolicy
- NVIDIA GPU Operator
- Kubernetes RBAC, Pod Security Standards, ResourceQuota, and LimitRange
- cert-manager
- Prometheus / Grafana / Metrics Server
- Velero

## Sources Consulted
- MicroK8s Get Started: https://canonical.com/microk8s/docs/getting-started
- MicroK8s Addons reference: https://canonical.com/microk8s/docs/addons
- MicroK8s Ingress addon: https://canonical.com/microk8s/docs/addon-ingress
- MicroK8s GPU addon: https://canonical.com/microk8s/docs/addon-gpu
- MicroK8s High Availability: https://canonical.com/microk8s/docs/high-availability
- MicroK8s Services and ports: https://canonical.com/microk8s/docs/services-and-ports
- MicroK8s CNI Configuration: https://canonical.com/microk8s/docs/change-cidr
- MicroK8s Command reference: https://canonical.com/microk8s/docs/command-reference
- MicroK8s Configuring services: https://canonical.com/microk8s/docs/configuring-services
- MicroK8s Release notes: https://canonical.com/microk8s/docs/release-notes
- Snap system refresh options: https://snapcraft.io/docs/reference/administration/system-options/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes service account token documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Velero Helm chart values: https://github.com/vmware-tanzu/helm-charts/blob/main/charts/velero/values.yaml
- MicroK8s Velero backup guide: https://canonical.com/microk8s/docs/velero

## Issues Found
- Updated the pinned MicroK8s install and upgrade examples from old 1.28/1.29 channels to the current 1.36 stable channel.
- Corrected the ingress description: MicroK8s 1.35 and later uses Traefik by default, while earlier releases used NGINX.
- Replaced deprecated `storage` addon usage with `hostpath-storage` in addon examples and reset recovery steps.
- Removed `dashboard` from the current common addon list and added a note that it was removed in MicroK8s 1.36.
- Added missing multi-node ports for dqlite and Calico VXLAN based on the MicroK8s ports reference.
- Replaced invalid `microk8s enable calico` examples with verification of the default Calico CNI pods.
- Added `runtimeClassName: nvidia` to GPU workload examples for MicroK8s 1.36 behavior.
- Corrected NVIDIA GPU Operator verification to check the `gpu-operator-resources` namespace.
- Changed cert-manager's ingress class example from `nginx` to `public` to match the current MicroK8s ingress default class.
- Converted the plain `Resource Quotas` line into a Markdown heading.
- Added the missing `--audit-policy-file` API server flag so the audit policy file is actually used.
- Corrected snap refresh scheduling from an invalid per-snap setting to `sudo snap set system refresh.timer=...`, and updated the hold example.
- Replaced a manual tar backup of the whole MicroK8s data directory with the official `microk8s dbctl backup` command.
- Updated the Velero Helm example to use current chart value keys for backup and volume snapshot locations and to include provider credentials.

## Review Notes
The Dashboard section is retained only for MicroK8s 1.35 and earlier. Users on MicroK8s 1.36 should use other supported observability or UI tooling because the dashboard addon and dashboard proxy were removed.
