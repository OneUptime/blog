# Validation Summary: How to Use the -json Flag for Machine-Readable Output in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- `jq`
- JSON machine-readable output
- Infrastructure as Code (IaC)
- CI/CD automation

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu machine-readable UI docs: https://opentofu.org/docs/internals/machine-readable-ui/
- OpenTofu `show` command docs: https://opentofu.org/docs/cli/commands/show/
- OpenTofu JSON output format docs: https://opentofu.org/docs/internals/json-format/
- OpenTofu `validate` command docs: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu `output` command docs: https://opentofu.org/docs/cli/commands/output/
- OpenTofu `version` command docs: https://opentofu.org/docs/cli/commands/version/
- OpenTofu `providers schema` command docs: https://opentofu.org/docs/cli/commands/providers/schema/

## Issues Found
1. The `tofu plan -json` section treated the output as a single plan JSON document with `.resource_changes`. Current OpenTofu documentation defines `tofu plan -json` as a machine-readable UI event stream, one JSON object per line. I updated the explanation, the `jq` example, and the sample JSON to use `planned_change` event data.
2. The post said `tofu plan -json -out=plan.json` would save a JSON plan. The `-out` flag writes an opaque saved plan file, not JSON. I corrected this to `plan.tfplan` and described it as a binary plan file for later inspection.
3. The `tofu show -json` saved-plan example used the legacy positional plan filename form. I updated it to the current explicit `-plan=plan.tfplan` syntax documented by OpenTofu.
4. The `tofu providers schema -json` example used an incorrect `jq` path. The documented schema structure places resource attributes under `.resource_schemas["..."].block.attributes`, and the `provider_schemas` map is keyed by provider type such as `aws`. I corrected that path.
5. The CI/CD examples parsed `tofu plan -json` output as if it were the structured plan representation. I corrected them to generate a saved plan with `tofu plan -out=plan.tfplan` and then convert it with `tofu show -json -plan=plan.tfplan` before querying `.resource_changes`.

## Review Notes
- `tofu version -json` currently uses the key `terraform_version` in its JSON output, which is surprising in OpenTofu but matches the current official documentation.
- OpenTofu documents that `-json` output for commands such as `show` and `output` can expose sensitive values in plain text, and saved plan files can also contain sensitive data in cleartext.
- `tofu validate -json` can still emit non-JSON output if OpenTofu fails before validation begins. The existing examples are fine, but automation should account for that edge case.
