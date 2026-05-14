# Validation Summary: How to Implement Zero-Trust GitOps with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller, kustomize-controller, and notification-controller
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Standards
- Kyverno image verification
- Cosign keyless signatures
- SOPS and age encryption
- kubectl, gpg, jq, and shell scripting

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Kyverno image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod Security Standards namespace label documentation: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The GitRepository verification example used `spec.verify.provider: github` and described GPG or Sigstore commit verification. Flux GitRepository commit verification accepts `mode` and `secretRef` for PGP public keys, so the unsupported field was removed and the comment was changed to PGP commit signatures.
- The least-privilege RBAC example created the impersonated service account in `production` while the Flux Kustomization using `serviceAccountName` lived in `flux-system`. Flux impersonates the service account by name from the Kustomization namespace, so the service account and RoleBinding subject were changed to `flux-system`.
- The SOPS example was labeled as "before encryption" even though it showed encrypted `ENC[...]` values. The comment was changed to "after encryption" and clarified that the encrypted form is what should be committed.
- The DNS NetworkPolicy used separate `namespaceSelector` and `podSelector` peers, which means "pods in kube-system OR matching pods in the policy namespace." The selectors were combined into a single peer so it means kube-dns pods in kube-system.
- The source-controller NetworkPolicy claimed to allow only specific Git hosts, but standard Kubernetes NetworkPolicy cannot restrict egress by DNS hostname. The comment was corrected to say it allows Git transport ports and that host restriction requires CNI-specific FQDN policy or an egress firewall.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1`, but the current Flux Alert and Provider examples use `notification.toolkit.fluxcd.io/v1beta3`. Both API versions in the snippet were updated.

## Review Notes
- The Pod Security Standards example pins `enforce-version=v1.28`; this is valid for clusters that support that policy version, but future readers may want to pin to their cluster minor version or to `latest` depending on their upgrade policy.
- The Kyverno policy is structurally aligned with the documented `verifyImages` rule, but production deployments should tune signing identities to exact workflow subjects rather than broad organization-level wildcards.
- Local `kubectl`, `flux`, and `sops` binaries were not installed in the review environment, so CLI validation was performed against official documentation rather than local `--help` output.
