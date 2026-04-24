# Validation Summary: How to Install Portainer Server on Kubernetes via Helm - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Helm
- `kubectl`
- Kubernetes Ingress
- PersistentVolumeClaims and StorageClasses

## Sources Consulted
- Portainer Kubernetes install repository: https://github.com/portainer/k8s
- Portainer chart values: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/values.yaml
- Portainer chart README: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/README.md
- Portainer Helm repository index: https://portainer.github.io/k8s/index.yaml
- Portainer Helm chart configuration options: https://docs.portainer.io/sts/advanced/helm-chart-configuration-options
- Portainer initial setup documentation: https://docs.portainer.io/start/install-ce/server/setup
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Helm search repo command reference: https://helm.sh/docs/helm/helm_search_repo/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The prerequisites listed `Kubernetes cluster (1.20+)`, which is outdated for current Portainer releases. I changed this to require a Portainer-supported Kubernetes version instead of a stale hardcoded minimum.
- The version lookup command used `helm search repo portainer/portainer`, but that does not list all chart versions unless `--versions` is supplied. I corrected the command.
- The “default settings” install example explicitly set `service.type=NodePort`, even though the current Portainer chart already defaults to `NodePort`. I removed the redundant override so the example now matches the default behavior.
- The production values example enabled Ingress while also setting `service.type: LoadBalancer`. I changed the service type to `ClusterIP`, which matches the documented Ingress deployment pattern for the Portainer chart.
- The values example used `adminPassword: ""`, and the secret example used `secretName` plus a plain-text `adminPassword` field. Those keys are incorrect for the current chart. I changed them to the supported `adminPassword.existingSecret` structure and aligned the secret name with the chart documentation.
- The admin-password secret step said the secret could be created “before or after install”. Portainer’s `--admin-password-file` mechanism only applies when first creating the admin user. I corrected the instructions to create the secret before the first install.
- The initial setup step implied the secret merely “auto-configures” setup. I clarified that when `adminPassword.existingSecret` is used, Portainer creates the `admin` user automatically with that password.
- The Business Edition example used `enterpriseEdition.image.tag=latest`, and the alternative example switched `image.repository` without enabling Enterprise Edition. I replaced this with the supported same-chart BE installation pattern using `enterpriseEdition.enabled=true` and an explicit `lts` tag.
- The upgrade example pinned chart version `1.0.50`, which does not match current Portainer chart versioning. I replaced it with a generic `<chart-version>` placeholder so the command remains correct.
- The uninstall section incorrectly claimed `helm uninstall` preserves the chart-managed PVC. The chart includes a PVC resource without a keep policy, so Helm removes it on uninstall. I corrected the guidance to mention deleting a PVC separately only when using `persistence.existingClaim`.
- The NodePort access example showed a partial `kubectl get svc` output that omitted the chart’s Edge port. I replaced that with guidance to look for the relevant HTTP and HTTPS NodePorts instead of presenting an incomplete sample output.

## Review Notes
- As of April 24, 2026, the Portainer Helm repository index shows current chart versions in the `239.x.y` line (for example `239.1.0`), so hardcoding older `1.x` chart versions is inaccurate.
- The post’s Ingress example terminates TLS at the Ingress layer. If end-to-end TLS to the Portainer container is desired, the chart also supports `tls.force=true` together with the appropriate ingress backend-protocol annotation.
