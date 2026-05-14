# Validation Summary: How to Test Policy Compliance in GitOps Pipelines with Flux CD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kyverno
- OPA / Rego
- Gatekeeper
- GitHub Actions
- kind
- Helm
- kubectl
- PolicyReport / ClusterPolicyReport resources

## Sources Consulted
- Kyverno CLI `test` reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_test/
- Kyverno policy reports guide: https://kyverno.io/docs/guides/reports/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- OPA policy testing documentation: https://www.openpolicyagent.org/docs/policy-testing
- OPA Rego `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- OPA v1.0 upgrade guidance: https://www.openpolicyagent.org/docs/v0-upgrade
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux `install` command reference: https://fluxcd.io/flux/cmd/flux_install/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- helm/kind-action documentation: https://github.com/marketplace/actions/kind-cluster
- Bitnami kubectl container image listing: https://bitnami.com/stack/kubectl/containers

## Issues Found
- The prerequisites listed Kubernetes v1.25+, which is below the supported floor documented for current Flux CD releases. Updated it to v1.30+ for current Flux CD releases.
- The Kyverno test manifest was named `test.yaml`, but `kyverno test` defaults to discovering `kyverno-test.yaml`. Updated the directory structure and example filename.
- The Rego unit tests used pre-OPA-1.0 rule syntax and shadowed the `input` document with a local variable. Updated the examples to use Rego v1-compatible `if` syntax, added `import rego.v1`, and renamed the local test input variable.
- The Flux compliance gate used a CronJob while describing a deployment gate. A scheduled CronJob is not a reliable one-shot health gate for a Flux Kustomization. Changed the example to a `batch/v1` Job and updated the Flux health check to target the Job.
- The compliance audit container used a Kyverno CLI image while the script only required `kubectl` and assumed `jq` was available. Changed the example to a kubectl image and rewrote the audit command to use kubectl JSONPath instead of `jq`.
- The compliance report script referenced Kyverno's deprecated `spec.validationFailureAction` field. Updated the custom column to read rule-level `spec.rules[*].validate.failureAction`.

## Review Notes
- The examples remain illustrative and assume the referenced policies, RBAC, service accounts, and test fixtures exist in the user's repository.
- The report-generation script still uses `jq`; users running it locally or in CI need `jq` installed.
- The OPA example is generic Rego policy testing. Gatekeeper ConstraintTemplate tests may need an admission-review-shaped input object depending on how the policy is authored.
