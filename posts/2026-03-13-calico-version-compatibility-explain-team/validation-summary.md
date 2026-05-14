# Validation Summary: How to Explain Calico Component Version Compatibility to Your Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kubernetes CNI
- kubectl
- calicoctl

## Sources Consulted
- Calico Open Source 3.24 Kubernetes system requirements: https://archive-os-3-24.netlify.app/calico/3.24/getting-started/kubernetes/requirements/
- Calico Open Source 3.25 Kubernetes system requirements: https://archive-os-3-25.netlify.app/calico/3.25/getting-started/kubernetes/requirements/
- Calico Open Source 3.26 Kubernetes system requirements: https://archive-os-3-26.netlify.app/calico/3.26/getting-started/kubernetes/requirements/
- Calico Open Source 3.27 Kubernetes system requirements: https://archive-os-3-27.netlify.app/calico/3.27/getting-started/kubernetes/requirements/
- Calico Open Source 3.28 Kubernetes system requirements: https://archive-os-3-28.netlify.app/calico/3.28/getting-started/kubernetes/requirements/
- Current Calico Open Source Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The post described Calico compatibility as a strict N-2 / three-version model and used incorrect examples for Calico 3.27. Updated the analogy and diagram to match Tigera's documented tested Kubernetes versions for Calico 3.24 through 3.28.
- The `kubectl version --short` command is not present in current Kubernetes kubectl documentation. Replaced it with `kubectl version -o json` and a `sed` extraction of the server minor version.
- The Calico version check assumed the `calico-system` namespace only. Updated the snippet to find the namespace from the `calico-node` pod label first, which also works for non-operator installs that commonly use `kube-system`.
- The post claimed a `calicoctl` version mismatch could cause silent errors. Tigera documents that `calicoctl` calls fail when versions do not match unless `--allow-version-mismatch` is used, so the explanation was corrected.

## Review Notes
The post is now technically accurate as a practical guide. The Calico documentation frames Kubernetes support as tested versions, while noting other versions may work but are not actively tested; future updates should refresh the version examples against the current Tigera requirements page.
