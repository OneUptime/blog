# Validation Summary: How to Implement Kyverno CLI Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kyverno CLI
- Kyverno ClusterPolicy resources
- Kubernetes YAML manifests
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- JMESPath

## Sources Consulted
- Kyverno CLI overview and installation documentation: https://kyverno.io/docs/subprojects/kyverno-cli/
- Kyverno CLI `apply` command reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Kyverno CLI `test` command reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_test/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno mutate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno GitHub release metadata for v1.18.1 assets: https://github.com/kyverno/kyverno/releases/tag/v1.18.1
- Kyverno v1.18.1 source types for CLI test and values schemas: https://github.com/kyverno/kyverno/tree/v1.18.1/cmd/cli/kubectl-kyverno/apis/v1alpha1
- kyverno/action-install-cli usage documentation: https://github.com/kyverno/action-install-cli

## Issues Found
- The manual binary download URL used a non-existent `kyverno-cli_linux_amd64.tar.gz` asset name. Updated it to the current versioned Linux x86_64 release asset pattern.
- The Go install note said Go 1.21+ was sufficient. Kyverno v1.18.1 declares Go 1.26/toolchain 1.26.2, so the note was updated.
- The CLI command overview and CI examples referenced `kyverno validate`, which is not available in Kyverno CLI v1.18.1. Removed those references and kept the workflow based on `kyverno test` and `kyverno apply`.
- The validation policy used deprecated `spec.validationFailureAction`. Moved the setting to `validate.failureAction`, which is the current documented location.
- The `kyverno-test.yaml` examples used the older/deprecated top-level `name` form and singular `resource` result field. Updated them to `apiVersion: cli.kyverno.io/v1alpha1`, `kind: Test`, `metadata.name`, and result-level `resources`.
- The mutation test used `patchedResource`; Kyverno v1.18.1 expects `patchedResources`. Updated the field name.
- The generate test did not include an expected generated resource. Added `generated-configmap.yaml` and referenced it with `generatedResource`.
- The values file lacked the current CLI values resource headers. Added `apiVersion: cli.kyverno.io/v1alpha1` and `kind: Values`.
- The GitHub Actions apply step used `--output json`, which writes mutated/generated resources rather than a JSON policy report. Updated it to `--policy-report --output-format json` and captured the nonzero apply exit so the JSON failure parsing runs.
- The GitLab CI example declared a JUnit artifact but did not create it. Updated the test command to emit `--output-format junit > test-results.xml`.
- The pinned Kyverno versions in CI examples were outdated. Updated them to v1.18.1.
- The expected `kyverno apply` output used an outdated rule count. Updated it to match Kyverno v1.18.1 behavior for the sample Pod policy.

## Review Notes
The corrected validation, mutation, and generate examples were tested locally with Kyverno CLI v1.18.1. The article still uses classic `ClusterPolicy` examples, which remain supported but are listed under deprecated ClusterPolicy documentation in current Kyverno docs as Kyverno continues adding CEL-based policy types.
