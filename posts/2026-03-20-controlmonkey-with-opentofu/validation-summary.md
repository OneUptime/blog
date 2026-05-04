# Validation Summary: How to Use ControlMonkey with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ControlMonkey Terraform provider (`control-monkey/cm`)
- OpenTofu
- Terraform / HCL
- Drift detection and policy as code
- Self-service infrastructure blueprints

## Sources Consulted
- ControlMonkey Terraform provider on the registry: https://registry.terraform.io/providers/control-monkey/cm/latest
- Provider source repo: https://github.com/control-monkey/terraform-provider-cm
- `cm_stack` resource docs: https://github.com/control-monkey/terraform-provider-cm/blob/main/docs/resources/stack.md
- `cm_namespace` resource docs: https://github.com/control-monkey/terraform-provider-cm/blob/main/docs/resources/namespace.md
- `cm_blueprint` resource docs: https://github.com/control-monkey/terraform-provider-cm/blob/main/docs/resources/blueprint.md
- `cm_control_policy`, `cm_control_policy_group`, `cm_control_policy_group_mappings` docs in the same repo
- ControlMonkey SDK (Go): https://github.com/control-monkey/controlmonkey-sdk-go (used to verify enum values such as `DeploymentApprovalPolicyRuleTypes` and `CONTROL_MONKEY_TOKEN`)
- ControlMonkey IaC Import / Terraform Import Engine product page: https://controlmonkey.io/platform/terraform-import-engine/

## Issues Found
The post had pervasive errors in the provider name, resource names, schema, environment variables, and even invented a non-existent CLI. Each was corrected against the official provider source.

1. **Provider source and local name were wrong.** Post used `control-monkey/controlmonkey` with local name `controlmonkey`. The published provider is `control-monkey/cm` with local name `cm`. Fixed in the `required_providers` block and in the `provider` block.
2. **Auth environment variable was wrong.** Post used `CONTROLMONKEY_TOKEN`. The actual variable is `CONTROL_MONKEY_TOKEN` (per the provider's `index.md`). Fixed.
3. **All resource names used the wrong prefix.** `controlmonkey_namespace`, `controlmonkey_stack`, `controlmonkey_blueprint`, `controlmonkey_policy_group`, `controlmonkey_policy_group_assignment` do not exist. Renamed to `cm_namespace`, `cm_stack`, `cm_blueprint`, `cm_control_policy_group`, `cm_control_policy_group_mappings`. Also added `cm_control_policy` since the policy group references one.
4. **Block syntax was incorrect.** The provider is built on the Terraform Plugin Framework and uses attribute-style nested blocks (`iac_config = { ... }`), not legacy HCL block syntax (`iac_config { ... }`). Converted all nested blocks throughout.
5. **`cm_stack` schema was wrong in several ways:**
   - `iac_type` is a top-level required attribute on the stack, not nested in `iac_config`. Moved it.
   - Allowed values are `[terraform, terragrunt, opentofu]` (lowercase). The post used `"openTofu"`, which is not a valid enum value. Replaced with `"opentofu"`.
   - The required `deployment_behavior = { deploy_on_push = ... }` block was missing entirely. Added it.
   - `vcs_info.working_directory` does not exist; the actual attribute is `path`. Renamed.
6. **Drift detection block did not exist as written.** The post invented a `drift_detection { cron = "0 */6 * * *", auto_remediate = false }` block and a `deployment_approval { require_approval = true }` block. Drift detection in this provider is enabled via `capabilities.drift_detection.status = "enabled"`; auto-remediation is `auto_sync.deploy_when_drift_detected`; approvals use `deployment_approval_policy = { rules = [{ type = "requireApproval" }] }`. There is no cron-style scheduling field on the stack. Rewrote the section.
7. **`cm_blueprint` schema was almost entirely wrong.** The post invented `iac_config { iac_type, opentofu_version, working_directory, repo_name, branch }` and `variable_overrides`. The actual schema requires `blueprint_vcs_info`, `stack_configuration` (containing `name_pattern`, `iac_type`, `vcs_info_with_patterns`, optional `iac_config`), and `substitute_parameters` (with optional `value_conditions`). Rewrote the example to match.
8. **Policy-as-code section was incorrect:**
   - `cm_control_policy_group` does not accept inline `policy { name, rego_code, enforcement_level }` blocks. The post's claim that "ControlMonkey evaluates OPA policies during plan" with raw Rego files is wrong; ControlMonkey ships typed control policies (e.g. `aws_required_tags`) created via `cm_control_policy` with a `parameters` JSON string. Rewrote to introduce `cm_control_policy` first, then reference it from the group.
   - The mapping resource is `cm_control_policy_group_mappings` and uses `targets = [{ target_id, target_type, enforcement_level }]`, not `policy_group_id` / `scope_type` / `scope_id`. Fixed.
   - Enforcement level values are `[warning, softMandatory, hardMandatory, bySeverity]` — not `MANDATORY`. Used `hardMandatory`.
   - Updated the conclusion to drop the "OPA policy enforcement" wording, since ControlMonkey is not an OPA/Rego engine.
9. **The `controlmonkey` CLI does not exist.** The post showed `controlmonkey scan ...` and `controlmonkey import ...` commands, but ControlMonkey does not publish a CLI of that name in either the `control-monkey` GitHub org or its docs. The corresponding feature is the in-console **IaC Import** wizard (Terraform Import Engine), which generates both code and state. Replaced the bash code block with a description of the actual console workflow.

## Review Notes
- OpenTofu 1.9.0 is referenced as the runtime version. The provider schema accepts an arbitrary `opentofu_version` string and does not validate it; the post's value remains plausible but should be revisited if OpenTofu is updated.
- The `cm_control_policy` `type` field is open-ended and references the ControlMonkey API enumerations page for valid values. `aws_required_tags` is documented as a valid type in the provider's example, so the example should work as written.
- The blog now uses `vcs-github-connection-id` as a placeholder VCS provider ID; in practice, this is the `vcsp-...` ID emitted when a VCS integration is created in the ControlMonkey console.
- Future maintenance: the `deployment_behavior.wait_for_approval` field is deprecated in favor of `deployment_approval_policy`. The rewritten post already uses the latter, so no further action is needed.
