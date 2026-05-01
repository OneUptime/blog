# Validation Summary: How to Use Dynamic Blocks in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL
- HashiCorp AWS provider
- HashiCorp Kubernetes provider
- AWS IAM policy documents
- Amazon EC2 and EBS block device mappings

## Sources Consulted
- OpenTofu `dynamic` blocks documentation: https://opentofu.org/docs/v1.9/language/expressions/dynamic-blocks/
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- AWS provider `aws_route_table` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- AWS provider `aws_iam_policy_document` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Kubernetes provider `kubernetes_deployment_v1` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment_v1
- AWS IAM `Sid` element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_sid.html
- AWS CLI `run-instances` block device mapping documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html

## Issues Found
- The custom iterator example was not actually using a custom iterator name, and its comment incorrectly implied that the default iterator for `dynamic "route"` would be `routes`. I changed the iterator to `route_entry`, updated the comment, and aligned the example object keys with the `route` block arguments documented by the AWS provider.
- The IAM policy example generated `sid` values from bucket names using `title(statement.value)`. AWS IAM allows only alphanumeric characters in a `Sid`, so bucket names containing hyphens could produce invalid policy statements. I changed the example to use `statement.key` to build a safe alphanumeric `Sid`.
- The EBS example used an `io2` volume without specifying `iops`. AWS requires IOPS for `io1` and `io2` block device mappings. I added an `iops` field to the example object type, defaults, and generated `ebs_block_device` block.
- The Kubernetes example was incomplete for the current provider documentation and used the older `kubernetes_deployment` resource name. I updated it to `kubernetes_deployment_v1`, added selector and template labels, added a minimal container block, renamed the labels variable to `pod_labels`, and adjusted the section title so it no longer implies that labels themselves are generated with dynamic blocks.
- The conclusion incorrectly said dynamic blocks use the same `for_each` syntax as resources while also claiming support for lists. OpenTofu resource/module `for_each` accepts maps and sets of strings, while `dynamic` blocks can iterate over any collection or structural value. I corrected that explanation.

## Review Notes
- The AWS provider currently recommends dedicated `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources over inline `ingress` and `egress` blocks for production security group management. The blog's inline security group snippets are still valid language examples, but they are not the provider's preferred operational pattern.
- The `aws_instance` `ebs_block_device` block is creation-oriented and has limited change detection for existing instances. For independently managed data volumes, the provider documentation recommends `aws_ebs_volume` plus `aws_volume_attachment`.
