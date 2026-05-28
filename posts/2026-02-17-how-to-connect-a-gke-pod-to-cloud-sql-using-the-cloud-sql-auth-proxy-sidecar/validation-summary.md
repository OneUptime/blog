# Validation Summary: How to Connect a GKE Pod to Cloud SQL Using the Cloud SQL Auth Proxy Sidecar

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine
- Cloud SQL for PostgreSQL
- Cloud SQL Auth Proxy
- Workload Identity Federation for GKE
- Kubernetes Deployments, ServiceAccounts, Secrets, NetworkPolicies, probes, and sidecar containers
- External Secrets Operator
- Prometheus scraping annotations

## Sources Consulted
- Google Cloud: Connect from Google Kubernetes Engine to Cloud SQL: https://cloud.google.com/sql/docs/postgres/connect-kubernetes-engine
- Google Cloud: Connect using the Cloud SQL Auth Proxy: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Google Cloud: About the Cloud SQL Auth Proxy: https://cloud.google.com/sql/docs/postgres/sql-proxy
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GoogleCloudPlatform/cloud-sql-proxy README and command reference: https://github.com/GoogleCloudPlatform/cloud-sql-proxy
- Kubernetes: Sidecar Containers: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- External Secrets Operator: ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator: Google Cloud Secret Manager provider: https://external-secrets.io/latest/provider/google-secrets-manager/

## Issues Found
- The post did not include enabling the Cloud SQL Admin API, which is required for Cloud SQL Auth Proxy usage. Added `gcloud services enable sqladmin.googleapis.com`.
- The examples used the older `gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0` image. Updated examples to `2.22.0` to use a current v2 image from the official proxy documentation.
- The health check examples used `--health-check` and Kubernetes HTTP probes without setting `--http-address`. The proxy health server listens on localhost by default, so the examples now bind it to `0.0.0.0` for Kubernetes HTTP probes.
- The main deployment did not explicitly set the proxy listener port. Added `--port=5432` so the application's `DB_PORT=5432` is deterministic and avoids relying on database engine detection.
- The private IP example did not state the VPC-native / network-path requirement. Added a note that the GKE cluster must be VPC-native and have access to the Cloud SQL instance VPC.
- The native sidecar section implied Kubernetes 1.28+ support without noting the feature gate. Updated it to say Kubernetes 1.29+ by default, or 1.28 with the feature gate enabled.
- The quit endpoint example used `--http-port` for `/quitquitquit`, but the quit endpoint belongs to the proxy admin server. Changed it to `--admin-port=9090`.
- The multiple-instance example used repeated `--port` flags, which is not the documented way to set distinct per-instance ports. Changed it to use the official instance query parameter syntax, such as `?port=5432`.
- The NetworkPolicy example allowed only the Cloud SQL private IP range, which would omit the SQL Admin API egress requirement. Added TCP 443 egress and kept TCP 3307 for the Cloud SQL private IP range.
- The monitoring section added Prometheus scrape annotations but did not enable the proxy Prometheus endpoint. Added the required `--prometheus` argument example.

## Review Notes
The post remains a valid GKE-to-Cloud-SQL tutorial. Future updates should periodically refresh the Cloud SQL Auth Proxy image tag and consider switching the primary deployment example to native sidecars, which Google Cloud's current GKE Cloud SQL documentation now recommends unless Cloud Service Mesh or Istio requires using regular containers.
