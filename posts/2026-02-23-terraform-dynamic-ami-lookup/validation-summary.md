# Validation Summary: How to Use Data Sources for Dynamic AMI Lookup in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS EC2 AMIs
- Terraform HCL
- Ubuntu AMIs on AWS
- Amazon Linux 2023 AMIs
- Windows Server AMIs on AWS

## Sources Consulted
- Terraform Registry, AWS provider `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform language data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS CLI `ec2 describe-images` filter documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html
- AWS EC2 shared AMI and owner alias documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/sharing-amis.html
- Ubuntu on AWS documentation for finding Ubuntu AMIs: https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/
- Ubuntu on AWS launch documentation confirming Canonical owner ID: https://documentation.ubuntu.com/aws/aws-how-to/instances/launch-ubuntu-ec2-instance/
- Amazon Linux 2023 EC2 documentation: https://docs.aws.amazon.com/linux/al2023/ug/ec2.html
- CentOS AWS AMI image documentation: https://www.centos.org/download/aws-images
- Red Hat documentation for RHEL AMI owner ID: https://access.redhat.com/solutions/15356

## Issues Found
- The common owner alias list described `"amazon"` as AWS Marketplace. Terraform and AWS documentation distinguish `amazon` for Amazon-owned AMIs from `aws-marketplace` for AWS Marketplace AMIs. Updated the comment to list both aliases correctly.
- The "Latest Ubuntu LTS" example used Ubuntu 24.04 (`noble-24.04`). Canonical's current AWS documentation lists Ubuntu 26.04 (`resolute-26.04`) as an available release, so the example was updated to use `ubuntu-resolute-26.04` and the data source name was changed from `ubuntu_2404` to `ubuntu_2604`.

## Review Notes
- The remaining Terraform snippets use valid `aws_ami` arguments such as `owners`, `most_recent`, `filter`, and `name_regex`.
- AWS EC2 filter names used in the examples, including `name`, `virtualization-type`, `architecture`, `state`, and `tag:<key>`, match the documented `describe-images` filters.
- The two OneUptime cross-links in the summary returned HTTP 200 during validation.
