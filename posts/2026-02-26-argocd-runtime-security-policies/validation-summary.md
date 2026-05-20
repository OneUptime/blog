# Validation Summary: How to Implement Runtime Security Policies with ArgoCD

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Argo CD Applications and automated sync
- Kubernetes Pod Security Standards and Pod Security Admission
- Kubernetes seccomp profiles
- Kubernetes AppArmor
- Kubernetes NetworkPolicy
- Falco and Falco Helm chart
- Falcosidekick
- Kyverno ClusterPolicy validation

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission namespace labels: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes seccomp reference: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes seccomp tutorial: https://kubernetes.io/docs/tutorials/security/seccomp/
- Kubernetes Security Context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes AppArmor tutorial: https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Argo CD automated sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Falco Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falco/values.yaml
- Falco chart package metadata: https://artifacthub.io/packages/helm/falcosecurity/falco
- Falco output channel documentation: https://falco.org/docs/concepts/outputs/channels/
- Falco gRPC deprecation documentation: https://falco.org/docs/developer-guide/grpc/grpc-config/
- Falco rule syntax documentation: https://falco.org/docs/concepts/rules/basic-elements/
- Falco condition syntax documentation: https://falco.org/docs/concepts/rules/conditions/
- Falcosidekick Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falcosidekick/values.yaml
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The Pod Security Standards description claimed the `restricted` profile requires a read-only root filesystem. Kubernetes PSS Restricted does not require `readOnlyRootFilesystem`, so that bullet was removed.
- The "ApplicationSet" section used an Argo CD `Application`, not an `ApplicationSet`. The heading and lead-in were corrected to match the manifest.
- The Falco Helm example used chart version `4.2.0`, the legacy `ebpf` driver, deprecated gRPC output settings, and the deprecated `rules_file` key. The example now uses chart `8.0.5`, `modern_ebpf`, HTTP output to Falcosidekick, and `rules_files`.
- The seccomp section implied a ConfigMap directly deploys a `Localhost` seccomp profile. Kubernetes requires localhost profiles to exist on each node under the kubelet seccomp root, so the text now states that the profile must be distributed to every node.
- The `apps/v1` Deployment example was missing the required `spec.selector` and matching pod template labels. These were added.
- The NetworkPolicy example selected namespaces by a non-standard `name` label. It now uses the built-in `kubernetes.io/metadata.name` namespace label.
- The DNS egress rule allowed UDP/53 to every namespace and omitted TCP/53. It now targets kube-dns in `kube-system` and allows both UDP and TCP port 53.
- The Kyverno policy used the deprecated top-level `spec.validationFailureAction`. Each validate rule now uses `validate.failureAction: Enforce`.
- The Falcosidekick response ConfigMap used non-current keys `kubernetesPolicyReport` and `minimumPriority`. These were changed to `policyreport` and `minimumpriority`.

## Review Notes
- The examples are valid as illustrative manifests, but production use still requires environment-specific tuning, especially Falco rule noise, namespace labels for NetworkPolicy targets, and a reliable mechanism for distributing seccomp profiles to each node.
