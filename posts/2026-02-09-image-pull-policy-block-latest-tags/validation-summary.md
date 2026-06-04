# Validation Summary: How to Implement Image Pull Policy Restrictions to Block Latest Tags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ValidatingAdmissionPolicy and ValidatingAdmissionPolicyBinding
- Kubernetes container image tags, digests, and imagePullPolicy
- Kubernetes CEL validation expressions
- Kyverno ClusterPolicy validation rules
- Harbor tag immutability and vulnerability scanning settings
- Docker Content Trust / Notary
- GitLab CI image tagging
- Kubernetes audit/log monitoring concepts

## Sources Consulted
- Kubernetes documentation: Validating Admission Policy, https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes API reference: ValidatingAdmissionPolicy admissionregistration.k8s.io/v1, https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-v1/
- Kubernetes documentation: Images, image pull policy, tags, and digests, https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes documentation: Common Expression Language in Kubernetes, https://kubernetes.io/docs/reference/using-api/cel/
- Kyverno documentation: Validate rules and failureAction deprecation note, https://release-1-13-0.kyverno.io/docs/writing-policies/validate/
- Kyverno policy library: Disallow Latest Tag, https://release-1-13-0.kyverno.io/policies/best-practices/disallow-latest-tag/disallow-latest-tag/
- Harbor documentation: Tag Immutability Rules, https://goharbor.io/docs/1.10/working-with-projects/working-with-images/create-tag-immutability-rules/
- Harbor documentation: Project Configuration and vulnerability scanning settings, https://goharbor.io/docs/main/working-with-projects/project-configuration/
- Docker documentation: Content trust in Docker, https://docs.docker.com/engine/security/trust/
- Docker CLI reference: docker trust sign, https://docs.docker.com/reference/cli/docker/trust/sign/

## Issues Found
- The prerequisite said Kubernetes 1.26+ for `admissionregistration.k8s.io/v1` `ValidatingAdmissionPolicy`. Updated it to Kubernetes 1.30+ because the official docs mark the v1 API as stable in Kubernetes v1.30.
- The first `ValidatingAdmissionPolicy` matched both Pods and `apps/v1` workload controllers but used `object.spec.containers`, which only applies to Pods. Split it into separate Pod and workload-controller policies using `object.spec.containers` for Pods and `object.spec.template.spec.containers` for Deployments, StatefulSets, DaemonSets, and ReplicaSets.
- The original explicit-tag checks used `c.image.contains(':')`, which incorrectly treats registry ports such as `localhost:5000/app` as image tags. Replaced those checks with a tag regex that requires a real final image tag segment and still blocks `:latest`.
- The semantic-version example used `c.image.split(':')[1]`, which breaks for registry hosts with ports. Replaced it with a whole-image regex that validates the final tag as a semantic version.
- The mutable-tag policy used multiple `endsWith()` checks, which did not handle tag-plus-digest references consistently. Replaced it with a single regex covering the blocked mutable tags.
- The digest deployment example used `sha256:abc123...`, which is not a valid SHA-256 digest. Replaced it with a 64-character hexadecimal placeholder digest.
- The test output said "admission webhook denied" even though `ValidatingAdmissionPolicy` is evaluated by the API server, not a webhook. Updated the expected error text.
- The Kyverno example used deprecated policy-level `spec.validationFailureAction`. Updated it to per-rule `validate.failureAction: Enforce`, and changed the latest-tag rules to the documented `foreach` pattern so regular, init, and ephemeral containers are checked.
- The Kyverno approved-registry example used a pipe-delimited string inside one pattern value, which is not valid Kyverno pattern syntax for alternatives. Replaced it with `anyPattern`.
- The Harbor example included a non-documented `prevent_latest` project metadata key. Replaced it with documented tag immutability rule settings and kept the vulnerability scanning controls as prose.
- Later `ValidatingAdmissionPolicyBinding` examples referenced the old `block-latest-tag` policy name after the policy split. Updated them to reference `block-latest-tag-pods`.

## Review Notes
All fenced YAML examples were parsed locally with PyYAML after editing. `kubectl` is not installed in this workspace, so Kubernetes API-server validation was checked against official documentation rather than a live cluster.
