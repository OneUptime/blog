# Validation Summary: How to Deploy Flux CD on K3s Edge Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Flux CD
- Kubernetes
- Kustomize Controller
- GitOps
- Rancher Local Path Provisioner
- SQLite and embedded etcd datastores
- Raspberry Pi / ARM64 edge nodes

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Lightweight Kubernetes overview: https://docs.k3s.io/
- K3s Cluster Datastore: https://docs.k3s.io/datastore
- K3s Backup and Restore: https://docs.k3s.io/datastore/backup-restore
- K3s Volumes and Storage: https://docs.k3s.io/add-ons/storage
- K3s High Availability Embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap GitHub command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux optional components: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux Kustomization API v1 reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Rancher Local Path Provisioner documentation: https://github.com/rancher/local-path-provisioner

## Issues Found
- The prerequisites listed 512MB RAM and 1 CPU core as the minimum for the tutorial, but current K3s requirements specify 2 CPU cores and 2GB RAM for server nodes. Updated the prerequisite to distinguish K3s server and agent-only requirements.
- The K3s install command later rewrote kubeconfig to use a stable DNS name, but the install command did not include that DNS name as a TLS SAN. Added `--tls-san=edge-site-001.internal.example.com` so the generated API server certificate can validate that hostname.
- The ARM64 example looked like a standalone ARM64 install but actually used `K3S_URL` and `K3S_TOKEN`, which joins an existing server as an agent. Updated the surrounding text to say it is an agent join command.
- The post said Flux compatibility depended on K3s containerd paths. Flux talks to the Kubernetes API, not directly to containerd, so the wording was corrected to focus on the K3s kubeconfig path and stable API server address.
- The Flux bootstrap command used `--token-env=GITHUB_TOKEN`, which is not present in current Flux CLI documentation. Updated the snippet to export `GITHUB_TOKEN`, which Flux uses automatically.
- The Kustomization health check identified `local-path-provisioner` as a DaemonSet. K3s deploys the local path provisioner as a Deployment, so the kind was corrected.
- The storage class snippet attempted to redefine the default `local-path` StorageClass. K3s creates that StorageClass by default, so the example was changed to create a separate `local-path-retain` class for Retain semantics.
- The SQLite backup example only backed up `state.db` and omitted the K3s server token, which K3s requires for restore because it is used for encrypted datastore content. Updated the backup example to archive both `server/db` and `server/token`.
- The best-practice note about `prune: false` referred to components that survive pod restarts, which is not what Flux pruning controls. Updated the wording to describe Flux garbage collection.
- The claim that K3s is "the most popular" edge Kubernetes distribution was not supported by official documentation. Changed it to "a popular" distribution.

## Review Notes
- The Flux Kustomization API fields used in the examples, including `interval`, `retryInterval`, `timeout`, `prune`, `sourceRef`, `path`, and `healthChecks`, match the current Flux v1 Kustomization API.
- The K3s install flags `--disable=traefik`, `--disable=servicelb`, `--write-kubeconfig-mode`, and `--cluster-init` are current K3s configuration options.
- Current Flux documentation lists `source-controller` and `kustomize-controller` as the minimum required bootstrap components, so the edge-optimized component list is valid for Kustomize-only workloads.
