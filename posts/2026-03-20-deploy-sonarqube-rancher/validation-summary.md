# Validation Summary: How to Deploy SonarQube on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- SonarQube Community Build
- Kubernetes
- Helm
- cert-manager
- Prometheus Operator
- Velero
- Longhorn

## Sources Consulted
- SonarQube Community Build Helm installation docs: https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/installing-helm-chart
- SonarQube Community Build prerequisites and production guidance: https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/before-you-start
- SonarQube monitoring on Kubernetes with Prometheus: https://docs.sonarsource.com/sonarqube-server/server-installation/on-kubernetes-or-openshift/set-up-monitoring/prometheus
- SonarQube backup and restore guidance: https://docs.sonarsource.com/sonarqube-server/server-update-and-maintenance/maintenance/backup-and-restore
- Official SonarSource Helm chart values: https://github.com/SonarSource/helm-chart-sonarqube/blob/master/charts/sonarqube/values.yaml
- Official SonarSource Helm chart README: https://github.com/SonarSource/helm-chart-sonarqube
- Rancher namespace/project annotation guidance: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- cert-manager Certificate resource docs: https://cert-manager.io/docs/usage/certificate/
- Velero Schedule API docs: https://velero.io/docs/v1.17/api-types/schedule/

## Issues Found
- The post used the Bitnami `bitnami/sonarqube` chart and outdated Helm values. I replaced it with the current official SonarSource chart and verified values such as `community.enabled`, `monitoringPasscode`, `ingress.hosts[0].name`, `ingress.tls`, `persistence.*`, and `prometheusMonitoring.podMonitor.enabled`.
- The Rancher namespace annotation example used an incomplete placeholder. I corrected it to the documented `field.cattle.io/projectId=YOUR_CLUSTER_ID:YOUR_PROJECT_ID` format.
- The standalone PVC example was not wired to the Helm chart and would not be used by the deployment as written. I replaced it with the chart’s actual `persistence` values block.
- The monitoring section checked the wrong endpoint without required authentication and created a `ServiceMonitor` instead of using the chart’s documented `PodMonitor` flow. I updated it to the official `/api/monitoring/metrics` endpoint with `X-Sonar-Passcode` authentication and `PodMonitor` verification.
- The backup CronJob attempted to run a non-existent SonarQube backup command inside the container. I replaced it with a valid Velero `Schedule` example and noted that the SonarQube database should be backed up with native database tooling.
- The upgrade section targeted the wrong chart and checked rollout status on the wrong workload kind/name. I updated it to the official chart and to `statefulset/sonarqube-sonarqube`, which matches the chart’s current default deployment type and naming.
- The introduction and conclusion claimed a production-ready setup without noting the production database requirement. I removed that claim and added an explicit production database prerequisite.
- The prerequisites were missing components required by the corrected instructions. I added Prometheus Operator for `PodMonitor` support and Velero for the backup example.

## Review Notes
- The corrected post now documents SonarQube Community Build because that is the current no-license path in SonarSource’s official Helm docs.
- SonarSource’s current chart defaults to a `StatefulSet`, but the chart marks this behavior as deprecated in favor of `Deployment` in a future release. The rollout command may need revisiting when the chart changes.
- SonarSource’s chart also notes that the bundled `ingress-nginx` dependency is deprecated; the post now assumes you already run your own ingress controller in the cluster.
