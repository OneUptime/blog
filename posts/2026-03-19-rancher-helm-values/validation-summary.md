# Validation Summary: How to Configure Helm Chart Values in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Helm chart values
- Bitnami Redis Helm chart

## Sources Consulted
- Rancher: Helm Charts and Apps
  https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Rancher: Creating Apps
  https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/helm-charts-in-rancher/create-apps
- Helm command reference: `helm show`
  https://helm.sh/docs/helm/helm_show/
- Helm command reference: `helm install`
  https://helm.sh/docs/helm/helm_install/
- Helm command reference: `helm get values`
  https://helm.sh/docs/helm/helm_get_values/
- Helm chart template guide: values files
  https://helm.sh/docs/chart_template_guide/values_files/
- Helm chart format and schema support
  https://helm.sh/docs/topics/charts/
- Bitnami Redis chart `19.0.0` package contents (`values.yaml` and `README.md`)
  https://charts.bitnami.com/bitnami/redis-19.0.0.tgz
- Bitnami Redis image metadata checked via Docker Hub API and `docker manifest inspect`
  https://hub.docker.com/r/bitnami/redis/tags

## Issues Found
- The post said `helm show chart` could be used to show a values schema. That was incorrect. `helm show chart` shows chart metadata, so the command comment was corrected.
- The Rancher UI section implied that Rancher form fields are generated from either `questions.yaml` or a values schema, and that all charts expose that form flow. Rancher’s docs distinguish native Helm charts from Rancher charts with `questions.yaml`, so the text was corrected to scope the form UI to charts that provide Rancher questions and to describe the YAML editor accurately for native Helm charts.
- The YAML example included a top-level `replicaCount` key that is not present in the Bitnami Redis chart `19.0.0` values. That invalid key was removed.
- The YAML example used `master.service.port`, but the Bitnami Redis chart `19.0.0` uses `master.service.ports.redis`. The example was corrected to the actual chart key.
- The YAML example overrode `image.tag` with `7.4.0`, which is not a valid current Bitnami Redis image tag format in the published image metadata. The override was removed so the example no longer suggests an invalid tag.
- The `helm get values` section redirected output to a file without specifying YAML output. Current Helm command docs default `helm get values` output to `table`, so `-o yaml` was added to the relevant commands.
- The CLI examples assumed a local Helm chart repository was already configured, but the prerequisites only mentioned Rancher repository setup. A prerequisite was added to clarify that local Helm CLI use also requires the repository in the user’s Helm configuration.

## Review Notes
- The post uses Bitnami Redis chart `19.0.0` for examples. That version-specific choice is acceptable for demonstrating value structure, but newer Bitnami Redis chart releases may rename or reorganize values again.
- Rancher documents support for Helm 3-compatible charts. Users may still run newer Helm CLI versions locally, so output-format details such as `helm get values -o yaml` matter when keeping examples current.
