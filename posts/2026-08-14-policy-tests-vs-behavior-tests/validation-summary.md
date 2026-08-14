# Validation Summary: Policy Tests vs Behavior Tests for Infrastructure Rules

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Terraform configuration, plan JSON, and native tests
- Open Policy Agent (OPA) and Rego
- Checkov static and graph-based policy checks
- HCP Terraform policy sets
- HashiCorp Sentinel
- Terratest and Go-based infrastructure testing
- CI-based connectivity and behavior testing
- Infrastructure drift and continuous monitoring

## Sources Consulted

- [Open Policy Agent: Terraform](https://www.openpolicyagent.org/docs/terraform)
- [Open Policy Agent: Policy Language](https://www.openpolicyagent.org/docs/policy-language)
- [Open Policy Agent: Policy Testing](https://www.openpolicyagent.org/docs/policy-testing)
- [Terraform: JSON output format](https://developer.hashicorp.com/terraform/internals/json-format)
- [Terraform: `show` command](https://developer.hashicorp.com/terraform/cli/commands/show)
- [Terraform: Native test language](https://developer.hashicorp.com/terraform/language/tests)
- [Checkov: Custom Policies Overview](https://www.checkov.io/3.Custom%20Policies/Custom%20Policies%20Overview.html)
- [Checkov: YAML Custom Policies](https://www.checkov.io/3.Custom%20Policies/YAML%20Custom%20Policies.html)
- [Checkov: Terraform Plan Scanning](https://www.checkov.io/7.Scan%20Examples/Terraform%20Plan%20Scanning.html)
- [HCP Terraform: Define Open Policy Agent policies](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/define-policies/opa)
- [HCP Terraform: Manage policies and policy sets](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets)
- [HCP Terraform: Detect infrastructure drift and enforce policies](https://developer.hashicorp.com/terraform/tutorials/cloud/drift-and-policy)
- [Terratest: Introduction](https://terratest.gruntwork.io/docs/getting-started/introduction/)
- [Terratest: Cleanup](https://terratest.gruntwork.io/docs/testing-best-practices/cleanup/)
- [Terratest: Timeouts and logging](https://terratest.gruntwork.io/docs/testing-best-practices/timeouts-and-logging/)
- [GitHub Actions: Private networking with GitHub-hosted runners](https://docs.github.com/en/actions/concepts/runners/private-networking)

## Issues Found

- The plan-policy description said Terraform had "resolved expressions," which was too absolute because plan data can retain unevaluated configuration expressions and apply-time values can remain unknown. It now says Terraform evaluates the configuration as far as possible and asks providers to propose planned values.
- The Rego example did not enforce the stated scope of managed TCP/22 ingress rules. It now checks `mode == "managed"` and `protocol == "tcp"`, and its diagnostic describes the exact TCP/22 condition.
- The example did not state which OPA input shape it expected. It now identifies `input.resource_changes` as the path for raw `terraform show -json` input and documents HCP Terraform's `input.plan.resource_changes` path.
- The example's behavior for apply-time unknown values was implicit and could be mistaken for a complete fail-closed policy. It now states that the compact rule handles known values only and that a production policy must inspect `after_unknown` and apply its documented deny, defer, or exception decision.

## Review Notes

- The revised Rego example was parsed and evaluated with OPA 1.19.0. It denies a matching managed TCP/22 rule while excluding synthetic UDP and data-resource cases.
- The OPA Terraform page still labels its walkthrough as requiring Terraform 0.12.6 and says newer versions are untested. The post relies on the page's current plan-limitations guidance, not its legacy provider examples.
- Terraform's native testing framework is available in Terraform 1.6.0 and later. The post does not promise compatibility with an earlier version.
- `opa test` is current. CI users may additionally use `--fail-on-empty` so a run with no discovered tests fails; this is optional hardening rather than a correction to the post.
- Checkov can scan both Terraform configuration and Terraform plan JSON. The post's table should be read as assigning a primary home according to the evidence required, not as an exclusive capability matrix for each tool.
