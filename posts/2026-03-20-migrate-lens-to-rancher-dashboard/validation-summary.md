# Validation Summary: How to Migrate from Lens to Rancher Dashboard - Dashboard

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Lens (Kubernetes IDE / desktop app)
- Rancher (Rancher Manager / Rancher Dashboard)
- Kubernetes
- kubectl
- Helm
- Rancher CLI
- Rancher Fleet (GitOps)
- Prometheus / Grafana (mentioned for monitoring)

## Sources Consulted
- Rancher CLI GitHub releases: https://github.com/rancher/cli/releases (verified asset naming convention via `gh release view --repo rancher/cli`; latest stable v2.14.0 publishes versioned tarballs e.g. `rancher-linux-amd64-v2.14.0.tar.gz`)
- Rancher Helm install documentation: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher import cluster documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- kubectl config reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#config

## Issues Found
- **Rancher CLI download URL was incorrect.** The post used `https://github.com/rancher/cli/releases/latest/download/rancher-linux-amd64` and treated the asset as a raw binary. Verifying against the rancher/cli GitHub releases shows the published assets are versioned tarballs (e.g., `rancher-linux-amd64-v2.14.0.tar.gz`) — there is no asset named `rancher-linux-amd64`, so the original `curl -LO ... && chmod +x ...` flow would 404 / fail. Replaced the snippet with a versioned download, tar extraction, and move of the extracted `rancher` binary to `/usr/local/bin/rancher`.

## Review Notes
- The Rancher Helm install snippet is functionally correct (chart repo URL, namespace, `bootstrapPassword` flag are all current for Rancher 2.6+). Note for readers: a real install also requires `cert-manager` to be installed beforehand and typically a `tls-source` setting; the post's example is a minimal happy-path which is acceptable for a migration guide rather than a full install tutorial.
- The cluster import URL `https://rancher.yourdomain.com/v3/import/<token>.yaml` is illustrative; in practice Rancher generates a unique token-bearing URL displayed in the UI after creating a "Generic" import cluster — readers should copy the actual command shown by Rancher rather than typing the literal `token.yaml`.
- The Lens vs Rancher comparison table is a fair high-level summary. A few entries are simplifications (e.g., Lens does have some RBAC viewing and Helm chart support natively in recent versions; some advanced features moved behind Lens Desktop subscriptions) but nothing in the table is materially wrong for the purpose of the migration narrative.
- "Execute Shell" is the correct Rancher UI label for opening a pod shell in current Rancher Dashboard versions.
- Rancher Fleet is correctly identified as Rancher's built-in GitOps engine.
