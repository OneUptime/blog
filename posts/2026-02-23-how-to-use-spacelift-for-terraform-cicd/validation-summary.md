# Validation Summary: How to Use Spacelift for Terraform CI/CD

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Terraform
- Spacelift
- Spacelift Terraform provider
- Open Policy Agent / Rego
- AWS IAM role integration
- Infracost
- Webhooks and Slack notifications

## Sources Consulted
- Spacelift Terraform provider documentation: https://registry.terraform.io/providers/spacelift-io/spacelift/latest/docs
- `spacelift_stack` resource documentation: https://registry.terraform.io/providers/spacelift-io/spacelift/latest/docs/resources/stack
- `spacelift_aws_integration` resource documentation: https://registry.terraform.io/providers/spacelift-io/spacelift/latest/docs/resources/aws_integration
- `spacelift_policy` resource documentation: https://registry.terraform.io/providers/spacelift-io/spacelift/latest/docs/resources/policy
- `spacelift_webhook` resource documentation: https://registry.terraform.io/providers/spacelift-io/spacelift/latest/docs/resources/webhook
- Spacelift plan policy documentation: https://docs.spacelift.io/concepts/policy/terraform-plan-policy
- Spacelift approval policy documentation: https://docs.spacelift.io/concepts/policy/approval-policy
- Spacelift notification policy documentation: https://docs.spacelift.io/concepts/policy/notification-policy
- Spacelift drift detection documentation: https://docs.spacelift.io/concepts/stack/drift-detection
- Spacelift stack dependencies documentation: https://docs.spacelift.io/concepts/stack/stack-dependencies
- Spacelift Terraform cost estimation / Infracost documentation: https://docs.spacelift.io/vendors/terraform/infracost

## Issues Found
- The AWS integration snippet described `spacelift_aws_integration` as OIDC-based. Updated the wording and comment to describe the documented STS AssumeRole flow with a generated external ID.
- The plan policy used `count(input.terraform.resource_changes[_].change.actions[_] == "delete")`, which is not valid Rego for counting matching resources. Replaced it with a list comprehension and counted the resulting collection.
- The approval policy incorrectly approved production runs immediately and attempted to inspect Terraform resource changes from an approval policy input. Reworked it to require approval for unconfirmed production runs and approve after at least one approval with no rejections.
- The Terraform policy resources did not pin the Rego engine despite using Rego v0 syntax. Added `engine_type = "REGO_V0"` to the policy examples.
- The approval policy was defined but not attached to the production stack. Added a `spacelift_policy_attachment` for the approval policy.
- The cost estimation section implied cost data was built in without setup and used a non-documented policy path, `input.run.changes.cost.delta`. Updated it to explain the Infracost integration requirement and use `input.third_party_metadata.infracost`.
- The notifications example used a non-existent `spacelift_notification_policy` Terraform resource and a Slack incoming webhook as a `spacelift_webhook` endpoint. Replaced it with the documented `spacelift_policy` resource using `type = "NOTIFICATION"` and a Slack notification rule.

## Review Notes
The core stack, drift detection, dependency, context, and AWS integration resource examples align with the current Spacelift Terraform provider documentation. Local `terraform` and `opa` binaries were not available in the workspace, so validation was performed against official documentation rather than local parser execution.
