# Validation Summary: How to Map ArgoCD Health Checks to Flux Health Checks

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Argo CD custom health checks
- Flux CD Kustomization health checks
- Flux CEL health check expressions
- Kubernetes custom resources and status conditions
- Kubernetes JSONPath
- cert-manager Certificate conditions

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CEL health checks cheatsheet: https://fluxcd.io/flux/cheatsheets/cel-healthchecks/
- Flux `flux events` CLI documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux `flux get kustomizations` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- cert-manager API reference for Certificate conditions: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post said Flux waits for custom resources without standard conditions by checking resource existence and specific status fields. Current Flux supports `.spec.healthCheckExprs` with CEL for custom resource health logic, so the introduction and custom-resource sections were updated to describe CEL-based checks.
- The post described custom resource health checks as only requiring `status.conditions[type=Ready].status == "True"`. Flux documents `healthChecks` as supporting custom resources compatible with `kstatus`, so the wording was corrected to refer to `kstatus`-compatible readiness conventions.
- The workaround for phase-based CRDs used a polling Kubernetes Job. That is not the normal Flux translation for non-standard status fields and the sample did not connect the Job to the Flux health check. It was replaced with a Kustomization example using `healthCheckExprs` for `Provisioning`, `Failed`, and `Ready` phases.
- The Helm release health check section used Deployment checks rather than a Flux HelmRelease check. The example now references `helm.toolkit.fluxcd.io/v2` `HelmRelease`, matching Flux documentation.
- The watch command used `flux get kustomizations myapp -n flux-system --watch`, but the official CLI documentation presents `flux get kustomizations` without a positional resource name. The command was changed to `flux get kustomizations -n flux-system --watch`.

## Review Notes
The corrected `healthCheckExprs` example assumes the custom resource exposes `status.phase`; Flux documentation warns that CEL expressions must match actual fields because missing fields can cause the controller to wait until timeout. The local environment did not have `flux` or `kubectl` installed, so CLI syntax was validated against official documentation rather than local `--help` output.
