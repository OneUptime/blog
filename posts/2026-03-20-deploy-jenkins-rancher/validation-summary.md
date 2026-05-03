# Validation Summary: How to Deploy Jenkins on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (v2.7+)
- Jenkins (Bitnami Helm chart)
- Kubernetes (kubectl, Namespace, PVC, ResourceQuota, CronJob)
- Helm 3.x
- Longhorn (storage)
- cert-manager (TLS certificates)
- Prometheus / ServiceMonitor (Prometheus Operator CRDs)
- Jenkins Prometheus plugin
- nginx Ingress
- Velero (mentioned for backups)

## Sources Consulted
- Bitnami Jenkins Helm chart documentation: https://github.com/bitnami/charts/tree/main/bitnami/jenkins
- Jenkins Prometheus metrics plugin: https://plugins.jenkins.io/prometheus/ (default exposes metrics at `/prometheus` on the Jenkins HTTP port)
- Rancher project namespace annotation reference (`field.cattle.io/projectId`): Rancher documentation
- cert-manager Certificate API reference: https://cert-manager.io/docs/usage/certificate/
- Prometheus Operator ServiceMonitor CRD: https://prometheus-operator.dev/docs/operator/api/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes PersistentVolumeClaim spec: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes CronJob `batch/v1` API: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found

1. **Step 6 — Wrong port and path for Jenkins metrics check.**
   The original `curl -s http://localhost:9090/metrics` was incorrect on two fronts: Jenkins listens on port `8080` (port `9090` is conventionally Prometheus's own UI port), and Jenkins itself does not expose `/metrics`. With the Jenkins Prometheus plugin installed, metrics are served at `/prometheus` on the Jenkins HTTP port. Updated the curl command to `http://localhost:8080/prometheus` and noted the plugin requirement in the comment.

2. **Step 6 — ServiceMonitor `path` field.**
   The ServiceMonitor previously scraped `/metrics`, which would never produce data from a Jenkins pod. Changed `path: /metrics` to `path: /prometheus` to match the actual endpoint exposed by the Jenkins Prometheus plugin (which the ServiceMonitor is intended to scrape).

3. **Step 7 — Fictitious backup subcommand.**
   The original CronJob invoked `/opt/bitnami/scripts/jenkins/entrypoint.sh jenkins-backup`. The Bitnami Jenkins image's entrypoint script does not implement a `jenkins-backup` subcommand, so this command would fail at runtime. Replaced it with a `tar czf` of the Bitnami persistence path (`/bitnami/jenkins`, where the chart stores `JENKINS_HOME`) piped to a backup file, which is a real, working backup approach for that image.

## Review Notes

- The Bitnami Helm catalog has been undergoing changes (Bitnami Secure Images / repository changes announced in 2025). The `bitnami/jenkins` chart at `https://charts.bitnami.com/bitnami` may eventually require switching to the Bitnami Secure Images registry or to the official `jenkins/jenkins` chart at `https://charts.jenkins.io`. Readers running this guide in the future should verify the chart is still hosted at this repo.
- The Introduction and Conclusion contain awkward duplicated phrasing ("How to Deploy Jenkins on Rancher on Rancher"), which appears to be a templating artifact. Left untouched because it is a stylistic/copy issue rather than a technical inaccuracy.
- The Jenkins Prometheus plugin must be installed inside Jenkins (e.g., via the Plugin Manager or a configuration-as-code definition) before the metrics endpoint and ServiceMonitor will return data. This is not covered by the post.
- The CronJob example assumes `/backup` is writable inside the CronJob container; in practice users will need to mount a PVC or object-storage-backed volume. The post implies this with the "Backup using Velero or custom CronJob" comment but does not show the volume mount; readers should adapt accordingly. Velero (mentioned in the comment) remains the recommended approach for full cluster-aware backups.
- The `field.cattle.io/projectId` namespace annotation is the correct mechanism to bind a namespace to a Rancher project; the value `YOUR_PROJECT_ID` is correctly indicated as a placeholder.
- The Helm chart values (`persistence.enabled`, `persistence.storageClass`, `ingress.enabled`, `ingress.hostname`, `ingress.tls`) are valid for the Bitnami Jenkins chart at the time of review.
