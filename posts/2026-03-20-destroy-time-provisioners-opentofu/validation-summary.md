# Validation Summary: How to Use Destroy-Time Provisioners in OpenTofu - Opentofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu provisioners (`local-exec`, `remote-exec`)
- AWS EC2
- AWS RDS
- Consul CLI
- Slack incoming webhooks

## Sources Consulted
- OpenTofu provisioners documentation: https://opentofu.org/docs/v1.7/language/resources/provisioners/syntax/
- OpenTofu `local-exec` provisioner documentation: https://opentofu.org/docs/v1.8/language/resources/provisioners/local-exec/
- OpenTofu resource behavior documentation: https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu resource blocks documentation: https://opentofu.org/docs/language/resources/syntax/
- OpenTofu `destroy` command documentation: https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu `taint` command documentation: https://opentofu.org/docs/v1.6/cli/commands/taint/
- Consul `services deregister` command documentation: https://developer.hashicorp.com/consul/commands/services/deregister
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks
- Terraform Registry `aws_rds_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster

## Issues Found
- The section heading referred to `terraform destroy` even though the post is about OpenTofu. I changed it to `tofu destroy`.
- The post said destroy-time provisioners run after manually tainting and re-applying a resource. OpenTofu documents that destroy-time provisioners do not run for tainted resources, so I corrected the explanation and added the `create_before_destroy = true` caveat for replacements.
- The `on_failure = continue` example also used `|| true`, which prevented the command from failing and made the example technically inconsistent with the explanation. I removed `|| true` so the snippet now demonstrates `on_failure` correctly.
- The interpolation limitation was overstated as “only `self` references are allowed.” I corrected the wording to focus on avoiding direct references to other resources or data sources during destroy and to use variables for additional context, which matches the example shown.

## Review Notes
OpenTofu’s documentation also notes that destroy-time provisioners do not run if the resource block is removed from configuration entirely before destroy, and that provisioners are recommended only as a last resort. The post remains technically valid without expanding into those caveats, but they are worth keeping in mind for future revisions.
