# Validation Summary: How to Connect Memorystore Redis to GKE Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Kubernetes Engine (GKE)
- Kubernetes Secrets and Deployments
- External Secrets Operator
- Google Secret Manager
- Kubernetes NetworkPolicy
- Terraform (Google provider)
- Python (redis-py)
- Node.js (ioredis)
- gcloud CLI
- kubectl

## Sources Consulted
- Google Cloud Memorystore for Redis documentation: https://cloud.google.com/memorystore/docs/redis
- gcloud redis instances create reference: https://cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- External Secrets Operator documentation: https://external-secrets.io/
- Terraform google_redis_instance resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/redis_instance
- Terraform google_secret_manager_secret resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret

## Issues Found

1. **Incorrect TLS port in architecture diagram**: The diagram stated "Port: 6379 (or 6378 for TLS)". Memorystore for Redis uses port 6379 for both TLS and non-TLS connections; there is no separate port 6378. Fixed to "Port: 6379 (TLS uses the same port)".

2. **Wrong gcloud flag `--secondary-zone`**: The `gcloud redis instances create` command used `--secondary-zone=us-central1-b`. The correct flag name is `--alternative-zone`. Fixed to `--alternative-zone=us-central1-b`.

3. **Variable mismatch in test connectivity command**: The `kubectl run redis-test` command set `--env="REDIS_HOST=$REDIS_IP"` inside the pod but then referenced `$REDIS_HOST` in the `redis-cli` command arguments. Since command arguments after `--` are expanded by the local shell (not inside the pod), `$REDIS_HOST` would be empty while `$REDIS_IP` is the correct local variable. Removed the unused `--env` flags and changed the redis-cli command to use `$REDIS_IP` and `$REDIS_AUTH` directly.

4. **Deprecated Terraform replication block syntax**: The `google_secret_manager_secret` resource used `replication { automatic = true }`, which is deprecated in Terraform Google provider v5+. Fixed to `replication { auto {} }`.

5. **Incorrect cloud terminology in summary**: The summary referenced "peered VNets" which is Azure terminology. Google Cloud uses "VPCs". Fixed to "peered VPCs".

## Review Notes
- The Terraform `authorized_network` is set to `data.google_container_cluster.gke.network`, which returns the network name. The `google_redis_instance` resource may need the full network self-link (`projects/{project}/global/networks/{name}`) depending on the provider version. Current provider versions handle name-to-self-link resolution automatically, so this works but could be made more explicit.
- The External Secrets Operator YAML uses `apiVersion: external-secrets.io/v1beta1`, which is the current stable API version. This should be monitored for graduation to v1.
- The Python and Node.js application code examples are correct and follow best practices for connecting to Memorystore from GKE pods (connection pooling, retry strategies, failover handling).
- The NetworkPolicy example correctly restricts egress to the Memorystore private IP, but note that pods with this policy will also have all other egress blocked (including DNS). In practice, a DNS egress rule may also be needed unless the application resolves Redis by IP only.
