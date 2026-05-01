# Validation Summary: How to Deploy Vault Cluster with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- HashiCorp Vault
- Vault Integrated Storage (Raft)
- AWS EC2
- AWS KMS
- AWS IAM
- AWS Network Load Balancer
- Amazon Route 53

## Sources Consulted
- Vault AWS KMS seal configuration: https://developer.hashicorp.com/vault/docs/configuration/seal/awskms
- Vault integrated storage configuration: https://developer.hashicorp.com/vault/docs/configuration/storage/raft
- Vault integrated storage concepts: https://developer.hashicorp.com/vault/docs/concepts/integrated-storage
- Vault integrated storage deployment guide: https://developer.hashicorp.com/vault/tutorials/day-one-raft/raft-deployment-guide
- Vault high availability concepts: https://developer.hashicorp.com/vault/docs/concepts/ha
- Vault `/sys/health` API: https://developer.hashicorp.com/vault/api-docs/system/health
- AWS Network Load Balancer creation guide: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/create-network-load-balancer.html
- AWS Network Load Balancer listener guide: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/create-listener.html
- AWS Network Load Balancer health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- AWS EC2 IAM roles and instance profiles: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html
- Terraform AWS provider `aws_iam_instance_profile`: https://registry.terraform.io/providers/hashicorp/aws/3.65.0/docs/resources/iam_instance_profile
- AWS EC2 volume persistence on termination: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/preserving-volumes-on-termination.html

## Issues Found
- The IAM section referenced `aws_iam_instance_profile.vault` later in the EC2 resource, but the instance profile resource was not defined. I added `aws_iam_instance_profile "vault"` so the EC2 example matches the IAM setup it depends on.
- The Raft `auto_join` example omitted the AWS region. Vault's documented AWS auto-join format includes `region=<AWS_REGION>`, so I added `region=${var.aws_region}` to the example.
- The EC2 `templatefile` inputs included an `all_node_ips` comment that implied a later SSM-driven peer discovery step. That conflicted with the post's Raft `auto_join` approach, so I corrected the comment to make it clear the placeholder stays empty when peer discovery is handled by Vault.
- The Network Load Balancer section created the load balancer, target group, and attachments, but it did not define any listener. AWS requires at least one listener to accept client connections and forward them to a target group, so I added an `aws_lb_listener` resource on port `8200` with a `TCP` forward action.
- The EC2 EBS comment implied that `delete_on_termination = false` keeps the data volume through instance replacement. AWS documents that the volume is preserved when the instance terminates, but reattachment to a replacement instance is a separate step, so I corrected the comment to reflect that behavior.

## Review Notes
- The Vault health check path `/v1/sys/health` is technically valid for an NLB HTTPS health check. By default, only the active node returns a `200`, while standby nodes return `429`, which means this configuration routes client traffic only to the active node unless you intentionally broaden the accepted matcher or use `standbyok`.
- The post's shared `api_addr` value points all nodes at the load balancer address. Vault documents that this is the correct setting when clients can only reach Vault through the load balancer, but it can introduce redirect-loop edge cases if request forwarding is unavailable.
