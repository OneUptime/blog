# Validation Summary: Roll Out Kubernetes Image-Signature Enforcement Safely

## Status
validated

## Post Type
Technical guide / security rollout guide

## Technologies Covered
- Kubernetes Pods, container images, and admission subresources
- Kubernetes mutating and validating admission webhooks
- Kyverno `ImageValidatingPolicy`
- Kyverno legacy `ClusterPolicy` `verifyImages` rules
- Kyverno `PolicyReport` and `PolicyException` resources
- OCI image digests, signatures, attestations, and SBOMs
- `kubectl` and `jq`

## Sources Consulted
- [Kyverno ImageValidatingPolicy documentation](https://kyverno.io/docs/policy-types/image-validating-policy/)
- [Kyverno policy-type overview and deprecation schedule](https://kyverno.io/docs/policy-types/overview/)
- [Kyverno 1.17 release announcement](https://kyverno.io/blog/2026/02/02/announcing-kyverno-release-1.17/)
- [Kyverno v1.18.2 release notes](https://github.com/kyverno/kyverno/releases/tag/v1.18.2)
- [Kyverno legacy verifyImages overview](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/)
- [Kyverno policy reports](https://kyverno.io/docs/guides/reports/)
- [Kyverno policy exceptions](https://kyverno.io/docs/guides/exceptions/)
- [Kyverno installation customization and filters](https://kyverno.io/docs/installation/customization/)
- [Kyverno ephemeral-container enforcement issue #16947](https://github.com/kyverno/kyverno/issues/16947) and [fix PR #16961](https://github.com/kyverno/kyverno/pull/16961)
- [Kyverno `mutateDigest` fix PR #16815](https://github.com/kyverno/kyverno/pull/16815), [`verifyDigest` fix PR #16817](https://github.com/kyverno/kyverno/pull/16817), and [`required` fix PR #16853](https://github.com/kyverno/kyverno/pull/16853)
- [Kyverno v1.18 legacy multi-container verification fix PR #16218](https://github.com/kyverno/kyverno/pull/16218)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes admission webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes ephemeral containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [Kubernetes Pod API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes static Pods](https://kubernetes.io/docs/concepts/workloads/pods/static-pods/) and [API-server bypass risks](https://kubernetes.io/docs/concepts/security/api-server-bypass-risks/)
- [Kubernetes image volumes](https://kubernetes.io/docs/tasks/configure-pod-container/image-volumes/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [jq 1.6 manual](https://jqlang.org/manual/v1.6/)

## Issues Found
1. **Inventory command scope was overstated.** The command correctly lists images from ordinary, init, and ephemeral containers, but it does not list OCI image-volume references from `.spec.volumes[].image.reference`. Changed “declared image references” to “declared container image references” so the description matches the command.
2. **Container-restart admission wording was too absolute.** A kubelet-managed restart does not re-admit the Pod specification or re-run image admission checks, although Kubernetes can still update Pod status. Reworded the statement to describe the relevant image-policy behavior precisely.
3. **Kyverno version milestones were off by one release.** `ImageValidatingPolicy` reached the stable `policies.kyverno.io/v1` API in Kyverno 1.17, and `ClusterPolicy` was officially marked deprecated in 1.17; 1.18 moved legacy policy types to critical-fixes-only maintenance. Corrected both claims. Also described v1.18.2 as the latest **stable** release because v1.19.0 release candidates existed on the validation date.
4. **`ImageValidatingPolicy` exception scope needed a safety clarification.** A matching CEL-style `PolicyException` skips the referenced policy for the entire resource, not only one image. Updated the guidance to require every image covered by the skipped policy to be an approved immutable digest.

## Review Notes
- The `kubectl`/`jq` pipeline is syntactically correct and safely handles absent init-container and ephemeral-container arrays.
- The post correctly distinguishes declared image references from runtime-reported `ContainerStatus.imageID` values, which are not guaranteed to be portable registry digests.
- Matching `pods` does not match Pod subresources. Ephemeral-container admission requires an `UPDATE` rule for `pods/ephemeralcontainers` (or an appropriate subresource wildcard).
- Kyverno v1.18.2 was the latest stable release on 2026-08-12 and includes the legacy `verifyImages` multi-container required-verification fix. It does not contain the later upstream fixes for the `ImageValidatingPolicy` `mutateDigest`, `verifyDigest`, and `required` settings, and the ephemeral-container enforcement gap remained open. The post correctly warns readers not to rely on those paths until using and testing a release that contains the fixes.
- The explanations of mutation ordering, validating the final admitted object, webhook `failurePolicy`, static Pods, report result values, installation-level exclusions, and exception namespace behavior agree with the cited documentation.
