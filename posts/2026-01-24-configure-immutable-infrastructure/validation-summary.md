# Validation Summary: How to Configure Immutable Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Immutable infrastructure
- HashiCorp Packer
- Terraform
- AWS EC2, AMIs, Launch Templates, Auto Scaling Groups, and Elastic Load Balancing
- Kubernetes Deployments, ConfigMaps, and container image digests
- External Secrets Operator
- GitHub Actions

## Sources Consulted
- HashiCorp Packer Amazon EBS builder documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/amazon/latest/components/builder/ebs
- Terraform AWS provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider `aws_lb_listener_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- Terraform AWS provider `aws_lb_target_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes container image documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- GitHub Actions job output documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs

## Issues Found
- The Packer example used a hard-coded AMI ID labeled as Ubuntu 22.04 LTS. Hard-coded public AMI IDs are region-specific and become stale, and the cited example ID is not a reliable current Ubuntu 22.04 source. Replaced it with a Canonical-owned `source_ami_filter` for the latest Ubuntu Jammy 22.04 HVM EBS AMI.
- The Terraform Auto Scaling Group used `version = "$Latest"` for the launch template. While valid, Terraform's own AWS provider examples use `aws_launch_template.example.latest_version` when the ASG should refresh after launch template updates. Updated the snippet to reference `aws_launch_template.app.latest_version`.
- The launch template `user_data` ran `/usr/local/bin/app` directly even though the AMI had already installed and enabled a systemd service. That could duplicate the service or block cloud-init. Changed it to start the baked `app` service with systemd.
- The Kubernetes Deployment image digest used `sha256:abc123...`, which is not a valid SHA-256 digest form. Replaced it with a full 64-hex-character digest placeholder.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Current External Secrets Operator documentation uses `external-secrets.io/v1`; updated the example API version.

## Review Notes
The Terraform snippets remain illustrative and still assume surrounding resources and variables exist, such as subnets, security groups, listeners, IAM instance profiles, target groups, and provider authentication. The Kubernetes ConfigMap example stores `${DB_HOST}` literally unless the application or a templating step expands it.
