# Validation Summary: How to Scale Terraform Enterprise for Large Organizations

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform Enterprise
- HCP Terraform/Terraform Enterprise APIs
- Docker Compose
- AWS Application Load Balancer and Auto Scaling
- AWS RDS for PostgreSQL
- PostgreSQL configuration
- Redis
- S3-compatible object storage
- Kubernetes Deployments and HorizontalPodAutoscaler
- HCP Terraform agents

## Sources Consulted
- HashiCorp Terraform Enterprise Docker deployment documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/docker
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise operational mode documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage/configure-mode
- HashiCorp Terraform Enterprise data storage settings overview: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage
- HashiCorp Terraform Enterprise readiness and diagnostics documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/troubleshoot/perform-diagnostics
- HashiCorp Terraform Enterprise Admin Runs API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/runs
- HashiCorp Terraform Enterprise Projects API: https://developer.hashicorp.com/terraform/enterprise/api-docs/projects
- HashiCorp HCP Terraform agent documentation: https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- Terraform AWS provider `aws_lb_target_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- AWS CLI `rds create-db-instance-read-replica` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance-read-replica.html
- PostgreSQL runtime configuration documentation: https://www.postgresql.org/docs/current/runtime-config-resource.html

## Issues Found
- The run queue depth command checked only `pending` runs, which is not the best indicator of run execution capacity. Changed it to query `plan_queued` and `apply_queued`, matching the Terraform Enterprise run statuses used for queued execution work.
- The load balancer health check used `/_health_check`, which HashiCorp now documents as deprecated for current Terraform Enterprise diagnostics. Changed it to `/api/v1/health/readiness` and used the target group's `traffic-port` value.
- The Docker Compose example used a fixed old Terraform Enterprise image tag and omitted required active-active deployment settings. Updated the image to HashiCorp's version placeholder format and added the active-active mode, license, encryption password, TLS, cache, Docker socket, read-only, tmpfs, and `IPC_LOCK` settings shown in current HashiCorp examples.
- The Redis configuration used `TFE_REDIS_PORT`, but current Terraform Enterprise maps the Redis port into `TFE_REDIS_HOST` as `HOST[:PORT]`. Moved the port into `TFE_REDIS_HOST` and added `TFE_REDIS_USE_AUTH` because the example supplies a Redis password.
- The Docker resource monitoring commands assumed a literal container named `tfe`. Updated them to resolve the Compose service container with `docker compose ps -q tfe`.
- The read replica section implied Terraform Enterprise application browsing traffic could be moved to a PostgreSQL read replica. Clarified that Terraform Enterprise should use a primary or high-availability writer endpoint and that read replicas are only appropriate for external reporting or analytics queries.

## Review Notes
Sizing and concurrency values remain general guidance and should still be load-tested for the specific Terraform Enterprise version, module workload, provider mix, and database tier.
