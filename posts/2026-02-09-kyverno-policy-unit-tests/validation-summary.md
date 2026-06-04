# Validation Summary: How to Build Policy Unit Tests for Kyverno Policies Using the Kyverno CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kyverno ClusterPolicy
- Kyverno CLI
- Kyverno policy tests
- GitHub Actions
- YAML
- JMESPath
- jq

## Sources Consulted
- Kyverno CLI overview and installation documentation: https://kyverno.io/docs/subprojects/kyverno-cli/
- Kyverno `test` command reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_test/
- Kyverno policy test file structure documentation: https://release-1-13-0.kyverno.io/docs/kyverno-cli/usage/test/
- Kyverno validation rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy type overview and deprecation schedule: https://kyverno.io/docs/policy-types/overview/
- Kyverno v1.18.1 CLI `test --help` and `apply --help` output from the official release binary.

## Issues Found
- The Linux and CI install commands pinned Kyverno CLI v1.11.0. Updated them to v1.18.1 and used `sudo cp kyverno /usr/local/bin/`, matching current release assets and install examples.
- Test manifests used the older minimal format without `apiVersion`, `kind`, and `metadata`. Updated examples to `apiVersion: cli.kyverno.io/v1alpha1`, `kind: Test`, and `metadata.name`.
- Test result entries used singular `resource`. Updated them to current `resources` lists.
- The mutation test used `patchedResource`; current Kyverno test manifests require `patchedResources`. Updated the field.
- The examples used deprecated `spec.validationFailureAction`. Moved enforcement to `validate.failureAction: Enforce`.
- The expected first test output showed an incorrect summary. Updated it to match current Kyverno CLI output shape.
- The mutation test command passed a test file path directly. Updated it to run the directory containing `kyverno-test.yaml`.
- The test suite layout used custom test filenames that Kyverno will not discover by default. Updated the structure to place `kyverno-test.yaml` in per-test directories.
- The `kyverno test --verbose` example used an unsupported flag. Replaced it with `--detailed-results`.
- The generation and exception sections referenced resource files that were not shown. Added minimal input resource snippets so the examples are runnable.
- The GitHub Actions `kyverno apply` command used unsupported `--dry-run`. Removed the flag.
- The JSON output example used `--output` and an incorrect jq path. Updated it to `--output-format json`, extracted the JSON array from Kyverno's mixed output, and adjusted jq for the current uppercase result keys.

## Review Notes
Kyverno v1.18 marks legacy `ClusterPolicy` as deprecated, although it remains documented and supported with critical fixes. A future refresh should consider rewriting the examples to the newer `policies.kyverno.io/v1` policy types.
