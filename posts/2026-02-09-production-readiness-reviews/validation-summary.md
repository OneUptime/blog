# Validation Summary: How to Build Production Readiness Reviews for Kubernetes Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes probes, resource requests and limits, PodDisruptionBudgets, and NetworkPolicies
- Open Policy Agent Rego
- Conftest
- Kyverno ClusterPolicies
- GitHub Actions
- GitLab CI
- kubeconform
- Bash, kubectl, jq

## Sources Consulted
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Pod Disruptions - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kubectl apply reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply
- Conftest documentation - https://www.conftest.dev/
- Conftest options documentation - https://www.conftest.dev/options/
- Open Policy Agent Rego keyword documentation - https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- Kyverno installation documentation - https://kyverno.io/docs/installation/
- Kyverno validate rules documentation - https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno JMESPath documentation - https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Kyverno Require PodDisruptionBudget sample policy - https://kyverno.io/policies/other/require-pdb/require-pdb/
- Kyverno Require Pod Probes sample policy - https://kyverno.io/policies/best-practices/require-probes/require-probes/
- actions/checkout repository - https://github.com/actions/checkout
- kubeconform documentation - https://kubeconform.mandragor.org/docs/overview/

## Issues Found
- The Conftest Linux install URL used a `latest/download` asset name that no longer exists for the current release. Updated it to the current versioned release asset format for Conftest 0.68.2.
- The Rego policy used pre-Rego-v1 partial set syntax and had unsafe negated probe checks under current Conftest/OPA behavior. Updated the rules to `deny contains msg if` / `warn contains msg if`, bound each container before negated checks, and verified the policy with Conftest 0.68.2.
- The Kyverno install command used an unpinned `latest` release URL. Updated it to the current tagged Kyverno 1.18.1 `install.yaml` asset, matching Kyverno's documented guidance to use tagged release manifests.
- The Kyverno policy used deprecated top-level `spec.validationFailureAction`. Moved `failureAction: Enforce` into each validate rule.
- The Kyverno container checks used list patterns that did not reliably validate every container. Replaced them with `foreach` validation over `request.object.spec.template.spec.containers[]`.
- The Kyverno PodDisruptionBudget rule denied every Deployment create/update operation instead of checking for a matching PDB. Replaced it with a Kyverno `context.apiCall` lookup and deny condition based on the matching PDB count.
- The GitHub Actions workflow used `actions/checkout@v3`. Updated it to `actions/checkout@v4`.
- The GitHub Actions workflow used kubeval, which is outdated for current Kubernetes schema validation workflows. Replaced it with kubeconform 0.7.0 and `kubeconform -strict`.

## Review Notes
- The custom Bash validation script is intentionally simple, but it relies on `grep` and assumes one manifest layout and naming convention. It is acceptable as an illustrative example, but a production implementation should parse YAML structurally.
- The report script only checks the first container in each Deployment. This matches the post's lightweight reporting example, but a production report should iterate over all containers.
