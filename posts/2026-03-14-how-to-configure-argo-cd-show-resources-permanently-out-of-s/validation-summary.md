# Validation Summary: How to Configure Argo CD show resources permanently out-of-sync

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Cilium
- Kubernetes
- kubectl
- YAML

## Sources Consulted
- Argo CD Declarative Setup: Resource Exclusion/Inclusion: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#resource-exclusioninclusion
- Argo CD Compare Options: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium Operator documentation for registered CRDs, CiliumIdentity, and CiliumEndpoint garbage collection: https://docs.cilium.io/en/stable/internals/cilium_operator/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/

## Issues Found
- The original post did not configure Argo CD for permanently out-of-sync Cilium runtime resources. It showed unrelated Cilium Helm values instead. Replaced the Helm values with an `argocd-cm` `resource.exclusions` configuration for `CiliumIdentity` and `CiliumEndpoint` in the `cilium.io` API group, matching Argo CD's documented resource exclusion mechanism.
- The original commands applied Cilium Helm chart changes and rolled out the Cilium DaemonSet, which does not solve Argo CD comparison or discovery of Cilium-created resources. Replaced them with `kubectl apply` for `argocd-cm`, a restart of `argocd-application-controller`, and verification of the `resource.exclusions` key. Argo CD documentation notes that cached excluded objects may require a controller restart to disappear from the Application view.
- The original advanced Cilium Helm values contained questionable or unsupported fields for the documented Cilium Helm values, including nested `labels.exclude` and `bpf.ctTcpTimeout` / `bpf.ctAnyTimeout`. Removed those examples and replaced them with guidance to preserve existing Argo CD exclusions while adding Cilium-specific exclusions.
- The backup and verification sections focused on Helm/Cilium state rather than Argo CD state. Updated them to back up `argocd-cm`, verify the configured exclusion, hard-refresh an affected Argo CD Application, and confirm Cilium runtime CRDs still exist in Kubernetes.
- The troubleshooting section did not cover the actual Argo CD symptom. Added troubleshooting for stale Argo CD application views and corrected the configuration-not-applied advice to check `argocd-cm` and restart the Argo CD application controller.
- The flowchart and conclusion still referenced Helm-based configuration. Updated them to describe the Argo CD ConfigMap workflow and resource exclusions.

## Review Notes
Local `kubectl` was not installed in the workspace, so cluster commands could not be executed with `--help` or against a live cluster. The Kubernetes and Argo CD command patterns were checked against official Argo CD documentation and standard Kubernetes resource naming conventions. The post now uses Argo CD `resource.exclusions`, which is the correct system-level mechanism when the goal is to make Argo CD ignore whole classes of Cilium-created runtime resources.
