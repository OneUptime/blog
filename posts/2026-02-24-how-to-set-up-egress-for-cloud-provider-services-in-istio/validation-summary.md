# Validation Summary: How to Set Up Egress for Cloud Provider Services in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Istio REGISTRY_ONLY outbound traffic policy
- Envoy access logs and stats
- AWS S3, SQS, SNS, DynamoDB, RDS, STS, and EC2 metadata
- Google Cloud APIs and GKE metadata server
- Azure Storage, Microsoft Entra ID, Azure SQL Database, and Azure Cosmos DB

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DNS behavior: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio external services and REGISTRY_ONLY mode: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio TLS origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio Envoy statistics: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- AWS service endpoints: https://docs.aws.amazon.com/general/latest/gr/rande.html
- Amazon EKS IRSA SDK behavior: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts-minimum-sdk.html
- Amazon EKS identity and access management best practices: https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- Amazon EC2 instance metadata: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
- Google Cloud metadata server endpoints: https://cloud.google.com/compute/docs/metadata/querying-metadata
- GKE Workload Identity Federation metadata server: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud Storage request endpoints: https://cloud.google.com/storage/docs/request-endpoints
- Google Cloud Pub/Sub service endpoints: https://cloud.google.com/pubsub/docs/reference/service_apis_overview
- BigQuery regional endpoints: https://cloud.google.com/bigquery/docs/regional-endpoints
- Azure Storage account endpoints: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview
- Azure SQL Database network access endpoint format: https://learn.microsoft.com/en-us/azure/azure-sql/database/network-access-controls-overview
- Azure Cosmos DB REST document endpoint format: https://learn.microsoft.com/en-us/rest/api/cosmos-db/list-documents

## Issues Found
- The wildcard ServiceEntry note said Istio cannot do DNS lookups on wildcard entries. Updated it to explain that `resolution: NONE` is common for application-resolved destinations, while newer Istio versions also support `DYNAMIC_DNS` for wildcard HTTP and TLS destinations when the host can be recovered from Host/SNI.
- The STS section claimed almost every AWS SDK call starts with STS. Changed this to the more accurate statement that many credential flows, including IRSA, use STS for temporary credentials.
- The AWS metadata section incorrectly grouped IRSA with EC2 instance metadata. Updated it to state that IRSA uses STS `AssumeRoleWithWebIdentity` and does not use the EC2 metadata endpoint.
- The Azure authentication heading used the old Azure Active Directory name. Updated it to Microsoft Entra ID while preserving the intent.
- The S3 DestinationRule example included `tls.mode: SIMPLE` even though the surrounding ServiceEntries describe applications making TLS connections directly to cloud service endpoints. Removed the TLS origination setting because Istio `SIMPLE` TLS origination is for cases where the application sends HTTP and the proxy initiates TLS upstream.
- The Envoy stats command used `/stats`; the current Istio documentation shows `pilot-agent request GET stats`. Updated the command accordingly.

## Review Notes
All YAML examples were parsed successfully after edits. The snippets are practical examples and intentionally list only selected regions and services; users still need to add their own regions, RDS hostnames, account-specific Azure hosts, and any additional SDK endpoints their applications call.
