# Validation Summary: How to Connect to Memorystore Redis from a GKE Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Kubernetes Engine
- Kubernetes Deployments, Services, Secrets, and ConfigMaps
- Google Cloud CLI
- kubectl
- Redis and redis-cli
- Python, Flask, and redis-py

## Sources Consulted
- Google Cloud Memorystore for Redis: Connect to a Redis instance from a GKE cluster: https://docs.cloud.google.com/memorystore/docs/redis/connect-redis-instance-gke
- Google Cloud Memorystore for Redis: Create and manage Redis instances: https://docs.cloud.google.com/memorystore/docs/redis/create-manage-instances
- Google Cloud SDK reference: gcloud redis instances create: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud Memorystore for Redis: Networking: https://docs.cloud.google.com/memorystore/docs/redis/networking
- Google Cloud Memorystore for Redis: Manage Redis AUTH: https://docs.cloud.google.com/memorystore/docs/redis/manage-redis-auth
- Google Kubernetes Engine: Create a VPC-native cluster: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/alias-ips
- Kubernetes documentation: Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes documentation: Managing Secrets using kubectl: https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kubectl/
- Kubernetes documentation: Configure a Pod to Use a ConfigMap: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- redis-py documentation: Connecting to Redis: https://redis.readthedocs.io/en/latest/connections.html
- Redis documentation: redis-py connection pools and production usage: https://redis.io/docs/latest/develop/clients/redis-py/connect/

## Issues Found
- The networking prerequisite said GKE could connect when the VPC network "matches (or peers with)" the Redis instance network. Google documents the GKE requirement as using the same authorized network, so the wording was corrected.
- The VPC-native description said Pods get addresses from a VPC subnet. GKE VPC-native clusters use alias IPs from secondary ranges, so the wording and diagram label were corrected.
- The route-based cluster guidance said a custom route was required. Google documents an iptables workaround for non-IP-alias clusters connecting to direct peering instances, so the guidance was corrected.
- The timeout checklist implied the Redis instance must be in the same region as the GKE cluster. Official GKE connectivity requirements are based on the authorized network, not same-region placement, so this was changed to a latency recommendation.
- The ConfigMap plus Secret example used `envFrom` with a Secret whose keys contain hyphens. Kubernetes only exposes `envFrom` keys that are valid environment variable names, so the example was changed to use `envFrom` for the ConfigMap and an explicit `secretKeyRef` for `REDIS_AUTH`.
- The conclusion promised sub-millisecond latency. That is not guaranteed by the official documentation, so it was changed to "low latency."

## Review Notes
The main commands and manifests are technically valid for the described setup. The environment used for validation did not have `gcloud` or `kubectl` installed, so CLI syntax was checked against official Google Cloud and Kubernetes documentation instead of local command help.
