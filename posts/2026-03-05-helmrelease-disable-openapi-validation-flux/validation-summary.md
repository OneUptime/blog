# Validation Summary: How to Configure HelmRelease disableOpenAPIValidation in Flux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Flux CD Helm Controller
- Flux HelmRelease API
- Helm install and upgrade actions
- Kubernetes OpenAPI validation
- Kubernetes CustomResourceDefinitions
- cert-manager Helm chart

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Helm upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager continuous deployment and GitOps documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/

## Issues Found
- The post implied that missing or not-yet-installed CRDs can be worked around by disabling OpenAPI validation. I narrowed the wording to CRDs or schemas not reflected in OpenAPI/discovery data, and clarified that missing API errors such as `no matches for kind` or `the server could not find the requested resource` require installing the API/CRD.
- The cert-manager example used the older `installCRDs: true` value. I updated it to the current documented value, `crds.enabled: true`.
- The cert-manager example described cert-manager as installing CRDs and Custom Resources in the same chart. I corrected this to say cert-manager can install its CRDs as part of the Helm chart.
- The Helm default behavior was described using `--disable-openapi-validation=false`. I changed this to the clearer documented behavior: Helm validates by default unless `--disable-openapi-validation` is set.

## Review Notes
The Flux HelmRelease fields `spec.install.disableOpenAPIValidation` and `spec.upgrade.disableOpenAPIValidation` are current in the Flux `helm.toolkit.fluxcd.io/v2` API and default to `false`. The examples are syntactically consistent with the documented HelmRelease structure, but the placeholder chart names and versions would still need to match real repositories in an actual cluster.
