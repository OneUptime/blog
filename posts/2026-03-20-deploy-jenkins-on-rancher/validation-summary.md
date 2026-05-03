# Validation Summary: How to Deploy Jenkins on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Jenkins (CI/CD automation server)
- Rancher / Kubernetes
- Helm (`jenkins/jenkins` chart)
- Jenkins Kubernetes plugin
- Jenkins Declarative Pipeline (Groovy)
- cert-manager + nginx ingress (referenced)
- Longhorn storage class (referenced)
- Maven, Docker-in-Docker (DinD) build containers

## Sources Consulted
- Jenkins Helm chart `values.yaml` (main branch): https://github.com/jenkinsci/helm-charts/blob/main/charts/jenkins/values.yaml
- Jenkins Helm chart README: https://github.com/jenkinsci/helm-charts/blob/main/charts/jenkins/README.md
- Jenkins Kubernetes plugin docs: https://github.com/jenkinsci/kubernetes-plugin
- Jenkins plugin-installation-manager-tool (`jenkins-plugin-cli`): https://github.com/jenkinsci/plugin-installation-manager-tool
- Docker Hub for image tag verification (`maven:3.9-eclipse-temurin-17`, `docker:24-dind`)

## Issues Found
1. **Incorrect admin credential keys.** The post used `controller.adminUser` and `controller.adminPassword`, which are not valid keys in the Jenkins Helm chart. The correct keys are nested under `controller.admin`: `controller.admin.username` and `controller.admin.password`. Fixed.
2. **Incorrect location of `persistence` block.** The post nested `persistence` under `controller`. In the official chart, `persistence` is a top-level key (siblings of `controller` and `agent`). Moved `persistence` to top level.

## Review Notes
- Plugin entries using the `:latest` suffix (e.g., `kubernetes:latest`) are syntactically accepted by `jenkins-plugin-cli`, but pinning to specific versions is the recommended practice in production to ensure reproducible installs. The chart's default (`controller.installLatestPlugins: true`) will pull the latest compatible versions when no version is pinned, so the `:latest` suffix is largely redundant. Left as-is since it is not technically incorrect.
- The Kubernetes API URL `https://kubernetes.default.svc.cluster.local` is valid. The chart's own default for `kubernetesURL` is the shorter `https://kubernetes.default`; both resolve to the same in-cluster API server.
- Declarative pipeline syntax `agent { kubernetes { yaml """...""" defaultContainer 'maven' } }` is current and valid per the kubernetes-plugin documentation.
- The `agent.*` keys (`enabled`, `defaultsProviderTemplate`, `containerCap`, `podName`, `resources`) are all valid as used.
- The post does not pin Jenkins controller image version; readers may want to consider setting `controller.image.tag` for reproducible deployments.
