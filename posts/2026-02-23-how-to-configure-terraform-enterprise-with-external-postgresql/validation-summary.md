# Validation Summary: How to Configure Terraform Enterprise with External PostgreSQL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Terraform Enterprise
- Terraform Enterprise Flexible Deployment Options
- PostgreSQL
- AWS RDS for PostgreSQL
- Docker and Docker Compose
- Kubernetes Helm chart configuration
- PostgreSQL backup and restore tooling

## Sources Consulted
- HashiCorp Terraform Enterprise external PostgreSQL connection documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage/connect-database/postgres
- HashiCorp Terraform Enterprise PostgreSQL requirements: https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/requirements/data-storage/postgres-requirements
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise Kubernetes deployment documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/kubernetes
- HashiCorp Terraform Enterprise backup and restore documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/manage/backup-restore
- HashiCorp Terraform Enterprise disk-to-external migration documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/administration/infrastructure/mounted-to-external-migration
- HashiCorp Terraform Enterprise releases documentation: https://developer.hashicorp.com/terraform/enterprise/releases
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- PostgreSQL libpq connection and SSL mode documentation: https://www.postgresql.org/docs/current/libpq-connect.html

## Issues Found
- The post described only "embedded" and "external" database modes. Updated the wording to current Terraform Enterprise disk, external, and active-active modes.
- The PostgreSQL version range was outdated. Updated it from versions 12 through 16 to the current supported range: 13.x, 14.4 and later 14.x, 15.x, 16.x, and 17.x.
- The RDS example set `skip_final_snapshot = false` without `final_snapshot_identifier`, which would fail during deletion. Added a final snapshot identifier.
- The RDS parameter group comment incorrectly implied extensions are configured through the parameter group. Changed it to describe custom PostgreSQL settings.
- The database setup only created the `citext` extension. Added the required Terraform Enterprise schemas and the required `hstore`, `uuid-ossp`, and `citext` extensions in their documented schemas.
- The Docker and Docker Compose examples used the invalid `latest` Terraform Enterprise image tag and old port/volume assumptions. Replaced `latest` with a version tag variable and updated the examples to use current FDO-style ports, TLS certificate paths, Docker socket mount, cache volume, and S3 credential variables.
- The database host/port examples used a separate `TFE_DATABASE_PORT` variable. Updated them to the documented `TFE_DATABASE_HOST` `HOST[:PORT]` format.
- The Helm values example used unsupported `tfe.database.*` keys. Replaced it with the documented `env.variables` and `env.secrets` pattern.
- The SSL mode list included `allow` and `prefer`, which are libpq modes but are not valid values in Terraform Enterprise's documented `TFE_DATABASE_PARAMETERS` SSL mode set. Removed them from the Terraform Enterprise-focused list.
- The disk-to-external migration commands stopped the container and then attempted `docker exec`, and they bypassed Terraform Enterprise's supported backup/restore workflow. Replaced the section with the documented backup and restore API flow.
- The troubleshooting extension check only looked for `citext`. Updated it to verify all required extensions and schemas.

## Review Notes
The PostgreSQL tuning values are reasonable examples but should still be treated as workload- and instance-size-dependent rather than universal recommendations. The guide now avoids the unsupported `latest` Terraform Enterprise image tag by using a placeholder version variable; readers still need to choose a supported release for their upgrade path.
