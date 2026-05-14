# Validation Summary: How to Configure Flagger Metrics Analysis with New Relic

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Flagger
- Flux Helm Controller
- Kubernetes
- New Relic Kubernetes integration
- New Relic APM auto-attach
- New Relic NRQL
- External Secrets Operator

## Sources Consulted
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flux HelmRelease documentation: https://v2-0.docs.fluxcd.io/flux/components/helm/helmreleases/
- Flux `flux reconcile kustomization` command documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- New Relic Kubernetes integration components documentation: https://docs.newrelic.com/docs/kubernetes-pixie/kubernetes-integration/get-started/kubernetes-components/
- New Relic Kubernetes APM auto-attach documentation: https://docs.newrelic.com/docs/kubernetes-pixie/kubernetes-integration/installation/k8s-agent-operator/
- New Relic official Helm charts repository and `nri-bundle` chart metadata: https://github.com/newrelic/helm-charts
- New Relic NRQL reference: https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/nrql-syntax-clauses-functions/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The New Relic HelmRelease was placed in the `newrelic` namespace while relying on `install.createNamespace`. Flux only creates the target namespace on demand, not the namespace containing the HelmRelease object. Changed the HelmRelease to live in `flux-system` and added `spec.targetNamespace: newrelic`.
- The New Relic bundle example used chart version `5.x`, which is no longer current. Updated the chart constraint to `7.x`.
- The license secret was referenced but never created. Added commands to create the `newrelic` namespace and `newrelic-license` secret.
- The New Relic license secret was configured under `newrelic-infrastructure`, but current `nri-bundle` values expose `customSecretName` and `customSecretLicenseKey` as global values. Moved those settings under `global`.
- Kubernetes events forwarding was described but the chart value enabled `kube-state-metrics` instead. Added `nri-kube-events.enabled: true` and clarified the `kube-state-metrics` comment.
- The guide referenced Kubernetes APM auto-attach but did not enable the bundle component and used the old annotation-based approach. Added `k8s-agents-operator.enabled: true`, removed the stale annotation, and noted that auto-attach requires an `Instrumentation` custom resource for supported runtimes.
- The APM app name was hard-coded to `podinfo-canary`. Flagger creates the primary workload with a `-primary` selector value while the canary target keeps the original selector value, so both primary and canary can be distinguished by deriving `NEW_RELIC_APP_NAME` from the `app` label. Updated the deployment, MetricTemplate queries, test query, and dashboard queries accordingly.
- The deployment used the stock podinfo image while querying New Relic APM `Transaction` events. Added a comment that the image must be instrumented with New Relic APM for those NRQL queries to return data.

## Review Notes
- The NRQL examples use valid aggregate functions and avoid `FACET`/`TIMESERIES` in MetricTemplates, which is appropriate because Flagger expects a single numeric value.
- The New Relic Flagger provider still uses the documented secret keys `newrelic_account_id` and `newrelic_query_key`.
- The guide remains focused on APM `Transaction` data. Teams that do not instrument the application with New Relic APM should query metrics ingested through the New Relic Prometheus integration instead.
