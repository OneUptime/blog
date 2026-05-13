# Validation Summary: How to Validate Flux Manifests with Datree

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Datree CLI
- Datree policy-as-code
- Datree custom rules
- Kubernetes manifests and schema validation
- Flux GitOps
- Kustomize
- GitHub Actions CI

## Sources Consulted
- Datree CLI getting started: https://hub.datree.io/cli/getting-started
- Datree CLI arguments: https://hub.datree.io/cli/cli-arguments
- Datree schema validation: https://hub.datree.io/cli/schema-validation
- Datree Kustomize support: https://hub.datree.io/integrations/kustomize-support
- Datree policy as code: https://hub.datree.io/dashboard/policy-as-code
- Datree custom rules overview: https://hub.datree.io/custom-rules/custom-rules-overview
- Datree built-in rules: https://hub.datree.io/built-in-rules

## Issues Found
- The Homebrew installation command used `brew install datree`, but Datree's official Homebrew instructions require tapping `datreeio/datree` and installing `datreeio/datree/datree`. Updated the command accordingly.
- The policy configuration section described creating `.datree/policy.yaml` without explaining how Datree would use it. Datree's policy-as-code documentation uses `policies.yaml` and requires publishing it with `datree publish`, or passing a local file with `--policy-config`. Updated the filename and added both usage commands.
- The Flux custom rule JSON Schema did not require `kind` and `apiVersion` in the `if` condition, so JSON Schema semantics could make the rule match documents without those fields. It also did not require `spec` at the top level in the `then` condition. Added the required fields so the rule targets Flux Kustomizations and enforces `spec.prune: true`.
- The CRD section said to skip CRD validation for Flux-specific resources. The `--ignore-missing-schemas` flag skips schema failures for resources with missing schemas, not all CRD validation. Reworded the section to match the documented behavior.

## Review Notes
- The post uses external Datree CLI behavior and policy identifiers from Datree's documented built-in rules. The Datree documentation available during review is current online but still shows 2023 copyright dates and examples with older Kubernetes schema versions.
- Datree and Kustomize were not installed in the local environment, so command behavior was verified against official Datree documentation rather than local CLI execution.
