# Validation Summary: How to Troubleshoot Memorystore Redis Connection Issues in VPC Networks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Redis and redis-cli
- Google Cloud VPC networking
- VPC Network Peering
- Private Services Access
- Google Kubernetes Engine
- Cloud Run and Cloud Run functions
- Serverless VPC Access
- Google Cloud CLI

## Sources Consulted
- Google Cloud Memorystore for Redis networking documentation: https://docs.cloud.google.com/memorystore/docs/redis/networking
- Google Cloud Memorystore for Redis Private Services Access setup documentation: https://docs.cloud.google.com/memorystore/docs/redis/establish-connection
- Google Cloud Memorystore for Redis GKE connection documentation: https://docs.cloud.google.com/memorystore/docs/redis/connect-redis-instance-gke
- Google Cloud Memorystore for Redis supported environments documentation: https://docs.cloud.google.com/memorystore/docs/redis/supported-environments
- Google Cloud Memorystore for Redis Cloud Run functions connection documentation: https://docs.cloud.google.com/memorystore/docs/redis/connect-redis-instance-functions
- Google Cloud Memorystore for Redis AUTH management documentation: https://docs.cloud.google.com/memorystore/docs/redis/manage-redis-auth
- Google Cloud SDK reference for `gcloud redis instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud SDK reference for `gcloud redis instances get-auth-string`: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/get-auth-string
- Google Cloud SDK reference for Serverless VPC Access connector creation: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create
- Google Cloud SDK reference for Compute Engine firewall rule creation: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud VPC Network Peering documentation: https://cloud.google.com/vpc/docs/vpc-peering
- Cloud Run VPC connectors documentation: https://cloud.google.com/run/docs/configuring/vpc-connectors

## Issues Found
- The post implied all Memorystore Redis networking uses Private Services Access. Updated the wording to explain that Memorystore supports both `DIRECT_PEERING` and `PRIVATE_SERVICE_ACCESS`, and added `connectMode` to the diagnostic command.
- The post suggested plain VPC Network Peering between two application networks as a fix for clients in a different VPC. Updated it to recommend supported Shared VPC or centralized networking designs with Private Services Access, because VPC Network Peering is not transitive through the Google-managed Memorystore peering.
- The firewall section said the connection is managed through Private Services Access and that Memorystore itself does not use VPC firewall rules. Updated it to distinguish Memorystore ingress from client-side egress firewall rules and firewall policies.
- The Private Services Access section said instance creation might succeed but connectivity fail if Private Services Access is not configured. Updated it to state that Private Services Access is required for PSA mode and Shared VPC, and that missing PSA causes creation failure or the wrong networking mode for those use cases.
- The GKE section treated routes-based and VPC-native behavior too broadly. Updated it to clarify that Private Services Access requires VPC-native/IP aliasing and that routes-based clusters need the documented workaround for direct peering instances.
- The Cloud Run/Functions section said Serverless VPC Access connectors are always required. Updated it to mention Direct VPC egress as the recommended option for Cloud Run services, jobs, and Cloud Run functions, with connectors as the supported connector-based approach.
- The AUTH section said a wrong password returns `NOAUTH`. Updated it to distinguish missing credentials (`NOAUTH`) from wrong credentials (`WRONGPASS` or a similar authentication error).

## Review Notes
The local workspace does not have `gcloud` installed, so Google Cloud CLI syntax was checked against official Google Cloud SDK reference documentation instead of local `--help` output.
