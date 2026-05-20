# Validation Summary: How to Block Deployment of Vulnerable Images with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD resource hooks and notifications
- Kubernetes Jobs and admission control
- Trivy container image scanning
- OPA Gatekeeper ConstraintTemplates and constraints
- Kyverno ClusterPolicy verifyImages rules and PolicyExceptions
- Cosign vulnerability attestations

## Sources Consulted
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD notifications trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Kyverno verifyImages overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno PolicyException documentation: https://kyverno.io/docs/guides/exceptions/
- Kyverno JMESPath time functions documentation: https://release-1-12-0.kyverno.io/docs/writing-policies/jmespath/
- Trivy image command reference: https://trivy.dev/docs/dev/references/configuration/cli/trivy_image/
- Trivy Cosign vulnerability attestation documentation: https://trivy.dev/docs/v0.61/guide/supply-chain/attestation/vuln/
- Cosign vulnerability predicate API reference: https://pkg.go.dev/github.com/sigstore/cosign/v3/pkg/cosign/attestation
- OneUptime website: https://oneuptime.com

## Issues Found
- The Gatekeeper Rego only read `input.review.object.spec.containers`, but the constraint matched Deployments, StatefulSets, and DaemonSets where containers live under `spec.template.spec.containers`. I added helper rules to read Pod and controller container paths, including init containers.
- The Gatekeeper tag check used `contains(image, ":")`, which incorrectly treats registry ports as image tags. I replaced it with a regex that checks for a tag after the image path.
- The Gatekeeper example declared `maxCritical` and `maxHigh` parameters but never used them. I removed those unused parameters and clarified that this Gatekeeper example enforces image reference policy rather than directly querying vulnerability data.
- The Kyverno attestation example used `type` under `attestations`; Kyverno examples use `predicateType` for attestation predicates. I changed it to `predicateType`.
- The Kyverno condition referenced non-existent `scan_timestamp` and `result` variables. I changed the freshness check to use `metadata.scanFinishedOn` and `time_diff`, and changed the critical vulnerability count to read Trivy's Cosign vulnerability predicate under `scanner.result.Results`.
- The external scanner hook called `crane digest` from `alpine:latest` without installing `crane`. I removed that dependency and passed the image reference to the external API with `curl --data-urlencode`.
- The PolicyException example used `apiVersion: kyverno.io/v1`, which is not the correct API version for the shown legacy PolicyException shape. I changed it to `kyverno.io/v2beta1`.

## Review Notes
The post is technically valid after the fixes. The Kyverno `ClusterPolicy` API is marked as deprecated in current Kyverno documentation in favor of newer policy types, but it remains documented and usable; a future refresh could migrate the image verification example to `ImageValidatingPolicy`.
