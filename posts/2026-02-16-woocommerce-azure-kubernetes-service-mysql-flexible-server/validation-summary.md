# Validation Summary: How to Deploy WooCommerce on Azure Kubernetes Service with Azure Database

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Database for MySQL Flexible Server
- Azure Managed Redis
- Kubernetes Deployments, Services, Ingress, PVCs, CronJobs, Secrets, Namespaces, and HPA
- Azure Files CSI storage
- Docker and PHP-FPM Alpine images
- WordPress, WooCommerce, WP-CLI, and Redis Object Cache
- Nginx and PHP extensions

## Sources Consulted
- Azure CLI `az aks create` and AKS node pool documentation: https://learn.microsoft.com/en-us/azure/aks/use-system-pools
- Azure CLI `az mysql flexible-server` documentation: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server
- Azure Database for MySQL Flexible Server TLS documentation: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/security-tls
- Azure Managed Redis CLI documentation: https://learn.microsoft.com/en-us/azure/redis/scripts/create-manage-cache
- Azure Managed Redis client connection documentation: https://learn.microsoft.com/en-us/azure/redis/how-to-redis-access-data
- Azure Cache for Redis retirement information: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-whats-new
- Azure Files CSI driver for AKS: https://learn.microsoft.com/en-us/azure/aks/azure-csi-files-storage-provision
- Kubernetes Namespace API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/namespace-v1/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes HPA documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Docker Official PHP image documentation: https://hub.docker.com/_/php
- WP-CLI plugin command documentation: https://developer.wordpress.org/cli/commands/plugin/
- WordPress HTTPS / reverse proxy guidance: https://developer.wordpress.org/advanced-administration/security/https/
- Redis Object Cache plugin configuration: https://github.com/rhubarbgroup/redis-cache
- Redis Enterprise logical database behavior: https://redis.io/kb/doc/2d6sxrbhhj/does-redis-enterprise-support-logical-databases-using-the-select-command

## Issues Found
- The AKS section claimed a system and user node pool, but the original command created only the initial system pool. Added an `az aks nodepool add` command and a `nodeSelector` so WooCommerce pods target the user pool.
- The Redis section used Azure Cache for Redis Basic/Standard/Premium commands. Azure Cache for Redis has an announced retirement path and new Basic/Standard/Premium creation is blocked for new customers as of April 1, 2026, so the post now uses Azure Managed Redis via `az redisenterprise`.
- The Redis hostname and port were for Azure Cache for Redis. Updated them to the Azure Managed Redis endpoint format and port `10000`.
- The post said Redis handled PHP/session persistence. The shown WordPress Redis Object Cache plugin handles persistent object caching, not general PHP session storage or WooCommerce cart session storage. Updated those claims to object caching.
- The Dockerfile installed WooCommerce and Redis Object Cache only after execing into one running pod, which would not make plugin code available on every replica or after pod replacement. Added plugin installation to the Docker image and changed the runtime commands to activate the already installed plugins.
- The Dockerfile used `pecl install redis` on an Alpine PHP image without PHP build dependencies. Added `$PHPIZE_DEPS` to the package install list.
- The WordPress database config did not request TLS for Azure Database for MySQL Flexible Server, where TLS is enforced by default. Added `MYSQL_CLIENT_FLAGS` with `MYSQLI_CLIENT_SSL`.
- The Redis config used `WP_REDIS_DATABASE`, but Redis Enterprise / Azure Managed Redis does not support logical database selection with `SELECT`. Replaced it with `WP_REDIS_PREFIX`.
- The Kubernetes manifests referenced the `woocommerce` namespace but never created it. Added a namespace manifest.
- The Ingress used the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName`.

## Review Notes
The tutorial is technically valid after the corrections, but it remains a focused example rather than a complete production runbook. A future revision could add private networking/firewall rules for MySQL and Redis, ACR image build/push steps, ingress-nginx and cert-manager installation steps, WordPress authentication salts, backup/restore guidance, and more production-safe secret handling.
