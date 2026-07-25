# Validation Summary: Restrict Image Registries and Tags Without Gatekeeper False Positives

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OPA Gatekeeper
- Gatekeeper Policy Library
- Kubernetes
- Container image registries, tags, and digests
- kubectl

## Sources Consulted
- [Gatekeeper Library: Allowed Images (`K8sAllowedReposv2`)](https://open-policy-agent.github.io/gatekeeper-library/website/validation/allowedreposv2/)
- [Gatekeeper Library: Allowed Repositories (`K8sAllowedRepos`)](https://open-policy-agent.github.io/gatekeeper-library/website/validation/allowedrepos/)
- [Gatekeeper Library: Disallow tags (`K8sDisallowedTags`)](https://open-policy-agent.github.io/gatekeeper-library/website/validation/disallowedtags/)
- [Gatekeeper Library: Image Digests (`K8sImageDigests`)](https://open-policy-agent.github.io/gatekeeper-library/website/validation/imagedigests/)
- [Gatekeeper: Handling Constraint Violations](https://open-policy-agent.github.io/gatekeeper/website/docs/violations/)
- [Gatekeeper: Validating Workload Resources using ExpansionTemplate](https://open-policy-agent.github.io/gatekeeper/website/docs/expansion/)
- [Gatekeeper: How to use Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/)
- [Kubernetes: Images](https://kubernetes.io/docs/concepts/containers/images/)
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Docker: docker image tag](https://docs.docker.com/reference/cli/docker/image/tag/)

## Issues Found
- The description of `K8sDisallowedTags` said every image without a tag is a violation. Its implementation considers a colon in the final path component sufficient for this check, so a digest-only reference does not trigger the no-tag rule. The text now accurately limits the claim to plain references with neither a tag nor a digest.
- The post did not account for the template's end-of-string suffix match when checking prohibited tags. A tag-plus-digest reference such as `api:latest@sha256:<digest>` does not trigger the `latest` rule because the image string ends with the digest. A caveat now explains the behavior and recommends a custom policy when the tag text itself must be prohibited.
- The JSONPath inventory command printed the namespace once per Pod, so images after the first container could appear without a namespace and be misassociated. It now uses a supported Go template that prints the namespace alongside every regular, init, and ephemeral container image.

## Review Notes
- The Constraint API versions, kinds, parameter names, match fields, and `deny`, `dryrun`, and `warn` enforcement actions are current in the consulted Gatekeeper documentation.
- The Gatekeeper Library templates inspect regular, init, and ephemeral containers.
- `ExpansionTemplate` remains a beta Gatekeeper feature and is enabled by default in current Gatekeeper documentation; expansion accuracy depends on how closely the generated Pod represents the controller-created Pod.
