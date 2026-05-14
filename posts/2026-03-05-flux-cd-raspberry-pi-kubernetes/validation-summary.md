# Validation Summary: How to Set Up Flux CD on a Raspberry Pi Kubernetes Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux GitRepository and Kustomization APIs
- Kustomize
- Kubernetes
- K3s
- Raspberry Pi ARM64
- GitHub bootstrap workflow
- kubectl
- nginx container image

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CLI `bootstrap` command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux CLI `reconcile kustomization` command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://v2-0.docs.fluxcd.io/flux/components/kustomize/api/v1/
- Flux security documentation for multi-architecture images: https://fluxcd.io/flux/security/
- K3s quick-start guide: https://docs.k3s.io/quick-start
- K3s installation configuration documentation: https://docs.k3s.io/installation/configuration
- K3s requirements documentation: https://docs.k3s.io/installation/requirements
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The kubeconfig copy command used `scp pi@SERVER_IP:/etc/rancher/k3s/k3s.yaml ~/.kube/config-pi`. With the default K3s install, `/etc/rancher/k3s/k3s.yaml` is root-owned and not normally readable by the `pi` user. Changed the example to create `~/.kube` and copy the file with `ssh pi@SERVER_IP 'sudo cat /etc/rancher/k3s/k3s.yaml' > ~/.kube/config-pi`.
- The sample app workflow only reconciled the bootstrapped `flux-system` Kustomization after adding `apps.yaml`. That applies the new Flux Kustomization object, but does not explicitly force the `apps` Kustomization to reconcile immediately. Added `flux reconcile kustomization apps --with-source` after the `flux-system` reconciliation.

## Review Notes
- The Flux and K3s install, bootstrap, controller patching, reconciliation interval, and Flux API examples use current non-deprecated APIs and commands.
- The `kubectl top` commands depend on metrics-server being available. K3s includes metrics-server by default unless it has been disabled.
- Flux's currently documented Kubernetes support window should be checked when running this guide against older K3s versions, because Flux documentation no longer recommends unsupported Kubernetes releases for production.
