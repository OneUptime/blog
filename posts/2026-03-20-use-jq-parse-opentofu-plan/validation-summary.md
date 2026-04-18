# Validation Summary: How to Use jq to Parse OpenTofu Plan Output

## Status
validated

## Post Type
Tutorial / Reference guide (cookbook of jq one-liners for OpenTofu plan JSON)

## Technologies Covered
- OpenTofu (`tofu plan`, `tofu show -json`)
- jq (JSON command-line processor)
- Bash / shell scripting
- Terraform/OpenTofu plan JSON format
- AWS resources (aws_instance, aws_s3_bucket, aws_iam_*)

## Sources Consulted
- OpenTofu JSON Output Format documentation: https://opentofu.org/docs/internals/json-format/
- jq manual — array operators (`contains`, `group_by`, `to_entries`, `@tsv`, `test`): https://jqlang.github.io/jq/manual/
- OpenTofu CLI `plan` and `show` command reference
- Terraform/OpenTofu plan JSON schema: `resource_changes[]` with `address`, `module_address`, `type`, `name`, `change.actions`, `change.before`, `change.after`, and top-level `variables`

## Issues Found
No technical issues found.

Verified specifically:
- `tofu plan -out=tfplan` and `tofu show -json tfplan` are correct invocations.
- `resource_changes[]` field names (`address`, `module_address`, `type`, `name`, `change.actions`, `change.after`) match the OpenTofu JSON format spec.
- `.change.actions` possible values — `["no-op"]`, `["create"]`, `["read"]`, `["update"]`, `["delete"]`, `["delete","create"]`, `["create","delete"]` — match the spec, so `contains(["delete"])` correctly captures both pure deletes and replacements.
- `.variables | to_entries[] | "\(.key) = \(.value.value)"` correctly reflects the top-level `variables` object where each entry has a `value` sub-field.
- `.change.after.instance_type` (for `aws_instance`) and `.change.after.bucket` (for `aws_s3_bucket`) are valid attributes.
- jq idioms (`group_by`, `@tsv`, `test("^aws_iam")`, `join("+")`, `contains`) are syntactically correct.
- Install commands (`apt-get install jq`, `brew install jq`) are correct for the listed platforms.

## Review Notes
- `module_address` is omitted for root-module resources; the "Group changes by module" query will therefore group root-module resources under a `null` key. This is expected jq behavior and not an error, but readers may want to handle null explicitly in real scripts.
- The "create_before_destroy" lifecycle produces `["create", "delete"]` while the default replace produces `["delete", "create"]`; the `contains(["delete"])` pattern handles both, which is the right choice for destructive-change detection.
- The `column -t` post-processing for the TSV summary requires `bsdmainutils` / `util-linux` `column`; generally pre-installed on common distros and macOS.
- No version-specific caveats — the plan JSON format version has been stable through OpenTofu 1.x and matches Terraform's schema.
