# Validation Summary: How to Install Terraform Enterprise on AWS

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Terraform
- Terraform Enterprise
- AWS EC2
- Amazon RDS for PostgreSQL
- Amazon S3
- AWS IAM
- Application Load Balancer
- Route 53
- Docker

## Sources Consulted
- HashiCorp Terraform Enterprise deployment overview: https://developer.hashicorp.com/terraform/enterprise/deploy
- HashiCorp Terraform Enterprise Docker deployment guide: https://developer.hashicorp.com/terraform/enterprise/deploy/docker
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise object storage configuration: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage/connect-object
- HashiCorp Terraform Enterprise readiness and diagnostics documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/troubleshoot/perform-diagnostics
- HashiCorp Terraform Enterprise release documentation: https://developer.hashicorp.com/terraform/enterprise/releases
- HashiCorp Terraform Enterprise 2.0.x release notes: https://developer.hashicorp.com/terraform/enterprise/releases/2.0.x
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_lb_target_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS S3 IAM action and resource guidance: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html

## Issues Found
- The Terraform Enterprise Docker example used the `latest` image tag. HashiCorp documents that `latest` is not a valid Terraform Enterprise image tag, so the post now uses a required `tfe_image_tag` variable and an explicit example tag.
- The container configuration omitted required TLS certificate settings. Terraform Enterprise requires TLS certificate and key configuration, so the post now passes PEM values into user data, writes them to the host, mounts them into the container, and sets `TFE_TLS_CERT_FILE` and `TFE_TLS_KEY_FILE`.
- The Docker run command was missing runtime mounts used by HashiCorp's Docker deployment examples, including the Docker socket and task worker cache volume. The command now mounts `/var/run/docker.sock`, configures the task worker cache volume, and uses the documented read-only and tmpfs pattern.
- The post exposed port `8800`, which is from older Replicated-era guidance. Current Terraform Enterprise admin console documentation uses port `8443` by default, so the Docker command now maps `8443`.
- The ALB target group used `/_health_check`, which is deprecated and removed in Terraform Enterprise 2.0. The health check path now uses `/api/v1/health/readiness`.
- The S3 IAM policy mixed bucket-level and object-level S3 actions in a single statement over both resource types. The policy is now split into bucket and object statements with the appropriate ARNs.
- The deployment commands generated random sensitive values during `terraform plan` but then ran `terraform apply` without the same values. The example now writes a plan file with `-out=tfplan` and applies that exact plan with `terraform apply tfplan`.
- The summary said to enable RDS Multi-AZ even though the example already enabled it. The wording now says to keep RDS Multi-AZ enabled.

## Review Notes
- The guide remains a simplified single-node external-services deployment. For production resilience, HashiCorp's current guidance favors official Terraform Enterprise modules or HashiCorp Validated Designs, and active-active deployments require additional shared services such as external Redis.
- Terraform Enterprise 2.0.1 was the latest documented 2.0.x Docker-capable release found during review, but the post correctly leaves the image tag as an input because operators should choose a supported target release for their upgrade path.
