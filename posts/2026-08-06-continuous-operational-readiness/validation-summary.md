# Validation Summary: Make Operational Readiness Continuous

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes `ValidatingAdmissionPolicy` and `ValidatingAdmissionPolicyBinding`
- Common Expression Language (CEL)
- OPA Gatekeeper constraint templates, constraints, admission enforcement, shift-left evaluation, and audit
- Backstage Software Catalog and catalog entity descriptors
- Service-level objectives (SLOs), service-level indicators (SLIs), RPO, and RTO
- Policy as code, CI validation, drift detection, evidence expiry, and operational drills
- Google Site Reliability Engineering launch-readiness practices
- NIST Secure Software Development Framework (SSDF)

## Sources Consulted

- [Kubernetes: Policies](https://kubernetes.io/docs/concepts/policy/)
- [Kubernetes: Validating Admission Policy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/)
- [Kubernetes API: ValidatingAdmissionPolicy v1](https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-v1/)
- [Kubernetes API: ValidatingAdmissionPolicyBinding v1](https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-binding-v1/)
- [Kubernetes API: MatchResources v1](https://kubernetes.io/docs/reference/kubernetes-api/definitions/match-resources-v1-admissionregistration/)
- [Gatekeeper: Introduction](https://open-policy-agent.github.io/gatekeeper/website/docs/)
- [Gatekeeper: How to use Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/)
- [Gatekeeper: Handling Constraint Violations](https://open-policy-agent.github.io/gatekeeper/website/docs/violations/)
- [Gatekeeper: Audit](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Gatekeeper: The gator CLI](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/)
- [Gatekeeper: Enforcement points](https://open-policy-agent.github.io/gatekeeper/website/docs/enforcement-points/)
- [Backstage: Software Catalog](https://backstage.io/docs/features/software-catalog/)
- [Backstage: Descriptor Format of Catalog Entities](https://backstage.io/docs/features/software-catalog/descriptor-format/)
- [Google SRE Book: Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/)
- [NIST: Secure Software Development Framework](https://csrc.nist.gov/projects/ssdf)
- [NIST SP 800-218: Secure Software Development Framework Version 1.1](https://csrc.nist.gov/pubs/sp/800/218/final)

## Issues Found

No technical issues found.

## Review Notes

- All YAML snippets parsed successfully, and the JSON evidence envelope is valid JSON.
- The Kubernetes admission resources use the current `admissionregistration.k8s.io/v1` API. `ValidatingAdmissionPolicy` has been stable since Kubernetes v1.30, so the post's advice to test against the exact supported cluster version is appropriate.
- The CEL expression for testing label-map membership matches the Kubernetes documentation. The binding's `namespaceSelector` evaluates labels on the namespace for a namespaced Deployment, as described in the post.
- Gatekeeper terminology matches the current v3.23.x documentation: constraints support `deny`, `dryrun`, and `warn` admission actions, while audit periodically evaluates existing resources and reports violations. Constraint status can cap individual violation records, so monitoring audit completion and truncated status results is valid advice.
- Backstage's standard fields vary by entity kind; the post correctly qualifies its recommendation with "where they fit" and correctly advises namespacing organization-specific annotations rather than using the reserved `backstage.io/` prefix.
