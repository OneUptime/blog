# Validation Summary: How to Deploy Ory Hydra OAuth2 Server with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ory Hydra
- OAuth2
- OpenID Connect
- Flux CD
- Kubernetes
- Helm
- Bitnami PostgreSQL Helm chart
- Kubernetes Ingress

## Sources Consulted
- Ory Hydra Helm chart documentation: https://k8s.ory.com/helm/hydra.html
- Ory Hydra Helm chart values and templates: https://github.com/ory/k8s/tree/master/helm/charts/hydra
- Ory Hydra configuration schema: https://github.com/ory/hydra/blob/master/.schema/config.schema.json
- Ory Hydra REST API specification: https://github.com/ory/hydra/blob/master/spec/api.json
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository API documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Bitnami PostgreSQL Helm chart documentation: https://github.com/bitnami/charts/tree/main/bitnami/postgresql

## Issues Found
- The Ory Helm repository URL used the older `k8s.ory.sh` host. Updated it to the current official `https://k8s.ory.com/helm/charts` URL.
- The PostgreSQL HelmRelease referenced a `bitnami` HelmRepository that was never defined. Added the Bitnami HelmRepository manifest.
- The HelmRelease examples relied on Flux's default release names, which would prefix the namespace and break the documented service names. Added explicit `releaseName` values for PostgreSQL and Hydra.
- The chart version constraints were outdated. Updated Ory Hydra from `0.40.x` to `0.61.x` and Bitnami PostgreSQL from `13.x` to `18.x`.
- The Hydra values contained two top-level `hydra:` keys, so one would override the other in YAML. Merged `automigration.enabled` into the existing `hydra` map.
- The Hydra DSN and secrets were shown with shell-style placeholders inside `hydra.config`, which the chart renders into Kubernetes objects rather than expanding at runtime. Switched to an existing Kubernetes Secret for Hydra secrets and constructed `DSN` through container environment variables.
- The ingress value used `ingressClassName`, but the Ory Hydra chart expects `ingress.public.className`. Updated the field name.
- Resource requests and limits were placed at a top-level `resources` key that the Ory Hydra chart does not use. Moved them under `deployment.resources`.
- The Flux Kustomization example was shown as `clusters/my-cluster/hydra/kustomization.yaml`, which conflicts with the managed path name and can be mistaken for a Kustomize config file. Updated the example path to `clusters/my-cluster/hydra-kustomization.yaml`.

## Review Notes
The article still uses manually created Kubernetes Secrets for brevity. In a production GitOps workflow, those secrets should be managed with a secret-management approach such as SOPS, Sealed Secrets, External Secrets Operator, or a cloud secret manager integration.
