# Validation Summary: How to Understand Resource Behavior in OpenTofu - Understand

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- OpenTofu (tofu CLI — `plan`, `destroy`)
- HCL (HashiCorp Configuration Language)
- Terraform/OpenTofu resource lifecycle meta-arguments (`ignore_changes`, `create_before_destroy`)
- AWS provider resources (`aws_instance`, `aws_s3_bucket`, `aws_db_instance`, `aws_vpc`, `aws_subnet`)
- Google Cloud provider resource (`google_compute_instance`)
- Terraform Plugin SDK concept of `ForceNew`

## Sources Consulted
- OpenTofu plan command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu destroy command docs: https://opentofu.org/docs/cli/commands/destroy/
- Terraform lifecycle meta-arguments: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS provider registry (`aws_instance`, `aws_db_instance`)
- Google provider docs for `google_compute_instance` (machine_type update behavior with `allow_stopping_for_update`)

## Issues Found
- **`machine_type` listed as a common ForceNew attribute on `google_compute_instance`**: Inaccurate. `machine_type` can be updated in place when `allow_stopping_for_update = true` (the instance is stopped, machine type changed, and restarted). It is not marked ForceNew in the provider schema. Replaced the example line `# google_compute_instance: zone, machine_type (with some configs)` with `# google_compute_instance: name, zone, boot_disk.initialize_params.type` to reflect attributes that actually force replacement.

All other technical claims verified correct:
- Plan symbols (`+`, `-`, `~`, `-/+`, `+/-`) are accurate.
- Plan annotations (`(forces replacement)`, `(known after apply)`, `(sensitive value)`) are correct.
- `ignore_changes` and `create_before_destroy` are valid lifecycle meta-arguments.
- `tofu plan` and `tofu destroy` are valid commands.
- `ami`, `availability_zone`, and `subnet_id` on `aws_instance` are correctly listed as ForceNew.
- `engine` on `aws_db_instance` is ForceNew; `db_name` is ForceNew in typical scenarios (hedge "sometimes" is fair given engine-specific nuances).

## Review Notes
- The heading "Resource Dependencies and Update Order" (line 122) is missing the `##` markdown prefix used by other section headings. This is a formatting inconsistency rather than a technical error, so it was left unchanged per the review scope (only fix technical errors, no stylistic changes).
- The `+/-` symbol representation for `create_before_destroy` is documented in community sources; OpenTofu/Terraform plan output for replacement scenarios more commonly shows `-/+`, with the ordering reflected in apply execution rather than diff symbols. The post's claim is a reasonable simplification and not incorrect.
- The post uses a generic/example AMI ID (`ami-0c55b159cbfafe1f0`) — this is a real but region/age-specific AMI; acceptable for illustration.
