# Validation Summary: How to Enable OPA Gatekeeper Policies with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- OPA Gatekeeper
- Kubernetes
- `kubectl`
- Rego
- Kubernetes admission control

## Sources Consulted
- Gatekeeper Constraint Templates: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper Handling Constraint Violations: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper Admission Review Input: https://open-policy-agent.github.io/gatekeeper/website/docs/input
- Gatekeeper Policy Library: https://open-policy-agent.github.io/gatekeeper/website/docs/library/
- Gatekeeper Library Required Resources: https://open-policy-agent.github.io/gatekeeper-library/website/validation/containerresources
- Gatekeeper Library Privileged Container: https://open-policy-agent.github.io/gatekeeper-library/website/validation/privileged-containers/
- Gatekeeper Library Allowed Images (`allowedreposv2`): https://open-policy-agent.github.io/gatekeeper-library/website/validation/allowedreposv2/
- Gatekeeper releases: https://github.com/open-policy-agent/gatekeeper/releases
- Portainer kubectl shell: https://docs.portainer.io/user/kubernetes/kubectl
- Portainer add a new application using code: https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply
- Kubernetes Ephemeral Containers: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/

## Issues Found
- The introduction said any Kubernetes API request must pass Gatekeeper policy checks. Gatekeeper evaluates admission requests, not every API verb, so I corrected the explanation to cover create and update admission requests.
- The install command pinned Gatekeeper to `v3.14.0`, which was outdated as of May 1, 2026. I updated it to `v3.22.2`, the latest stable release listed on the official releases page on April 27, 2026.
- The `ConstraintTemplate` examples used `templates.gatekeeper.sh/v1beta1`. Current Gatekeeper documentation recommends `templates.gatekeeper.sh/v1`, which also requires a structural schema, so I updated the templates and added the required `openAPIV3Schema`.
- The resource-limits policy claimed to cover all containers but only checked `spec.containers`. I updated it to check both app containers and `initContainers`, and adjusted the section title because ephemeral containers cannot define `resources`.
- The privileged-container policy only checked `spec.containers`. I updated it to also check `initContainers` and `ephemeralContainers`, which can also set `securityContext.privileged`.
- The image-registry section defined a `Constraint` but not the required `ConstraintTemplate`, so it would not work as written. I replaced it with a self-contained `K8sAllowedReposv2` template and matching constraint using the current `allowedImages` parameter format.
- The original allowed-repository examples used bare prefixes such as `registry.mycompany.com`, which can be bypass-prone with prefix matching. I changed them to `allowedImages` patterns such as `registry.mycompany.com/*` and `gcr.io/myproject/*`, matching the current official `allowedreposv2` guidance.
- The Portainer instructions referenced a kubectl shell icon and a vague Applications editor path. I corrected these to the documented flows: `kubectl shell` from the menu, or `Applications` > `Create from code` > `Manifest`.
- The testing command used `nginx`, which would also violate the allowed-images policy once that policy is enabled. I changed the example image to `registry.mycompany.com/nginx` so it aligns with the allowed-images constraint and isolates the resource-limit denial scenario.
- The audit/enforce section incorrectly described `warn` as audit mode. I corrected it to `dryrun` for audit mode and clarified that `warn` allows the request while returning an admission warning.

## Review Notes
- `status.totalViolations` is populated by Gatekeeper's audit controller, so it may remain empty until an audit run has completed.
- The workspace did not have `kubectl` installed locally, so command syntax was verified against the official Kubernetes command reference instead of local `--help` output.
- The post is technically valid after the fixes, but the pinned Gatekeeper version should be refreshed periodically because the install manifest URL is version-specific.
