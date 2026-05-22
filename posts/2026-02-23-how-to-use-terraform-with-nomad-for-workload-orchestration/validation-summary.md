# Validation Summary: How to Use Terraform with Nomad for Workload Orchestration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Nomad
- HashiCorp Nomad Terraform provider
- AWS EC2
- AWS Auto Scaling
- AWS CloudWatch alarms
- HashiCorp Vault integration with Nomad
- Consul service registration
- Docker workloads on Nomad

## Sources Consulted
- HashiCorp Nomad architecture documentation: https://developer.hashicorp.com/nomad/docs/architecture
- HashiCorp Nomad "What is Nomad?" documentation: https://docs.hashicorp.com/nomad/docs/what-is-nomad
- HashiCorp Nomad job specification documentation: https://developer.hashicorp.com/nomad/docs/job-specification
- HashiCorp Nomad spread block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/spread
- HashiCorp Nomad runtime variable interpolation documentation: https://developer.hashicorp.com/nomad/docs/reference/runtime-variable-interpolation
- HashiCorp Nomad vault block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/vault
- HashiCorp Nomad template block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/template
- HashiCorp Nomad check block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/check
- HashiCorp Nomad ACL policy specification: https://developer.hashicorp.com/nomad/docs/other-specifications/acl-policy
- HashiCorp Nomad Docker task driver documentation: https://developer.hashicorp.com/nomad/docs/deploy/task-driver/docker
- HashiCorp Terraform Nomad provider documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-nomad/main/website/docs/index.html.markdown
- HashiCorp Terraform nomad_job resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-nomad/main/website/docs/r/job.html.markdown
- HashiCorp Terraform nomad_acl_policy resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-nomad/main/website/docs/r/acl_policy.html.markdown
- HashiCorp Terraform AWS provider aws_autoscaling_group documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- HashiCorp Terraform AWS provider aws_security_group documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group.html
- HashiCorp Terraform AWS provider aws_cloudwatch_metric_alarm documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The job template comment said the spread rule distributed allocations across availability zones, but the code used `$${node.datacenter}`, which spreads across Nomad datacenters. Changed it to `$${attr.platform.aws.placement.availability-zone}`, the AWS availability zone node attribute documented by Nomad.
- The Nomad `vault` block used `policies = ["web-service"]`, but the current Nomad job specification uses `role` for Vault token retrieval. Changed it to `role = "web-service"`.
- The auto-scaling section described scaling based on cluster utilization, but the example CloudWatch alarm uses the EC2 `CPUUtilization` metric for the Auto Scaling Group. Clarified the text to say EC2 CPU utilization.

## Review Notes
The examples are illustrative and omit surrounding production details such as full Nomad agent templates, client security group rules, Nomad provider authentication for ACL-enabled clusters, and scale-down policies. Those omissions do not make the shown snippets syntactically invalid, but a production implementation would need to supply them.
