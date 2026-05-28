# Validation Summary: How to Manage Cloud SQL Instances Using Config Connector in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- Config Connector
- Kubernetes and GKE
- Private Service Access
- Cloud SQL Auth Proxy
- Google Cloud CLI

## Sources Consulted
- Config Connector SQLInstance reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqlinstance
- Config Connector SQLDatabase reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqldatabase
- Config Connector SQLUser reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqluser
- Config Connector ComputeAddress reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/compute/computeaddress
- Config Connector ServiceNetworkingConnection reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/servicenetworking/servicenetworkingconnection
- Cloud SQL Auth Proxy documentation: https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Cloud SQL from GKE documentation: https://docs.cloud.google.com/sql/docs/postgres/connect-kubernetes-engine
- Cloud SQL PostgreSQL instance settings: https://docs.cloud.google.com/sql/docs/postgres/instance-settings
- gcloud services enable reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/enable
- Kubernetes kubectl wait reference: https://v1-35.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The Private Service Access IP range used `kind: ComputeGlobalAddress`, which is not the current Config Connector resource kind. Changed it to `kind: ComputeAddress` and added `location: global`, matching the official Config Connector ComputeAddress schema for global addresses.
- The prerequisite section only enabled the Cloud SQL Admin API and only granted `roles/cloudsql.admin`. Because the tutorial also creates Compute and Service Networking resources, added the Compute Engine and Service Networking APIs plus the networking roles needed by the Config Connector service account.
- The Cloud SQL instance used the legacy `requireSsl` field. Changed it to `sslMode: ENCRYPTED_ONLY`, which Cloud SQL documentation recommends for enforcing encrypted connections without requiring client certificates.
- The maintenance window comment omitted that Cloud SQL maintenance window hours are UTC. Updated the comment to say UTC.
- The Cloud SQL Auth Proxy sidecar used an outdated image tag. Updated the example from `2.8.0` to `2.22.0`, the current version shown in official Cloud SQL Auth Proxy documentation at review time.
- The sidecar example connects to a private-IP-only instance but did not include the required `--private-ip` flag. Added the flag.
- The GKE connection example did not state that the workload identity used by the pod needs Cloud SQL Client permissions. Added a sentence noting that the Kubernetes service account must authenticate to Google Cloud and have `roles/cloudsql.client`.

## Review Notes
The examples are otherwise consistent with the current Config Connector resource schemas and Cloud SQL Auth Proxy guidance. The post intentionally uses sample names and placeholders, so readers still need to adapt project IDs, service accounts, and network resource names for their environment.
