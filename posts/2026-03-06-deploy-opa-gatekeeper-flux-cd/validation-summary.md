# Validation Summary: How to Deploy OPA Gatekeeper with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux CD
- Flux HelmRelease and Kustomization APIs
- OPA Gatekeeper
- Gatekeeper Helm chart
- Gatekeeper ConstraintTemplates and Constraints
- Rego

## Sources Consulted
- Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper Audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper Replicating Data documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/sync/
- Gatekeeper Exempting Namespaces documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Gatekeeper Debugging / Config tracing documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/debug/
- Gatekeeper Helm chart values and templates for release 3.17: https://github.com/open-policy-agent/gatekeeper/tree/release-3.17/charts/gatekeeper
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/

## Issues Found
- The HelmRelease values nested `auditInterval`, `constraintViolationsLimit`, and `auditFromCache` under `audit`, but the Gatekeeper Helm chart expects those values at the top level. Moved them to `values.auditInterval`, `values.constraintViolationsLimit`, and `values.auditFromCache`.
- The post used `enableMutation: true`, which is not a Gatekeeper Helm chart value. Replaced it with `disableMutation: false`, matching the chart's mutation configuration.
- The namespace exemption list was placed at the top level as `exemptNamespaces`, but the chart expects controller-manager webhook exemptions under `controllerManager.exemptNamespaces`. Moved the list and clarified that this exemption applies to the admission webhook.
- The image repository policy matched Deployments, StatefulSets, and DaemonSets, but its Rego only inspected `spec.containers`, which works for Pods but not workload controllers. Updated the Rego to read either `spec.containers` for Pods or `spec.template.spec.containers` for workload controllers.
- Because the example enables `auditFromCache: true`, the Gatekeeper Config must sync every kind that should be audited. Added `apps/v1` Deployment, StatefulSet, and DaemonSet to `syncOnly` so the image policy's matched workload controllers can be audited from cache.

## Review Notes
The Flux CRD versions, Gatekeeper ConstraintTemplate schema shape, enforcement actions (`dryrun`, `warn`, `deny`), Config tracing example, and monitoring commands are technically consistent with current official documentation. The local environment did not have `kubectl`, `flux`, `helm`, or `opa` installed, so CLI help and live manifest rendering could not be run locally; those parts were verified against official documentation and upstream chart source instead.
