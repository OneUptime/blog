# Validation Summary: How to Fix Error Deleting Security Group In Use

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform (HashiCorp AWS provider)
- AWS EC2 Security Groups, ENIs, Instances
- AWS CLI (ec2, elbv2, rds, lambda subcommands)
- AWS Lambda (VPC networking / Hyperplane ENIs)
- AWS RDS, ELB/ALB, ECS Fargate (in the context of ENI ownership)
- AWS VPC default security group
- jq (for filtering JSON output)
- Bash scripting

## Sources Consulted
- Terraform AWS provider — aws_instance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider — aws_security_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider — aws_security_group_rule: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- Terraform AWS provider — aws_default_security_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/default_security_group
- AWS CLI — ec2 describe-security-groups: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html
- AWS CLI — ec2 describe-network-interfaces: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html
- AWS CLI — ec2 describe-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI — ec2 modify-instance-attribute: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS CLI — ec2 modify-network-interface-attribute: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-network-interface-attribute.html
- AWS re:Post — Lambda Hyperplane ENI cleanup: https://repost.aws/knowledge-center/lambda-eni-find-delete

## Issues Found
- **Fix 1 used the wrong `aws_instance` attribute for VPC security groups.** The example assigned a security group via `security_groups = [aws_security_group.replacement_sg.id]`. Per the Terraform AWS provider docs, `security_groups` is for EC2-Classic / default-VPC use and expects SG names; using SG IDs there in a custom VPC causes instance recreation on every apply (HashiCorp issue #1445). Changed to `vpc_security_group_ids = [aws_security_group.replacement_sg.id]` to match the recommended attribute and stay consistent with the "Terraform Destroy Order" example later in the post.

## Review Notes
- The "Lambda ENIs persist up to 20 minutes" wording matches official AWS documentation, but in real-world reports Hyperplane ENI cleanup commonly takes 40+ minutes (occasionally hours). The post's claim is not wrong, just optimistic relative to lived experience.
- `aws ec2 modify-instance-attribute --groups` replaces the full set of SGs rather than appending — the post's usage (swapping to a replacement SG) is fine, but readers should know they must include any SGs they want to keep.
- `aws_security_group_rule` (used in Fix 2) is still valid and widely used, though newer code can prefer `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule`. Not an error, just a possible future modernization.
- `aws_default_security_group` is incompatible with `aws_security_group_rule` — all rules must be managed inline on the resource. The post's example uses an empty inline configuration, which is correct.
- All AWS CLI filters used (`group-id`, `instance.group-id`, `ip-permission.group-id`, `egress.ip-permission.group-id`) are valid filter names per AWS CLI docs.
