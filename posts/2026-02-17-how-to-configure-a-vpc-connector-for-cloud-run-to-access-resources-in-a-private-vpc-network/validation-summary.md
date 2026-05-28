# Validation Summary: How to Configure a VPC Connector for Cloud Run to Access Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Serverless VPC Access connectors
- Direct VPC egress
- Google Cloud CLI
- VPC firewall rules
- Memorystore for Redis
- Cloud SQL private IP
- Python, Flask, Redis client, Requests
- Cloud Monitoring

## Sources Consulted
- Cloud Run documentation: VPC with connectors: https://docs.cloud.google.com/run/docs/configuring/vpc-connectors
- Virtual Private Cloud documentation: Send serverless traffic to a VPC network: https://docs.cloud.google.com/vpc/docs/serverless-vpc-access
- Cloud Run documentation: Direct VPC egress with a VPC network: https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc
- Cloud Run documentation: Compare Direct VPC egress and VPC connectors: https://docs.cloud.google.com/run/docs/configuring/connecting-vpc
- Google Cloud SDK reference: gcloud run deploy: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK reference: gcloud compute networks vpc-access connectors create/update: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors
- Memorystore for Redis documentation: Connect to a Redis instance from a Cloud Run service: https://docs.cloud.google.com/memorystore/docs/redis/connect-redis-instance-cloud-run
- Cloud SQL for PostgreSQL documentation: Connect from Cloud Run: https://cloud.google.com/sql/docs/postgres/connect-run
- Cloud Monitoring metric list for VPC Access connector metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z

## Issues Found
- Corrected the connector subnet explanation. Serverless VPC Access connectors require a `/28` subnet or unused `/28` CIDR range; high-throughput connectors should use more instances or a larger supported machine type, not a larger subnet.
- Removed `--subnet-project=my-project` from the same-project connector creation example. Google Cloud documentation says to omit this flag when the connector and existing subnet are in the same project.
- Updated the `e2-micro` guidance. Official documentation warns that `f1-micro` and `e2-micro` can run into shared CPU and connection tracking limits with high concurrency or frequent small requests, and recommends `e2-standard-4` for those production workloads.
- Corrected the `private-ranges-only` description. It routes internal address destinations including RFC 1918, RFC 6598, and Private Google Access IP ranges, not only RFC 1918.
- Fixed the Python test route docstring because the sample uses an IP address and does not test DNS resolution.
- Clarified firewall rule guidance. Google Cloud creates connector firewall rules automatically in standalone VPC networks and Shared VPC host projects, while Shared VPC service projects can require user-created rules. Also changed the Redis firewall example to refer to a self-managed Redis VM because Compute Engine target tags do not target Memorystore instances.
- Updated the throughput claim. Official documentation lists estimated throughput ranges by connector machine type; e2-micro connectors are listed as 200-1000 Mbps across their instance range, not about 100 Mbps per instance.

## Review Notes
The post is technically relevant and current after the fixes. Direct VPC egress is now the recommended path for many Cloud Run VPC access use cases, but the connector-based tutorial remains valid for environments where connectors are still required.
