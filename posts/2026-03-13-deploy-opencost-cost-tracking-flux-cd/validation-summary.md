# Validation Summary: How to Deploy OpenCost for Cost Tracking with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenCost
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository resources
- Kustomize Controller Kustomization resources
- Prometheus and Prometheus Operator ServiceMonitor
- Kubernetes Ingress

## Sources Consulted
- OpenCost Helm chart repository index: https://opencost.github.io/opencost-helm-chart/index.yaml
- OpenCost Helm chart v2.5.14 values: https://github.com/opencost/opencost-helm-chart/releases/download/opencost-2.5.14/opencost-2.5.14.tgz
- OpenCost Helm installation documentation: https://opencost.io/docs/installation/helm
- OpenCost API examples: https://opencost.io/docs/integrations/api-examples/
- OpenCost API documentation: https://opencost.io/docs/integrations/api/
- OpenCost custom/on-prem pricing documentation: https://opencost.io/docs/configuration/on-prem
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- CNCF OpenCost project page: https://www.cncf.io/projects/opencost/

## Issues Found
- The introduction described OpenCost as a CNCF sandbox project. OpenCost moved to CNCF Incubating on October 25, 2024, so the wording was updated.
- The HelmRelease used the chart version range `>=1.0.0 <2.0.0`, which excludes the current OpenCost Helm chart 2.x releases. It was changed to the current fixed chart version `2.5.14` to match the post's own best-practice recommendation to pin chart versions.
- The ServiceMonitor values were shown as a top-level `serviceMonitor` block. The OpenCost chart expects this under `opencost.metrics.serviceMonitor`, so the snippet was corrected.
- The pricing configuration used a standalone ConfigMap that was not referenced by the HelmRelease. The OpenCost Helm chart supports custom pricing through `opencost.customPricing`, so the snippet was replaced with Helm values that the chart consumes.
- The Flux Kustomization example used `infrastructure/opencost/kustomization.yaml` as the Flux Kustomization resource path, which would conflict with Kustomize's own `kustomization.yaml` discovery in the reconciled directory. The example filename was changed to a cluster-level Flux resource path.
- The Flux health check targeted the Helm-created Deployment directly. It was changed to health-check the `HelmRelease`, which is the Flux-managed resource in this setup.
- The API verification commands port-forwarded and queried port 9090, which is the UI port. OpenCost documents the API on port 9003, so the port-forward and API URLs were corrected.
- The allocation example used `accumulate=true`, which is not documented for the OpenCost Allocation API. The query was simplified to documented `window` and `aggregate` parameters.

## Review Notes
- The Ingress example intentionally exposes the UI on service port 9090, which is correct for the OpenCost chart when `opencost.ui.enabled` is true.
- The reviewed environment did not have `helm`, `kubectl`, or `flux` installed locally, so CLI verification was performed against official documentation and chart source instead of local `--help` output.
