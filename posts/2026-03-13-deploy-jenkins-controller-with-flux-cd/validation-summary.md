# Validation Summary: How to Deploy Jenkins Controller with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Jenkins
- Jenkins Helm chart
- Jenkins Configuration as Code (JCasC)
- Jenkins Kubernetes plugin
- Flux CD HelmRelease
- Flux CD Kustomization
- Kubernetes
- kubectl
- Helm

## Sources Consulted
- Jenkins Helm chart documentation and release index: https://charts.jenkins.io/
- Jenkins Helm chart values: https://raw.githubusercontent.com/jenkinsci/helm-charts/main/charts/jenkins/values.yaml
- Jenkins Helm chart JCasC template helpers: https://raw.githubusercontent.com/jenkinsci/helm-charts/main/charts/jenkins/templates/_helpers.tpl
- Jenkins Helm chart controller StatefulSet template: https://raw.githubusercontent.com/jenkinsci/helm-charts/main/charts/jenkins/templates/jenkins-controller-statefulset.yaml
- Jenkins Kubernetes plugin documentation: https://plugins.jenkins.io/kubernetes/
- Flux HelmRelease API v2 reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization API v1 reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes StatefulSet tutorial: https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/

## Issues Found
- The HelmRelease used outdated or incorrect Jenkins chart image keys: `controller.image` as a scalar and `controller.tag`. Updated the snippet to use `controller.image.repository` and `controller.image.tag`, which matches the Jenkins chart 5.x values schema.
- The admin secret configuration used outdated or incorrect keys: `adminSecret`, `existingSecret`, `adminUser`, and `adminPassword` directly under `controller`. Updated it to `controller.admin.createSecret`, `controller.admin.existingSecret`, `controller.admin.userKey`, and `controller.admin.passwordKey`, matching the chart's current secret mounting behavior.
- The custom JCasC Kubernetes cloud used `podTemplates`, while the Jenkins Kubernetes plugin JCasC model and Jenkins chart-generated cloud use `templates`. To avoid duplicate `jenkins.clouds` configuration and use the chart-supported path, moved the static agent definition to `agent.podTemplates` with `controller.JCasC.defaultConfig: true`.
- The verification command used `kubectl rollout status deployment/jenkins`, but the Jenkins Helm chart deploys the controller as a StatefulSet. Changed it to `kubectl rollout status statefulset/jenkins -n jenkins`.
- The introduction claimed Flux prevents all Jenkins configuration drift. Narrowed the claim to configuration declared in JCasC, which is the part reapplied through the GitOps/JCasC workflow.
- The credentials best-practice note implied Kubernetes secrets can always be referenced by secret name alone in JCasC. Updated it to describe the Jenkins chart's mounted secret key syntax for `controller.existingSecret` and `controller.additionalExistingSecrets`.

## Review Notes
- The YAML snippets parse successfully after the changes.
- `helm`, `flux`, and `kubectl` were not installed in the local workspace, so command behavior was verified against official documentation rather than local CLI help.
- The tutorial still uses `latest` plugin and agent image tags in the example, but it also explicitly recommends pinning plugin versions for repeatable builds. Pinning the agent image would also be a useful future improvement for production use.
