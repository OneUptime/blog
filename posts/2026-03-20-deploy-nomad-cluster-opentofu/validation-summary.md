# Validation Summary: How to Deploy Nomad Cluster with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Auto Scaling
- AWS EC2 Launch Templates
- HashiCorp Nomad
- HashiCorp Consul
- HCL

## Sources Consulted
- HashiCorp Nomad agent configuration overview: https://developer.hashicorp.com/nomad/docs/configuration
- Nomad `consul` agent configuration: https://developer.hashicorp.com/nomad/docs/configuration/consul
- Nomad `acl` agent configuration: https://developer.hashicorp.com/nomad/docs/configuration/acl
- Nomad `tls` agent configuration: https://developer.hashicorp.com/nomad/docs/configuration/tls
- Nomad ACL policy reference: https://developer.hashicorp.com/nomad/docs/secure/acl/policies
- Nomad `service` job specification: https://developer.hashicorp.com/nomad/docs/job-specification/service
- Nomad Consul ACL/workload identity tutorial: https://developer.hashicorp.com/nomad/tutorials/integrate-consul/consul-acl
- Official Nomad provider docs from HashiCorp source repository: https://github.com/hashicorp/terraform-provider-nomad/blob/main/website/docs/index.html.markdown
- Official Nomad provider `nomad_acl_policy` docs: https://github.com/hashicorp/terraform-provider-nomad/blob/main/website/docs/r/acl_policy.html.markdown
- Official Nomad provider `nomad_namespace` docs: https://github.com/hashicorp/terraform-provider-nomad/blob/main/website/docs/r/namespace.html.markdown
- Official AWS provider `aws_launch_template` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/launch_template.html.markdown
- Official AWS provider `aws_autoscaling_group` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/autoscaling_group.html.markdown

## Issues Found
- The Nomad provider example used `token`, but the current provider uses `secret_id` for the ACL token. I changed `token = var.nomad_bootstrap_token` to `secret_id = var.nomad_bootstrap_token`.
- The Nomad provider example passed `file("${path.module}/ca.crt")` to `ca_file`, but `ca_file` expects a filesystem path, not PEM contents. I changed it to `ca_file = "${path.module}/ca.crt"`.
- The conclusion stated that jobs automatically register with Consul. That is too broad. In Nomad, service registration is driven by job `service` blocks, and ACL-enabled Consul setups also require appropriate token or workload identity configuration. I corrected the wording accordingly.
- The description claimed the post covered ACL bootstrapping, but the content shown focuses on ACL policy management through the Nomad provider rather than a full ACL bootstrap workflow. I changed the description to match the content.

## Review Notes
- The AWS Auto Scaling Group and EC2 launch template snippets are consistent with the current AWS provider documentation, including the use of `version = "$Latest"` in the ASG launch template block.
- The Nomad ACL policy example is valid, although the explicit `capabilities` list is redundant when `policy = "write"` is already present.
- The post still does not show a full Consul ACL bootstrap or workload identity setup. That omission is acceptable for a high-level deployment guide, but readers using ACL-enabled Consul will need those additional steps in practice.
