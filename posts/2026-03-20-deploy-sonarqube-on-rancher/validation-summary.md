# Validation Summary: How to Deploy SonarQube on Rancher

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Rancher
- SonarQube Community Build
- Kubernetes
- Helm
- PostgreSQL
- Jenkins
- cert-manager
- NGINX Ingress

## Sources Consulted
- SonarSource Helm chart README: https://raw.githubusercontent.com/SonarSource/helm-chart-sonarqube/master/charts/sonarqube/README.md
- SonarSource Helm chart values: https://raw.githubusercontent.com/SonarSource/helm-chart-sonarqube/master/charts/sonarqube/values.yaml
- SonarQube Server docs, Installing Helm chart: https://docs.sonarsource.com/sonarqube-server/latest/setup-and-upgrade/deploy-on-kubernetes/server/installing-helm-chart/
- SonarQube Server docs, Customizing Helm chart: https://docs.sonarsource.com/sonarqube-server/server-installation/on-kubernetes-or-openshift/customizing-helm-chart
- SonarQube Server docs, Before you start: https://docs.sonarsource.com/sonarqube-server/server-installation/on-kubernetes-or-openshift/before-you-start
- SonarQube Server docs, Analysis parameters: https://docs.sonarsource.com/sonarqube-server/10.8/analyzing-source-code/analysis-parameters
- SonarQube Server docs, Jenkins pipeline pause: https://docs.sonarsource.com/sonarqube-server/2026.1/analyzing-source-code/ci-integration/jenkins-integration/pipeline-pause
- Kubernetes docs, Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The original values file used outdated chart configuration for community deployment. I replaced `sonarqube.edition: "community"` with the current `community.enabled: true` setting used by the official SonarSource chart.
- The post relied on the chart-managed `postgresql:` block, but current SonarSource documentation notes that this PostgreSQL dependency was removed in SonarQube Server 2026.1. I replaced it with supported `jdbcOverwrite` settings for an external PostgreSQL backend.
- The database password was no longer wired in a supported way after removing the old `postgresql:` block. I added a `kubectl create secret generic sonarqube-db` command and configured `jdbcSecretName` / `jdbcSecretPasswordKey` accordingly.
- The example omitted `monitoringPasscode`, which the current chart requires for healthy liveness/readiness behavior. I added `monitoringPasscode` to the values example.
- The ingress example used the deprecated `kubernetes.io/ingress.class` annotation. I replaced it with the current `ingressClassName` field and kept only relevant annotations.
- The persistence comment implied that the SonarQube PVC stores primary analysis data. I corrected that comment to reflect that this persistence is for Elasticsearch indexes, while durable project data lives in the database.
- The Jenkins example used the deprecated `sonar.login` analysis property. I updated it to `sonar.token` and aligned the snippet with the environment variables exposed by `withSonarQubeEnv`.
- The `waitForQualityGate` example did not mention the required SonarQube webhook. I added the webhook prerequisite directly in the Jenkins example.

## Review Notes
- The post assumes Rancher already has a working ingress controller, `cert-manager`, and a `longhorn` storage class.
- `initSysctl.enabled: true` is still valid, but it requires privileged init-container behavior. On clusters enforcing restricted pod security, the host-level sysctl settings may need to be applied outside the chart instead.
- Current SonarSource guidance recommends an external PostgreSQL database for production deployments. The chart defaults to H2 only for test use cases.
