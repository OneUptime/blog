# Validation Summary: How to Configure ArgoCD with External Redis

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Argo CD
- Argo CD Helm chart
- Kubernetes ConfigMaps, Secrets, Deployments, and StatefulSets
- Redis / Redis OSS
- AWS ElastiCache
- Google Cloud Memorystore for Redis
- Azure Cache for Redis
- kubectl, AWS CLI, gcloud CLI, Azure CLI, redis-cli

## Sources Consulted
- Argo CD Helm chart values and templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Argo CD command parameter example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- AWS CLI ElastiCache create-replication-group reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- Amazon ElastiCache in-transit encryption documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html
- Google Cloud gcloud redis instances create reference: https://cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud Memorystore in-transit encryption documentation: https://cloud.google.com/memorystore/docs/redis/manage-in-transit-encryption
- Azure CLI az redis reference: https://learn.microsoft.com/en-us/cli/azure/redis
- Azure Cache for Redis TLS configuration documentation: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-tls-configuration
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The Argo CD Helm snippets used `externalRedis.secretKey`, but the upstream chart does not support that field. I removed it and clarified that existing Redis secrets must contain the fixed key `redis-password`.
- The TLS examples used `configs.params.redis.tls.enabled` and `redis.tls.insecure`, which are not consumed by the current Argo CD Helm templates. I changed the examples to pass Argo CD's supported Redis TLS command flags through `server.extraArgs`, `repoServer.extraArgs`, and `controller.extraArgs`.
- The Google Memorystore command used `--auth-enabled`; the current gcloud flag is `--enable-auth`. I corrected the command.
- The Google Memorystore configuration enabled in-transit encryption but still used port `6379` and did not enable Redis TLS in Argo CD. I changed the port to `6378` and added the Redis TLS flags.
- The Azure CLI example passed `false` to `--enable-non-ssl-port`, but the flag enables the non-SSL port when specified. I removed the flag so the default TLS-only behavior is preserved.
- The Azure CLI example used `--vm-size P1`, while the official accepted value is `p1`. I changed it to lowercase.
- The custom CA example created a ConfigMap but did not mount it or tell Argo CD to use it. I updated the example to mount the CA with Helm `global.extraVolumes` / `global.extraVolumeMounts` and pass `--redis-ca-certificate` to the Argo CD components.

## Review Notes
Azure documentation now notes a retirement timeline for Azure Cache for Redis and recommends migration to Azure Managed Redis. The article remains technically relevant, but a future content update should consider adding that product caveat.
