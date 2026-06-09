# Validation Summary: How to Use K3s with Rancher

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Rancher (Kubernetes management platform)
- Helm (package manager)
- cert-manager (v1.14.4)
- Rancher CLI (v2.8.0)
- Rancher Fleet (GitOps)
- Prometheus / kube-prometheus-stack (v55.5.0)
- rancher-backup operator
- etcd snapshots
- Kubernetes (v1.28.5+k3s1)

## Sources Consulted
- K3s official documentation: https://docs.k3s.io/
- K3s installation options: https://docs.k3s.io/installation/configuration
- K3s etcd backup/restore: https://docs.k3s.io/datastore/backup-restore
- Rancher Helm chart installation docs: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher bootstrap password retrieval docs: https://ranchermanager.docs.rancher.com/pages-for-subheaders/installation-and-upgrade
- cert-manager Helm chart documentation (v1.14): https://cert-manager.io/docs/installation/helm/
- Rancher CLI documentation: https://ranchermanager.docs.rancher.com/reference-guides/cli-with-rancher/rancher-cli
- Rancher CLI GitHub releases: https://github.com/rancher/cli/releases
- Rancher Fleet documentation: https://fleet.rancher.io/
- rancher-backup operator: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery
- Rancher provisioning API (provisioning.cattle.io/v1)
- kube-prometheus-stack chart: https://github.com/prometheus-community/helm-charts

## Issues Found
No technical issues found.

The blog post is technically accurate. All K3s install flags (`--write-kubeconfig-mode`, `--tls-san`, `--cluster-init`, `server`), file paths (`/etc/rancher/k3s/k3s.yaml`, `/var/lib/rancher/k3s/server/node-token`, `/etc/rancher/k3s/config.yaml`), Helm repository URLs, Rancher API endpoints, cert-manager flags for v1.14.4 (`installCRDs=true`), Rancher CRD apiVersions (`provisioning.cattle.io/v1`, `catalog.cattle.io/v1`, `resources.cattle.io/v1`), and K3s etcd-snapshot commands match official documentation.

## Review Notes
- The `installCRDs=true` Helm value for cert-manager v1.14.4 is correct. Note that this was renamed to `crds.enabled=true` in cert-manager v1.15+, so this command would need to change if upgrading to a newer cert-manager version.
- The `rancher kubectl --cluster <name>` pattern works because Rancher CLI passes arguments through to kubectl (`--cluster` is a standard kubectl flag for selecting from kubeconfig), but for clarity in production usage, the more idiomatic Rancher CLI pattern is `rancher context switch <cluster_id>` followed by `rancher kubectl ...`.
- K3s version `v1.28.5+k3s1` is referenced in cluster templates; this version is supported but readers planning new deployments should consider using a newer release matching their target Kubernetes version.
- The `bootstrapPassword=admin` value used in the Helm install command is fine for demonstration but should never be used in production environments.
- The Rancher CLI v2.8.0 download URL format is correct; newer releases are available in the GitHub releases page.
- The Fleet target `kubernetes.io/distribution: k3s` label is not a standard Kubernetes label; it would need to be applied manually to clusters or set via Rancher cluster labels for the selector to match.
