# Validation Summary: How to Configure Terraform Enterprise with Redis

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform Enterprise
- Redis
- AWS ElastiCache for Redis OSS
- Azure Cache for Redis
- Docker Compose
- Kubernetes Helm
- AWS CLI
- Azure CLI

## Sources Consulted
- HashiCorp Terraform Enterprise Redis data store connection documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage/connect-redis
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise Kubernetes deployment documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/kubernetes
- AWS CLI `elasticache create-replication-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- Microsoft Azure CLI `az redis` command reference: https://learn.microsoft.com/en-us/cli/azure/redis
- Redis TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/

## Issues Found
- The post described external Redis as a general production requirement. HashiCorp documents external Redis as required for active-active mode, while disk and external services modes can use Terraform Enterprise-managed Redis. Updated the wording to align with current operational-mode requirements.
- The Azure CLI example used `--enable-non-ssl-port false`, but `--enable-non-ssl-port` is a flag that enables the non-SSL port when present. Removed the flag and normalized the Premium cache size to `p1`, matching Azure CLI examples and accepted values.
- The Azure section omitted the current Terraform Enterprise requirement for a separate Sidekiq Redis endpoint when using Azure managed Redis services. Added a note and corresponding Sidekiq environment variables.
- The Terraform Enterprise environment variable examples used `TFE_REDIS_PORT`, but current HashiCorp documentation configures Redis as `TFE_REDIS_HOST` in `HOST[:PORT]` format. Updated the examples to include the port in `TFE_REDIS_HOST`.
- The Terraform Enterprise examples supplied a password without `TFE_REDIS_USE_AUTH=true`. Added the required auth flag wherever Redis password authentication is shown.
- The post referenced `TFE_REDIS_URL`, which is not present in the current Terraform Enterprise configuration reference. Removed that example.
- The Docker Compose example used the `latest` Terraform Enterprise image tag. HashiCorp documentation says `latest` is not a valid tag for Terraform Enterprise images. Replaced it with the documented `<vYYYYMM-#>` placeholder.
- The custom Redis CA example used `TFE_REDIS_CA_CERT_FILE`, which does not match the current configuration reference. Updated it to use `TFE_TLS_CA_BUNDLE_FILE` for adding a custom CA bundle.
- The Helm chart example used a non-documented `tfe.redis` values structure. Updated it to the documented `env.variables` and `env.secrets` pattern used by the Terraform Enterprise Helm chart.

## Review Notes
The AWS ElastiCache, Redis TLS, Redis persistence, Redis eviction, and Redis CLI examples were broadly consistent with the referenced official documentation. The memory sizing and latency recommendations are practical guidance rather than strict vendor requirements.
