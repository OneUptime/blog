# Validation Summary: How to Troubleshoot Terraform Enterprise Installation Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Terraform Enterprise
- Docker and Docker Compose
- PostgreSQL
- Redis
- S3-compatible object storage
- TLS certificates
- DNS
- Linux troubleshooting tools
- AWS CLI

## Sources Consulted
- HashiCorp Developer: Deploy Terraform Enterprise to Docker overview - https://developer.hashicorp.com/terraform/enterprise/deploy/docker
- HashiCorp Developer: Terraform Enterprise configuration reference - https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Developer: PostgreSQL requirements for Terraform Enterprise - https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/requirements/data-storage/postgres-requirements
- HashiCorp Developer: Hardware and data storage requirements - https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/requirements/hardware
- HashiCorp Developer: Configure data object storage - https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage/connect-object
- HashiCorp Developer: Perform diagnostics on your Terraform Enterprise deployment - https://developer.hashicorp.com/terraform/enterprise/deploy/troubleshoot/perform-diagnostics
- HashiCorp Developer: Terraform Enterprise admin CLI reference - https://developer.hashicorp.com/terraform/enterprise/deploy/reference/cli
- HashiCorp Developer: Monitoring a Terraform Enterprise instance - https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/monitoring/monitoring
- HashiCorp Developer: Configure a Terraform Enterprise license - https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/license

## Issues Found
- The Docker prerequisite comment said Docker 20.10 was the minimum. Current HashiCorp guidance lists supported Docker Engine versions differently, with Docker 20.10 only called out for limited legacy cases, so the post now tells readers to verify a Terraform Enterprise-supported Docker Engine version.
- The list of minimum environment variables omitted current required settings such as `TFE_OPERATIONAL_MODE`, TLS certificate/key variables, and object storage type for external object storage. Added those variables to the checklist.
- The PostgreSQL extension commands created `citext`, `hstore`, and `uuid-ossp` without the schemas documented by HashiCorp. Updated the SQL to create `hstore` and `uuid-ossp` in the `rails` schema and `citext` in the `registry` schema.
- The health check section used the deprecated `/_health_check` endpoint. Replaced it with the current readiness endpoint and `tfectl app health readiness`, and added `tfectl app diagnostics` for subsystem checks.
- The object storage fixes omitted `TFE_OBJECT_STORAGE_TYPE=s3` and included `TFE_OBJECT_STORAGE_S3_USE_PATH_STYLE`, which is not present in the current Terraform Enterprise configuration reference. Added the storage type and removed the unsupported variable.
- The Docker pull command used the `latest` image tag. HashiCorp documents that `latest` is not a valid Terraform Enterprise image tag, so the command now uses the documented `<vYYYYMM-#>` version tag placeholder.
- The diagnostic collection script used the deprecated health check endpoint. Updated it to collect readiness JSON through `tfectl`.

## Review Notes
The remaining shell commands are conventional diagnostic commands and are syntactically valid, but several assume the operator has supporting tools installed in the host or container, such as `psql`, `jq`, `aws`, `redis-cli`, `iostat`, and `vmstat`. The post could later mention those prerequisites, but the commands themselves are technically sound.
