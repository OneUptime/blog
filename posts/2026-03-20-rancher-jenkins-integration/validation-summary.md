# Validation Summary: How to Integrate Jenkins with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Jenkins
- Jenkins Helm chart
- Jenkins Kubernetes plugin
- Jenkins Declarative Pipeline
- Kubernetes
- `kubectl`
- Rancher Monitoring / Alertmanager webhooks

## Sources Consulted
- Jenkins Helm chart README: https://github.com/jenkinsci/helm-charts/tree/main/charts/jenkins
- Jenkins Helm chart values: https://raw.githubusercontent.com/jenkinsci/helm-charts/main/charts/jenkins/values.yaml
- Jenkins: Installing Jenkins on Kubernetes: https://www.jenkins.io/doc/book/installing/kubernetes/
- Jenkins Kubernetes plugin: https://plugins.jenkins.io/kubernetes/
- Jenkins: Using a Jenkinsfile: https://www.jenkins.io/doc/book/pipeline/jenkinsfile
- Rancher Kubeconfigs workflow: https://ranchermanager.docs.rancher.com/v2.12/api/workflows/kubeconfigs
- Rancher previous v3 API guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher API tokens: https://ranchermanager.docs.rancher.com/api/api-tokens
- Rancher receiver configuration: https://ranchermanager.docs.rancher.com/v2.12/reference-guides/monitoring-v2-configuration/receivers
- Jenkins Generic Webhook Trigger plugin: https://plugins.jenkins.io/generic-webhook-trigger
- Jenkins Rancher plugin: https://plugins.jenkins.io/rancher/

## Issues Found
- The Jenkins Helm values used outdated chart keys. I changed `controller.adminUser` and `controller.adminPassword` to `controller.admin.username` and `controller.admin.password`, and moved `persistence` to the top level because that is how the current chart is structured.
- The plugin list used floating `latest` versions. I replaced those with current documented plugin versions and set `installLatestPlugins: false` so the example matches current chart guidance for reproducible plugin installs.
- The example included the Jenkins `rancher` plugin, but the current plugin page states it is for Rancher 1.2.2+. I removed it because it is not appropriate for modern Rancher Manager integrations.
- The Kubernetes agent example used an unnecessary Docker-in-Docker sidecar. I simplified it to the current Jenkins Kubernetes plugin pod-template pattern using a `maven` container with `cat` and `tty: true`.
- The kubeconfig API example used an unverified legacy `generateKubeconfig` curl action. I replaced it with Rancher's documented public Kubeconfig API workflow (`ext.cattle.io/v1`), which is available in Rancher v2.12+.
- The deploy pipeline claimed to build, push, and deploy an image, but it only updated a Kubernetes deployment. I corrected the example into a truthful deploy pipeline that accepts an `IMAGE_TAG` parameter and deploys that image.
- The Rancher API example used an undocumented node pool scaling action. I replaced it with a documented v3 API query against `/v3/clusters`.
- The Rancher alerting instructions used an outdated UI path. I updated them to the current receiver path under `Monitoring -> Alerting -> AlertManagerConfigs -> <config> -> Add Receiver -> Webhook`.

## Review Notes
- Rancher's public Kubeconfig API is available in v2.12 and later. Earlier Rancher versions will still need older kubeconfig-generation flows.
- Rancher's previous v3 API is still available, but the official guide recommends constructing only top-level URLs directly and treating deeper hand-built URLs as subject to change.
- The examples still use placeholder credentials and a floating `bitnami/kubectl:latest` tag. For production use, pinning image tags and sourcing secrets from existing Kubernetes or Jenkins credentials would be safer.
