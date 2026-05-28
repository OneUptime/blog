# Validation Summary: How to Design a Multi-Region Active-Active Architecture on GCP Using Global

## Status
validated

## Post Type
Tutorial / Architecture guide

## Technologies Covered
- Google Cloud Platform
- Cloud Run
- Cloud Spanner
- Global external Application Load Balancer
- Serverless network endpoint groups
- Google Cloud CLI
- Python Flask
- Google Cloud Spanner Python client

## Sources Consulted
- Google Cloud Spanner instance configurations: https://docs.cloud.google.com/spanner/docs/instance-configurations
- Google Cloud Spanner reads and timestamp bounds: https://docs.cloud.google.com/spanner/docs/reads and https://docs.cloud.google.com/spanner/docs/timestamp-bounds
- Google Cloud Spanner Python client Snapshot reference: https://docs.cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_v1.snapshot.Snapshot
- Google Cloud CLI `gcloud spanner instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- Google Cloud global external Application Load Balancer with Cloud Run/serverless NEGs: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud serverless NEG concepts and limitations: https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- Google Cloud CLI backend service export/import: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/export and https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/import
- Cloud Run ingress settings: https://docs.cloud.google.com/run/docs/securing/ingress
- Cloud Run public access and IAM invoker behavior: https://cloud.google.com/run/docs/authenticating/public
- Google Cloud CLI `gcloud run deploy`: https://cloud.google.com/sdk/gcloud/reference/run/deploy

## Issues Found
- The Spanner consistency description overstated the guarantee and used an unsupported "without sacrificing availability" framing. Updated it to describe external consistency, strong reads, synchronous replication, and no application-level conflict resolution.
- Multi-region Spanner configurations require Enterprise Plus edition. Added `--edition=ENTERPRISE_PLUS` to the instance creation command.
- The Spanner DDL examples had trailing commas before closing table definitions. Removed them for valid GoogleSQL DDL.
- Cloud Run was deployed with `--no-allow-unauthenticated`, which would block public load-balanced traffic unless another authentication layer was configured. Changed the deployments to `--allow-unauthenticated` and restricted ingress to `internal-and-cloud-load-balancing`.
- The health endpoint did not consume the Spanner result stream, so it might not actually verify database connectivity. Updated it to materialize the `SELECT 1` result.
- The global forwarding rule omitted `--load-balancing-scheme=EXTERNAL_MANAGED` and `--network-tier=PREMIUM`, which are required for the documented global external Application Load Balancer pattern with multi-region serverless NEGs. Added both flags.
- The post configured health checks on a backend service with serverless NEG backends, but Google Cloud does not support health checks for serverless NEGs. Replaced that section with the supported outlier detection workflow.
- The stale-read comment claimed stale reads avoid cross-region round trips. Reworded it to say exact-staleness reads can often be served by a closer replica.

## Review Notes
The architecture is technically valid after the fixes. In production, the example would also need explicit IAM/service account setup for Cloud Run to access Spanner, DNS configuration before managed certificate activation, application-level error handling for failed transactions, and observability around outlier detection because serverless NEG failover is based on observed 5xx patterns rather than active health checks.
