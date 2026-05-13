# Validation Summary: How to Deploy Cloud SQL Auth Proxy with Flux on GKE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- Workload Identity Federation for GKE
- Cloud SQL Auth Proxy
- Cloud SQL for PostgreSQL and MySQL
- Flux CD
- Kubernetes Deployments and ServiceAccounts
- GitOps

## Sources Consulted
- Google Cloud SQL: Connect to Cloud SQL from Google Kubernetes Engine, https://docs.cloud.google.com/sql/docs/mysql/connect-kubernetes-engine
- Google Cloud SQL for PostgreSQL: Connect using the Cloud SQL Auth Proxy, https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Google Kubernetes Engine: Authenticate to Google Cloud APIs from GKE workloads, https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Kubernetes Engine: About Workload Identity Federation for GKE, https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Flux CLI reference: flux bootstrap github, https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux source-controller documentation: GitRepository, https://fluxcd.io/flux/components/source/gitrepositories/
- Flux kustomize-controller documentation: Kustomization, https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The description and introduction implied that Cloud SQL Auth Proxy eliminates all database credential management. The proxy authenticates the connection to the Cloud SQL instance using IAM, but the application still needs database-level credentials unless another database authentication method is configured. Changed the wording to say it avoids static service account keys.
- The prerequisites omitted the Cloud SQL Admin API, which the Cloud SQL Auth Proxy requires. Added the API as a prerequisite.
- The GKE command used `--region`; the current GKE Workload Identity Federation documentation shows `--location`, which works for both regional and zonal clusters. Updated the command to use `--location`.
- The Workload Identity setup did not mention enabling the GKE metadata server on existing Standard cluster node pools. Added the `gcloud container node-pools update ... --workload-metadata=GKE_METADATA` command.
- The Deployment configured the application for a Unix socket path while starting Cloud SQL Auth Proxy with a TCP port. Updated the connection string and comment to use `127.0.0.1:5432`, matching the proxy's `--port=5432` configuration.
- The Cloud SQL Auth Proxy image tag was older than the current version shown in the official Cloud SQL Auth Proxy documentation. Updated the pinned example from `2.11.0` to `2.21.3`.
- The conclusion said Workload Identity eliminates static credentials. Changed this to static Google service account keys to avoid implying that database user credentials are unnecessary.

## Review Notes
The Flux `GitRepository` and `Kustomization` API versions and fields are current. The `flux bootstrap github` flags used in the post are valid. The post uses IAM service account impersonation for GKE Workload Identity Federation, which remains supported, although Google's current guidance generally prefers direct IAM principal identifiers when the target API supports them.
