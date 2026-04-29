# Validation Summary: How to Install Kubewarden from Rancher UI

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Extensions
- Kubewarden
- Kubernetes
- Helm charts
- kubectl

## Sources Consulted
- Kubewarden Rancher UI extension quickstart: https://docs.kubewarden.io/howtos/ui-extension/install
- Kubewarden Quick start: https://docs.kubewarden.io/quick-start
- Kubewarden Certificate rotation: https://docs.kubewarden.io/explanations/certificates
- Kubewarden Configuring policies: https://docs.kubewarden.io/howtos/policies
- Kubewarden chart repository index: https://charts.kubewarden.io/index.yaml
- Kubewarden controller chart package: https://github.com/kubewarden/helm-charts/releases/download/kubewarden-controller-5.13.0/kubewarden-controller-5.13.0.tgz
- Kubewarden defaults chart package: https://github.com/kubewarden/helm-charts/releases/download/kubewarden-defaults-3.13.0/kubewarden-defaults-3.13.0.tgz
- Rancher Helm Charts and Apps: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/helm-charts-in-rancher

## Issues Found
- The post described the older app-repository flow. I updated it to the current Rancher UI extension flow documented by Kubewarden.
- The cert-manager prerequisite was outdated. Kubewarden removed the cert-manager dependency starting in `v1.17.0`, so I replaced that step with installing the Kubewarden Rancher extension.
- The controller values snippet used `controller.replicaCount`, but the current `kubewarden-controller` chart uses the top-level `replicas` key. I corrected the snippet.
- The defaults chart snippet duplicated the `policyServer` key and used the wrong resource nesting. I replaced it with a valid `policyServer` block using `requests` and `limits`.
- The post used the `kubewarden` namespace and unprefixed release names. For Rancher-managed installs, current chart metadata uses the `cattle-kubewarden-system` namespace and default `rancher-kubewarden-*` release names, so I corrected the install, verification, upgrade, and log instructions.
- The verification commands were partially stale. I updated them to use `policyservers -n cattle-kubewarden-system` and the label-based webhook query used in current Kubewarden documentation.
- The sample policy referenced an older `pod-privileged` module tag. I updated it to a current chart-backed tag and made the status-check command fully qualified.

## Review Notes
- Rancher's current Kubewarden UI workflow is centered on the Kubewarden extension, not on manually adding the Kubewarden Helm repository through **Apps > Repositories**.
- Kubewarden's official documentation still has some version drift between quick-start policy examples and current chart defaults. The post was aligned with the current shipped chart metadata where those differed.
