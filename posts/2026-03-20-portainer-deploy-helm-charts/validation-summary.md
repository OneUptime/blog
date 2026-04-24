# Validation Summary: How to Deploy Helm Charts in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Helm
- NGINX Ingress Controller
- Helm chart repositories

## Sources Consulted
- Portainer Applications docs: https://docs.portainer.io/user/kubernetes/applications
- Portainer Create an application from a Helm chart docs: https://docs.portainer.io/user/kubernetes/applications/manifest/helm
- Portainer Account settings docs: https://docs.portainer.io/sts/user/account-settings
- Portainer General settings docs: https://docs.portainer.io/admin/settings/general
- Portainer Inspect a Helm application docs: https://docs.portainer.io/sts/user/kubernetes/applications/inspect-helm
- Portainer Edit a Helm application docs: https://docs.portainer.io/sts/user/kubernetes/applications/edit-helm
- Helm install docs: https://helm.sh/docs/v3/helm/helm_install
- Helm upgrade docs: https://helm.sh/docs/v3/helm/helm_upgrade
- Helm rollback docs: https://helm.sh/docs/v3/helm/helm_rollback/
- Helm stable repository migration note: https://helm.sh/blog/new-location-stable-incubator-charts/
- Bitnami `nginx-ingress-controller` chart values: https://github.com/bitnami/charts/blob/main/bitnami/nginx-ingress-controller/values.yaml
- ingress-nginx ConfigMap options: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/

## Issues Found
- The post used outdated Portainer navigation (`Applications → Helm charts` and `Applications → Helm releases`). Current Portainer documentation places Helm deployment under `Applications → Create from code → Helm chart`, and Helm deployments are managed from the main Applications list. I updated those UI paths.
- The repository section said Portainer includes multiple built-in Helm repositories and directed readers to `Settings → Helm repositories`. Current docs say Bitnami is preconfigured, additional user-scoped repositories are added from `My account → Helm repositories`, and admins can configure a shared repository in Settings. I corrected that workflow.
- The recommended repository list included `stable`. Helm documents the stable repository as an archived repository that no longer receives updates, so I removed it from the examples.
- The sample `values.yaml` mixed Bitnami chart keys (`replicaCount`, `service`) with official ingress-nginx chart keys (`controller.config`, `controller.autoscaling.targetCPUUtilizationPercentage`). I rewrote the sample to use valid Bitnami `nginx-ingress-controller` values (`config`, `resources`, `autoscaling.targetCPU`) while preserving the same intent.
- The values section described a form-based editing flow and the install section showed raw Helm CLI-style deployment output. Current Portainer docs describe an editable YAML values pane with a read-only reference pane, and the install flow returns to the Helm application details page. I corrected both sections.
- The upgrade, rollback, and uninstall steps used older wording for the current UI. I updated them to the documented `Edit/Upgrade`, `Rollback`, and `Uninstall` workflow from the Helm application page.

## Review Notes
- The example chart version is now shown generically because the available versions in Portainer change over time; the Version dropdown in Portainer is the source of truth.
- Portainer Business Edition adds OCI registry support and Git-based Helm deployments, but the repository-based workflow covered in this post remains valid for standard Helm repository usage.
- Helm was not installed in the local review environment, so CLI syntax was verified against official Helm documentation rather than local `helm --help` output.
