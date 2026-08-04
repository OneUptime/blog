# Validation Summary: Measure Vendor Lock-In with a Portability Scorecard

## Status
validated

## Post Type
Technical guide / architecture review framework

## Technologies Covered
- YAML
- Managed cloud services
- Amazon S3-compatible APIs
- Google Cloud Storage
- PostgreSQL wire protocol and logical replication
- OpenID Connect (OIDC) and workload identity federation
- Open Container Initiative (OCI) images
- Kubernetes conformance, CSI, and CNI integrations
- Terraform providers and infrastructure modules
- OpenTelemetry
- AWS and Azure data transfer pricing and cloud-exit programs
- Recovery point objectives (RPO), recovery time objectives (RTO), and service-level objectives (SLOs)

## Sources Consulted
- YAML 1.2.2 specification - https://yaml.org/spec/1.2.2/
- CNCF Certified Kubernetes Software Conformance - https://www.cncf.io/training/certification/software-conformance/
- HashiCorp Terraform provider requirements - https://developer.hashicorp.com/terraform/language/providers/requirements
- PostgreSQL frontend/backend protocol - https://www.postgresql.org/docs/current/protocol.html
- PostgreSQL logical replication restrictions - https://www.postgresql.org/docs/current/logical-replication-restrictions.html
- PostgreSQL extension packaging - https://www.postgresql.org/docs/current/extend-extensions.html
- Google Cloud: Fully migrate from Amazon S3 to Cloud Storage - https://cloud.google.com/storage/docs/migrating
- Google Cloud Workload Identity Federation - https://cloud.google.com/iam/docs/workload-identity-federation
- Open Container Initiative Image Format Specification - https://specs.opencontainers.org/image-spec/
- OpenTelemetry vendor support specification - https://opentelemetry.io/docs/specs/otel/vendors/
- AWS Global Network FAQs - https://aws.amazon.com/about-aws/global-infrastructure/global-network/faqs/
- Microsoft Azure bandwidth pricing - https://azure.microsoft.com/en-us/pricing/details/bandwidth/

## Issues Found
No technical issues found.

## Review Notes
- The YAML scope example is syntactically valid and parses as a nine-field mapping.
- The example weights total 100, and the stated formula correctly normalizes weighted scores from the 0–4 evidence scale to a 0–100 relative risk indicator.
- The article correctly treats compatible interfaces as only one aspect of portability. Official Google Cloud documentation records behavioral differences from Amazon S3, PostgreSQL documents protocol and logical-replication limitations, and CNCF limits Kubernetes conformance to required APIs rather than every surrounding cloud integration.
- The identity guidance is accurate: Google Cloud Workload Identity Federation supports OIDC identity providers and replaces service account keys with token exchange and short-lived access tokens, while authorization remains expressed through Google Cloud IAM.
- The OpenTelemetry guidance is appropriately scoped to telemetry ingest portability. The vendor support specification requires support through an exporter or an OTLP receiver; it does not standardize dashboards or alert definitions, so the article correctly treats exporting those definitions as separate work.
- AWS and Azure currently document both ordinary data-transfer pricing and conditional cloud-exit programs. Eligibility and commercial terms can change, so the article's instruction to use current official pages and negotiated terms is important.
- No product versions are pinned in the post. The PostgreSQL `current` documentation and cloud pricing/exit-program links are intentionally time-sensitive and should be rechecked during future reviews.
