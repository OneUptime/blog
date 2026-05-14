# Validation Summary: How to Choose Calico Component Version Compatibility for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- Kubernetes CNI
- Helm
- kubectl
- jq

## Sources Consulted
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Helm installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico Helm installation reference: https://docs.tigera.io/calico/latest/reference/installation/helm_customization
- Calico component versions: https://docs.tigera.io/calico/latest/reference/component-versions
- Calico v3.28.0 Helm chart values: https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/charts/tigera-operator/values.yaml
- Calico security policy: https://github.com/projectcalico/calico/security/policy
- Calico GitHub security advisories: https://github.com/projectcalico/calico/security/advisories
- Tigera security bulletins: https://www.tigera.io/security-bulletins/
- Kubernetes kubeadm upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/

## Issues Found
- The security subscription list referenced `security@tigera.io`, but the current public Calico security policy lists `psirt@projectcalico.org` for vulnerability reporting and Tigera publishes public advisories through the Tigera Security Bulletins page. Updated the recommendation to point readers to the published bulletin page and GitHub advisories URL.
- The Helm values example pinned `tigeraOperator.version` to `v1.30.5` while the surrounding upgrade example targets Calico 3.28, and it combined the registry and image path in a way that does not match the official chart values. Updated the example to use `registry: quay.io`, `image: tigera/operator`, and `version: v1.34.0` from the Calico v3.28.0 Helm values.
- The best-practice statement about allowing no more than two Kubernetes minor versions of skew was too imprecise because Calico documents tested Kubernetes versions per Calico release. Reworded it to tell readers to stay within the tested Kubernetes versions for their Calico release.

## Review Notes
The Kubernetes upgrade sequencing guidance is accurate for kubeadm-managed clusters, where skipping minor versions is unsupported. The quick-reference script is syntactically valid for clusters using the operator-created `calico-system` namespace, but non-operator or older manifest installs may place `calico-node` in `kube-system`.
