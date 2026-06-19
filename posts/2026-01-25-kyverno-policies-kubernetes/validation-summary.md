# Validation Summary: How to Configure Kyverno Policies for Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kyverno
- Helm
- kubectl
- Kyverno CLI
- YAML policy configuration

## Sources Consulted
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno mutate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno generate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno resource selection documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kyverno CLI apply reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Kyverno CLI test reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_test/
- Kyverno testing policies guide: https://kyverno.io/docs/guides/testing-policies/
- Kyverno policy type overview: https://kyverno.io/docs/policy-types/overview/
- Kyverno migration to CEL policies guide: https://kyverno.io/docs/guides/migration-to-cel/
- Kyverno 1.17 release announcement: https://kyverno.io/blog/2026/02/02/announcing-kyverno-release-1.17/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- The architecture diagram showed validation before mutation. Kubernetes mutating admission webhooks run before validating admission webhooks, and Kyverno mutation occurs before validation, so the diagram was corrected.
- The Helm high availability command used a generic `replicaCount` value that is not part of the current Kyverno HA installation example. It was replaced with per-controller replica settings from the official Helm installation documentation.
- The post described validate, mutate, and generate as the only Kyverno policy types. This was changed to "policy rule types" and a note was added about current CEL-based policy APIs being preferred for new policies in Kyverno 1.17+.
- Validation examples used deprecated policy-level `spec.validationFailureAction`. These were updated to rule-level `validate.failureAction`.
- The gradual rollout example used deprecated `spec.validationFailureActionOverrides`. It was updated to `validate.failureActionOverrides`.
- The resource limits description incorrectly tied limits to scheduling. It was revised because Kubernetes scheduling is driven by requests, while limits constrain runtime resource use.
- The resource limits validation example claimed all containers but omitted init containers. Optional `initContainers` validation was added.
- The privileged container example required a `securityContext` instead of allowing the field to be unset or false. It was updated to use optional anchors for `securityContext.privileged` and to include ephemeral containers.
- The `kubectl run --limits` example used a flag not present in the current official `kubectl run` reference. It was replaced with `--overrides` to create the pod with resource limits.

## Review Notes
The post still teaches legacy `ClusterPolicy`/`Policy` syntax because that is the structure of the original article. Kyverno 1.17+ marks these APIs as deprecated and recommends CEL-based `ValidatingPolicy`, `MutatingPolicy`, and `GeneratingPolicy` for new policies, so a future rewrite should migrate the examples fully to the CEL policy APIs.
