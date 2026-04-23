# Validation Summary: How to Set Up Rancher HA on K3s - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Manager
- K3s
- Embedded etcd
- Kubernetes
- Helm
- cert-manager
- Traefik ingress controller
- `etcdctl`
- Load balancers / VIPs / DNS

## Sources Consulted
- K3s High Availability with embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s advanced configuration (`etcdctl` with embedded etcd): https://docs.k3s.io/advanced
- K3s token CLI reference: https://docs.k3s.io/cli/token
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s networking services (Traefik / ServiceLB): https://docs.k3s.io/networking/networking-services
- Rancher installation requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher install/upgrade on a Kubernetes cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher on GKE guidance (Traefik ingressClass and ingress-nginx EOL note): https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/rancher-on-gke
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/

## Issues Found
- The prerequisites understated current Rancher-on-K3s HA sizing and omitted several required deployment assumptions. Rancher's current installation requirements call for a supported K3s version and significantly higher per-node resources than the original `2 CPU / 4GB RAM` guidance. I updated the prerequisites to reflect current Rancher requirements and clarified the load balancer / DNS expectations.
- The original K3s server commands disabled Traefik and tainted every server node with `CriticalAddonsOnly=true:NoExecute`. On a minimal three-server Rancher HA cluster, that would block the default K3s ingress path and prevent Rancher-related workloads from scheduling as described. I removed those flags, switched the guide to K3s's built-in Traefik ingress, and updated the Rancher Helm value to `ingress.ingressClassName=traefik`.
- The first K3s install snippet had invalid shell syntax because it placed an inline comment after a line-continuation backslash. I rewrote the command so it is syntactically valid and copy-pasteable.
- The embedded etcd verification step used `kubectl exec` against an `etcd-server-1` pod, which is not the normal access path for K3s embedded etcd. K3s documents `etcdctl` as an external tool used locally with K3s-managed certificates, so I replaced the check with a correct `sudo etcdctl member list` example.
- The cert-manager Helm install used `--set installCRDs=true`. Current cert-manager installation docs use `--set crds.enabled=true`, so I updated the command and added `helm repo update` plus `--wait` for a more reliable install sequence.
- The token retrieval example was normalized to the canonical K3s server token file path documented in the K3s token CLI reference: `/var/lib/rancher/k3s/server/token`.

## Review Notes
- The revised guide assumes a single load balancer or VIP fronts the K3s API on `6443` and Rancher ingress traffic on `80/443`. A separate API hostname would also be valid if documented consistently.
- The added `INSTALL_K3S_VERSION` placeholder is intentional. Rancher requires a K3s version that matches the support matrix for the target Rancher release, so leaving it as a placeholder is more accurate than implicitly installing whatever version happens to be latest.
- Rancher's latest documentation for K3s states that an ingress controller is already installed by default, and the Rancher GKE installation guidance notes that community `ingress-nginx` reached EOL in March 2026. Using the built-in Traefik path is therefore the better fit for this post as of April 23, 2026.
- No live K3s / Rancher cluster was available in this workspace, so validation was documentation-based rather than an executed deployment test.
