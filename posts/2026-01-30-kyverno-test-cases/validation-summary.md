# Validation Summary: How to Create Kyverno Test Cases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kyverno
- Kyverno CLI
- Kubernetes policies and resources
- YAML
- GitHub Actions
- GitLab CI
- pre-commit

## Sources Consulted
- Kyverno CLI documentation: https://kyverno.io/docs/subprojects/kyverno-cli/
- Kyverno `test` command reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_test/
- Kyverno `apply` command reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Kyverno validation rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno release support documentation: https://kyverno.io/docs/installation/releases/
- Kyverno GitHub releases: https://github.com/kyverno/kyverno/releases
- GitHub Actions `upload-artifact` documentation: https://github.com/actions/upload-artifact

## Issues Found
- The Kyverno test manifests used the pre-1.11 simplified schema. Updated examples to use the current `apiVersion: cli.kyverno.io/v1alpha1`, `kind: Test`, and `metadata.name` structure.
- The test result examples used singular `resource`. Updated them to the current `resources` list form used by the Kyverno CLI test schema.
- Mutation test examples used `patchedResource`. Updated them to `patchedResources`, which is the current field for mutate rule output comparisons.
- The examples omitted the `warn` expected result. Updated the basic test comment to include `warn`.
- Validation policies used deprecated `spec.validationFailureAction`. Moved enforcement to `spec.rules[*].validate.failureAction`.
- The command for running a specific test file passed the YAML file path directly. Updated it to use `kyverno test <directory> --file-name kyverno-test.yaml`, matching the current CLI interface.
- The generation policy attempted to exclude Namespace objects with `exclude.resources.namespaces`, which does not filter a Namespace resource by its own name. Replaced it with preconditions on `request.object.metadata.name`.
- The variables file examples omitted the current `Values` API wrapper. Added `apiVersion: cli.kyverno.io/v1alpha1`, `kind: Values`, and `metadata.name`.
- The variables example used a deny-based validate rule but expected `pass` for the allowed resource. Updated the expected result to `skip`, matching Kyverno test behavior for deny rules when the deny condition is not met.
- CI examples installed Kyverno CLI v1.11.0. Updated them to v1.18.0, the supported Kyverno release documented during review.
- CI and pre-commit examples used `kyverno validate`, which is not present in the current Kyverno CLI reference. Removed those commands and kept `kyverno test` as the validation gate.
- The GitHub Actions example used deprecated `actions/upload-artifact@v3`. Updated it to `actions/upload-artifact@v4`.
- The GitHub Actions artifact upload referenced `test-results/` without creating it. Updated the test step to write a JUnit output file into that directory.
- Debugging examples used `kyverno apply -o yaml` as if `-o` selected stdout YAML formatting. Updated those commands to use `--detailed-results` for diagnostics and `-o actual-output.yaml` for writing mutated output.

## Review Notes
Kyverno CLI v1.18.0 was downloaded from the official GitHub release and its `version`, `test --help`, and `apply --help` output were checked during review. ClusterPolicy is documented under a deprecated section in the current Kyverno docs, but the examples remain technically valid when updated to current rule-level settings.
