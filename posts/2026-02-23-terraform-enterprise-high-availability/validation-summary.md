# Validation Summary: How to Handle Terraform Enterprise High Availability

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform Enterprise
- Terraform Enterprise active-active high availability
- Docker Compose
- AWS RDS Aurora PostgreSQL
- Amazon ElastiCache for Redis
- AWS Application Load Balancer
- AWS Auto Scaling Groups and launch templates
- AWS Secrets Manager
- AWS CLI
- curl and jq

## Sources Consulted
- HashiCorp Terraform Enterprise Docker deployment documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/docker
- HashiCorp Terraform Enterprise Docker scaling documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/docker/scale
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise operational mode requirements: https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/requirements/data-storage/operational-mode-requirements
- HashiCorp Terraform Enterprise data storage settings overview: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage
- HashiCorp Terraform Enterprise monitoring documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/monitoring/monitoring
- HashiCorp Terraform Enterprise releases documentation: https://developer.hashicorp.com/terraform/enterprise/releases
- Terraform AWS provider `aws_elasticache_replication_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS provider `aws_rds_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider `aws_lb_target_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group

## Issues Found
- The Redis prerequisite said self-managed Redis Sentinel/Cluster was acceptable. HashiCorp documents that Redis Cluster is not supported for Terraform Enterprise active-active mode, so the wording now recommends Redis with Sentinel for failover and explicitly states that Redis Cluster is unsupported.
- The Docker Compose example did not set `TFE_OPERATIONAL_MODE` to `active-active` or include the required shared `TFE_ENCRYPTION_PASSWORD`. Both settings were added.
- The Redis configuration used `TFE_REDIS_PORT`, which is not a current Terraform Enterprise environment variable. The Redis host is now expressed as `HOST:PORT`, and `TFE_REDIS_USE_AUTH` was added so the configured password is used.
- The Docker Compose example did not include the Docker socket mount or Terraform Enterprise cache volume required for the Docker run pipeline driver. These were added following HashiCorp's Docker Compose examples.
- The Docker Compose example used a top-level `version` field. Current Docker Compose examples no longer require it, so it was removed.
- The image tag used an old pinned release. It was replaced with HashiCorp's documented `<vYYYYMM-#>` placeholder so readers choose a supported release rather than copying a stale version.
- The prerequisites omitted the active-active internal Vault traffic requirement. A note was added that port 8201 must be open between nodes unless external Vault is used.
- The operational guidance incorrectly said active-active upgrades can be handled as normal rolling ASG refreshes. HashiCorp documents that active-active version upgrades require draining and scaling down to a single node before upgrading, so the guidance was corrected.
- The scaling-down note overstated ASG behavior. It now points to the load balancer target group's deregistration delay as the connection-draining mechanism.

## Review Notes
The Terraform snippets are illustrative and still depend on omitted surrounding resources such as subnet groups, security groups, IAM roles, the S3 bucket, certificates, variables, and target attachments. The examples are technically plausible, but a production deployment should pin provider versions, validate supported Terraform Enterprise releases, define security group rules for Redis, PostgreSQL, load balancer, Docker, and Vault traffic, and test the bootstrap script in a real AMI.
