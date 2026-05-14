# Validation Summary: How to Migrate an Entire Organization to GitOps with Flux CD

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- HelmRelease
- Kyverno
- GitHub Actions
- Jenkins
- Prometheus
- Grafana
- yq

## Sources Consulted
- Flux bootstrap GitHub command documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux Kustomization documentation and API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/ and https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux image update automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/ and https://v2-0.docs.fluxcd.io/flux/guides/monitoring/
- Kyverno validate rule and failure action documentation: https://release-1-14-0.kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno resource matching documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kyverno CRD reference overview: https://kyverno.io/docs/crds/
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The pilot migration section said it was creating a Flux Kustomization, but the snippet only created a Kustomize overlay. Added a Flux `kustomize.toolkit.fluxcd.io/v1` `Kustomization` under `clusters/dev` so Flux actually reconciles the app overlay from the bootstrapped cluster path.
- The Kyverno examples used `spec.validationFailureAction`, which current Kyverno documentation marks as deprecated. Moved the settings to `validate.failureAction` in both the audit and enforce examples.
- The onboarding Flux Kustomization comment said `targetNamespace` restricts reconciliation to a team namespace. Flux documents this field as setting or overriding the namespace for namespaced resources; namespace restriction is enforced through RBAC and `serviceAccountName`. Updated the comment accordingly.
- The Grafana reconciliation success panel used `rate()` on `gotk_reconcile_condition`, which is a gauge metric. Replaced it with a current-state percentage based on the Ready condition gauge.
- The communication plan used `channel: slack #gitops-migration`, which YAML parses as `channel: slack` with the channel name as a comment. Quoted the value so the channel is preserved.

## Review Notes
All YAML snippets parse successfully after the fixes. The examples remain illustrative and still assume supporting resources exist, such as `HelmRepository` sources, RBAC objects, namespaces, Flux image policies, and kube-state-metrics/Grafana dashboard loading configuration.
