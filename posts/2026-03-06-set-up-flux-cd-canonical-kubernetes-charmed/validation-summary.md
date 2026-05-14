# Validation Summary: How to Set Up Flux CD on Canonical Kubernetes (Charmed K8s)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Charmed Kubernetes
- Canonical Kubernetes
- Juju
- LXD
- Flux CD
- GitHub bootstrap for Flux
- Kubernetes manifests
- Kustomize
- HelmRepository and HelmRelease Flux APIs
- Ceph CSI StorageClass
- Prometheus monitoring

## Sources Consulted
- Charmed Kubernetes local installation documentation: https://ubuntu.com/kubernetes/charmed-k8s/docs/install-local
- Charmed Kubernetes supported versions documentation: https://ubuntu.com/kubernetes/charmed-k8s/docs/supported-versions
- Charmed Kubernetes add-on/operator charm documentation for kubeconfig retrieval: https://ubuntu.com/kubernetes/charmed-k8s/docs/how-to-addons
- Charmhub Charmed Kubernetes bundle page: https://charmhub.io/charmed-kubernetes
- Charmhub Kubernetes Core bundle page: https://charmhub.io/kubernetes-core
- Juju deploy command documentation: https://documentation.ubuntu.com/juju/3.6/reference/juju-cli/list-of-juju-cli-commands/deploy
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap github CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux monitoring guide: https://fluxcd.io/flux/guides/monitoring/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- The local LXD prerequisite listed 8 GB RAM and 4 CPU cores, but Canonical's local Charmed Kubernetes documentation recommends at least 32 GB RAM and 128 GB SSD storage. Updated the prerequisite.
- The Charmed Kubernetes deployment example did not pin a supported Kubernetes channel. Updated it to `1.35/stable`, matching the current supported Charmed Kubernetes release set.
- The local LXD deployment omitted documented container-specific settings for Calico and containerd. Added the required `calico ignore-loose-rpf` config and `containerd` empty resource commands.
- The hand-written minimal bundle used Kubernetes `1.30/stable`, which is outside the current supported Charmed Kubernetes release window, and risked diverging from the maintained bundle model. Replaced it with the official `kubernetes-core` bundle on `1.35/stable`.
- The kubeconfig retrieval command used a unit path and `/home/ubuntu/config`. Canonical's docs use the control-plane leader and `cat config`. Updated the command accordingly.
- The Flux GitHub bootstrap command used `--personal` without an explicit value. This can work with Cobra boolean flags, but the official docs show `--personal=true`; updated it for clarity and consistency.
- The repository layout created `infrastructure/controllers` files later without creating the directory. Added the missing `mkdir`.
- The Flux examples created resources under `clusters/charmed/apps` and `clusters/charmed/infrastructure` but did not include Kustomize files to make Flux apply them from the bootstrap path. Added the required cluster, apps, and infrastructure `kustomization.yaml` examples.
- The Ceph StorageClass example implied storage provisioning was generally enabled by the snippet alone. Clarified that it assumes Ceph CSI, secrets, and the pool already exist.
- The multi-cluster example did not actually configure a remote cluster. Added a kubeconfig Secret and `spec.kubeConfig.secretRef`, matching Flux's remote-cluster Kustomization model.
- The Juju scaling section said Flux schedules workloads on new nodes. Kubernetes schedules pods; Flux reconciles desired state. Updated the comment.

## Review Notes
The commands were checked against official documentation because the local environment does not have `juju`, `kubectl`, or `flux` installed. The Ceph CSI and LoadBalancer examples remain environment-dependent: readers need a configured CSI backend for the StorageClass and a cloud/load balancer integration for `type: LoadBalancer` services to receive external addresses.
