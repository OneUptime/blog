# Validation Summary: How to Set Up Nextcloud on Talos Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- Nextcloud
- Kubernetes Deployments, StatefulSets, Services, PersistentVolumeClaims, Ingress, and CronJobs
- PostgreSQL
- Redis
- Helm
- ingress-nginx
- cert-manager

## Sources Consulted
- Nextcloud Docker image documentation: https://github.com/nextcloud/docker
- Nextcloud Docker Hub official image page: https://hub.docker.com/_/nextcloud/
- Nextcloud server maintenance and release schedule: https://github.com/nextcloud/server/wiki/Maintenance-and-Release-Schedule
- Nextcloud Helm chart README and values: https://github.com/nextcloud/helm/tree/main/charts/nextcloud
- Nextcloud administration manual, background jobs: https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/background_jobs_configuration.html
- Nextcloud administration manual, configuration parameters: https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/config_sample_php_parameters.html
- Talos Linux FAQ: https://docs.siderolabs.com/talos/v1.11/troubleshooting/faqs
- Talos Linux philosophy documentation: https://docs.siderolabs.com/talos/v1.10/learn-more/philosophy
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- PostgreSQL Docker image documentation: https://hub.docker.com/_/postgres
- Redis command documentation: https://redis.io/docs/latest/commands/

## Issues Found
- The post used `nextcloud:28-apache`, but Nextcloud 28 is end-of-life and no longer receives security updates. Updated the manual Deployment and CronJob examples to `nextcloud:33-apache`, which matches the current supported major version and the current Nextcloud Helm chart app version at review time.
- The Nextcloud container set `PHP_UPLOAD_LIMIT` to `10G` but did not raise the Apache request body limit. Added `APACHE_BODY_LIMIT: "10737418240"` so the Apache image configuration is consistent with the stated 10 GB upload limit.
- The apply commands omitted the database secret and PostgreSQL StatefulSet files shown in Step 1. Added `kubectl apply` commands for `nextcloud-db-secret.yaml` and `postgres-statefulset.yaml`.
- The post described the Helm chart as official. The chart repository describes it as community maintained, so the wording was corrected.
- The Talos Linux security claims were too absolute. Reworded the claims to match Talos documentation: Talos is immutable, API-driven, and ships without SSH or a shell, but that does not mean the OS cannot be compromised.
- The conclusion said Nextcloud provides encrypted storage without qualification. Reworded this to "encryption features" because encryption is configurable and not a blanket guarantee for every deployment.

## Review Notes
- The Kubernetes API versions used in the examples are current for Deployments, StatefulSets, Services, PVCs, Ingress, and CronJobs.
- The Nextcloud Docker environment variables used for PostgreSQL, Redis, trusted domains, overwrite URL/protocol, PHP memory, upload limit, and Apache body limit are valid for the official community-maintained image.
- The ingress-nginx annotations and well-known CalDAV/CardDAV redirects are consistent with the Nextcloud Helm chart guidance, although production deployments may also want the additional `.well-known` redirects documented by the chart for webfinger, nodeinfo, and host-meta.
- Secrets are shown inline for tutorial simplicity. A production deployment should use generated credentials and preferably existing Kubernetes Secrets or an external secret manager.
