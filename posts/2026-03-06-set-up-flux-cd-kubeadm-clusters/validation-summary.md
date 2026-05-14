# Validation Summary: How to Set Up Flux CD on Kubeadm Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubelet
- kubectl
- containerd
- Flannel CNI
- Flux CD
- Flux GitHub bootstrap
- Flux Kustomization, HelmRepository, and HelmRelease APIs
- Rancher Local Path Provisioner
- ingress-nginx
- MetalLB
- Kustomize

## Sources Consulted
- Kubernetes kubeadm installation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes kubeadm cluster creation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes kubeadm upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux `flux check` CLI documentation: https://fluxcd.io/flux/cmd/flux_check/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation and API reference: https://fluxcd.io/flux/guides/helmreleases/ and https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation and FAQ: https://fluxcd.io/flux/components/kustomize/kustomizations/ and https://fluxcd.io/flux/faq/
- Rancher Local Path Provisioner documentation: https://github.com/rancher/local-path-provisioner and https://docs.apps.rancher.io/reference-guides/local-path-provisioner/
- ingress-nginx documentation: https://kubernetes.github.io/ingress-nginx/
- MetalLB configuration documentation: https://metallb.io/configuration/ and https://metallb.io/configuration/_advanced_l2_configuration/

## Issues Found
- The Kubernetes apt repository examples targeted Kubernetes v1.30, which is no longer a supported minor release as of the review date. Updated the install flow to use the supported v1.35 package repository and added the official `/etc/apt/keyrings` directory creation step.
- The Flux GitHub bootstrap example omitted `--token-auth`, while the current Flux GitHub bootstrap documentation uses it for PAT-backed HTTPS access. Added `--token-auth` to the bootstrap command.
- The MetalLB section created source, release, and configuration files but did not explain how to add them to the reconciled infrastructure Kustomization. Added the required resources list update and a two-step note so MetalLB CRDs are installed before applying MetalLB custom resources.
- The kubeadm upgrade example targeted v1.31 and did not switch the Kubernetes apt repository to the target minor release. Updated the example to a supported v1.35-to-v1.36 upgrade flow and added the v1.36 repository setup.
- The kubeadm upgrade example upgraded kubelet without draining and uncordoning the node. Added `kubectl drain` and `kubectl uncordon` steps to match the official upgrade procedure.

## Review Notes
- The ingress-nginx project documentation states that maintenance continued only until March 2026 and existing artifacts remain available afterward. The example remains technically usable, but future revisions should consider a maintained ingress controller recommendation.
- The kubeadm upgrade commands use the Kubernetes documentation's `1.36.x-*` and `v1.36.x` placeholders. Readers must replace `x` with the latest patch version shown by their package manager.
