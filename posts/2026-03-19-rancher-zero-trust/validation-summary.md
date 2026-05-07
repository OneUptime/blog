# Validation Summary: How to Implement Zero Trust Security in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Istio
- Kubernetes NetworkPolicy
- Kubernetes RBAC
- Kubernetes Service Accounts
- Falco
- Sigstore Cosign
- Sigstore policy-controller
- External Secrets Operator
- kube-bench

## Sources Consulted
- Rancher Istio documentation: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/istio/istio.html
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes projected service account token documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Falco rules documentation: https://falco.org/docs/concepts/rules/
- Falco default rules reference: https://falco.org/docs/reference/rules/default-rules/
- Falco Helm chart documentation: https://github.com/falcosecurity/charts/blob/master/charts/falco/README.md
- Falcosidekick Helm chart documentation: https://github.com/falcosecurity/charts/blob/master/charts/falcosidekick/README.md
- Sigstore Cosign installation documentation: https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore signing with self-managed keys: https://docs.sigstore.dev/cosign/key_management/signing_with_self-managed_keys/
- Sigstore signature verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore policy-controller overview: https://docs.sigstore.dev/policy-controller/overview/
- External Secrets Operator getting started guide: https://external-secrets.io/main/introduction/getting-started/
- kube-bench upstream repository and job manifest: https://github.com/aquasecurity/kube-bench and https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml

## Issues Found
- The Rancher prerequisite implied all newer Rancher versions behave the same as Rancher v2.5. I added a version caveat because Rancher-Istio is deprecated starting in Rancher v2.12, and newer deployments should use the supported Istio distribution for that Rancher version.
- The Step 1 Gatekeeper `ConstraintTemplate` example was not valid as written for `templates.gatekeeper.sh/v1` and did not actually create or reliably enforce a default deny policy for new namespaces. I replaced it with an accurate GitOps example that provisions the namespace and default deny `NetworkPolicy` together.
- The Istio `PeerAuthentication` and `AuthorizationPolicy` manifests used the older `security.istio.io/v1beta1` API version. I updated both to `security.istio.io/v1`, which is what current Istio documentation uses.
- The Istio installation steps claimed Rancher exposes an “mTLS strict mode” install toggle. I removed that unsupported UI claim and kept strict mTLS enforcement in the explicit `PeerAuthentication` step, which is the documented mechanism.
- The mesh-wide mTLS section assumed `istio-system` without qualification. I clarified that the policy must be applied in Istio’s root namespace, which is commonly `istio-system`.
- The authorization policy used `principals` even though current Istio docs recommend `serviceAccounts` for Kubernetes service account matching. I updated the example to use `serviceAccounts` directly.
- The Falco custom rule referenced `approved_ips`, which was never defined, so the example was not self-contained. I added a concrete list definition and kept the rule aligned with Falco’s documented rule structure.
- The Cosign installation command used the older `github.com/sigstore/cosign/v2/...` module path. I updated it to the current `v3` path and added `cosign generate-key-pair`, which is required before signing with `cosign.key`.
- The image verification section claimed to enforce image verification but the Gatekeeper example only restricted image registry prefixes and did not verify signatures. I replaced it with a Sigstore policy-controller `ClusterImagePolicy` example, plus the required namespace opt-in label.
- The External Secrets installation command omitted the required Helm repository setup. I added `helm repo add external-secrets https://charts.external-secrets.io` and `helm repo update`.
- The scheduled `kube-bench` CronJob was not runnable as written because it omitted `hostPID` and the host path mounts used by the upstream manifest. I replaced it with a working CronJob shape based on the official `job.yaml`, pinned the image version, and removed the undeclared `security` namespace so the example is self-contained.

## Review Notes
- The post is now technically accurate against the current official documentation reviewed on 2026-05-07.
- The checklist still mentions audit logging, but the post does not yet include a concrete Rancher or Kubernetes audit logging configuration example.
- The scheduled `kube-bench` example is valid, but a single CronJob instance will only inspect the node where that pod runs. Full node-by-node coverage would require an execution strategy that deliberately targets all relevant nodes or control-plane hosts.
