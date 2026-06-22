# Validation Summary: How to Set Up Google Cloud Memorystore for Redis

## Status
validated

## Post Type
Technical tutorial / infrastructure guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Redis
- Google Cloud CLI
- Terraform Google provider
- Private Service Access and VPC networking
- Cloud Monitoring
- GKE and Cloud Functions
- Python, Node.js, and Go Redis clients

## Sources Consulted
- Google Cloud CLI reference: `gcloud redis instances create` - https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud CLI reference: `gcloud redis instances update` - https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/update
- Google Cloud CLI reference: `gcloud redis instances export` - https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/export
- Google Cloud CLI reference: `gcloud redis instances import` - https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/import
- Google Cloud CLI reference: `gcloud redis instances get-auth-string` - https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/get-auth-string
- Memorystore for Redis read replicas documentation - https://docs.cloud.google.com/memorystore/docs/redis/manage-read-replicas
- Memorystore for Redis in-transit encryption documentation - https://docs.cloud.google.com/memorystore/docs/redis/manage-in-transit-encryption
- Memorystore for Redis connection documentation - https://docs.cloud.google.com/memorystore/docs/redis/connect-redis-instance
- Memorystore for Redis networking documentation - https://docs.cloud.google.com/memorystore/docs/redis/networking
- Memorystore for Redis monitoring metrics documentation - https://docs.cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics
- Terraform Google provider `google_redis_instance` documentation - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/redis_instance.html

## Issues Found
- The `gcloud redis instances create` and `update` examples used `--auth-enabled`, but the current Google Cloud CLI flag is `--enable-auth`. Updated all affected commands.
- The TLS client examples defaulted to port `6379` and did not install/use Memorystore's server CA. Updated the Python, Node.js, and Go examples to use TLS port `6378` and a CA certificate path.
- The import and export examples placed the instance ID before the Cloud Storage object. Updated the commands to match the documented positional order: Cloud Storage URI first, instance ID second.
- The transit encryption security example used `gcloud redis instances update`, but Memorystore only supports enabling in-transit encryption during instance creation. Updated the text and command accordingly.
- The dashboard used stale metric names for commands and hit rate. Updated them to `redis.googleapis.com/commands/calls` and `redis.googleapis.com/stats/cache_hit_ratio`.

## Review Notes
The post remains a valid technical tutorial. `gcloud` and Terraform were not installed locally, so command and provider validation were performed against official Google Cloud CLI, Memorystore, Cloud Monitoring, and Terraform provider documentation.
