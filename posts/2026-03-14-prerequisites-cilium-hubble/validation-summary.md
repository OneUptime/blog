# Validation Summary: How to Use Pre-Requisites in Cilium Hubble

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Linux eBPF and kernel configuration
- kubectl
- Helm
- Prometheus Operator / kube-prometheus-stack
- cert-manager

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium Quick Installation / Cilium CLI install: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium Hubble setup / Hubble CLI install: https://docs.cilium.io/en/stable/observability/hubble/setup.html
- Cilium Kubernetes host-scope IPAM: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium IPAM modes: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes node debugging with kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Helm installation docs: https://helm.sh/docs/v3/intro/install/
- Helm repo add command reference: https://helm.sh/docs/helm/helm_repo_add/
- cert-manager kubectl installation docs: https://cert-manager.io/docs/installation/kubectl/

## Issues Found
- The post listed outdated kernel thresholds of 4.19.57+ for Cilium and 5.3+ for Hubble. Updated the guidance and diagram to match current Cilium documentation: Linux kernel 5.10+ or a documented distribution-equivalent kernel such as RHEL 8.10's 4.18 kernel.
- The BPF verification command read some paths from the debug container rather than the host filesystem and did not request an elevated debug profile. Updated the command to use `--profile=sysadmin`, check bpffs, and inspect host kernel configuration paths under `/host` where appropriate.
- The post used `kubectl version --short`, which is no longer listed in the current kubectl reference. Replaced it with `kubectl version`.
- The Kubernetes version guidance claimed v1.21 minimum and v1.24+ recommended. Updated it to direct readers to the Cilium version compatibility matrix and noted the current stable Cilium-supported Kubernetes versions.
- The CNI guidance said another CNI must always be removed before installing Cilium. Updated this to distinguish fresh installs from supported migration or chaining paths.
- The PodCIDR check said Cilium needs PodCIDRs allocated to nodes. Updated it to clarify that Kubernetes-assigned PodCIDRs are required for Kubernetes host-scope IPAM, while the default cluster-scope IPAM does not depend on them.
- The Cilium and Hubble CLI install snippets omitted architecture detection for arm64 and checksum verification from the official install commands. Updated both snippets to match current official commands more closely.
- The optional dependency section described cert-manager as recommended for production Hubble TLS management. Updated it to clarify that Hubble does not require cert-manager by default, though cert-manager can still be useful for workloads that need certificate management.
- The verification script checked for several common CNIs but omitted Canal, which was mentioned earlier in the guide. Added Canal to keep the check consistent.
- The conclusion repeated the outdated Kubernetes 1.24+ requirement and overstated optional dependencies. Updated it to match the corrected compatibility and dependency guidance.

## Review Notes
The guide is now technically valid as a prerequisite checklist, but it still intentionally stays broad. Future improvements could pin the guide to a specific Cilium release so the Kubernetes compatibility window does not need to be interpreted against the current stable documentation.
