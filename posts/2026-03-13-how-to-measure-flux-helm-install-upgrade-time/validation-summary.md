# Validation Summary: How to Measure Flux Helm Install/Upgrade Time

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux
- Flux helm-controller
- Kubernetes
- Helm
- Prometheus and PromQL
- kubectl

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The raw metrics examples used `kubectl exec` with `curl` inside the helm-controller container. This is not a reliable approach because controller images may not include `curl`; the Flux docs document metrics on port `8080` and Prometheus scraping. Changed the example to use `kubectl port-forward` and local `curl`.
- The aggregate average and P95 PromQL examples did not aggregate the per-resource time series before computing cluster-level values. Updated the average query to divide summed rates and the P95 query to use `sum by (le)` before `histogram_quantile`.
- The logs section said the command enabled debug logging, but it only follows and filters existing logs. Changed the wording to say it inspects logs.
- The status description referenced "last applied revision", which is not the current HelmRelease v2 status field. Updated it to mention last attempted revision, last attempted release action and duration, release history, and conditions.
- The install vs upgrade comparison overstated that first installs are typically faster because Helm does not calculate a diff. Reworded it to a more accurate, qualified explanation that performance varies and upgrades update an existing release.
- The test optimization section claimed Helm tests run after install and upgrade by default. Flux runs Helm tests only when `.spec.test.enable` is set to `true`. Updated the text to state that tests are opt-in and should remain disabled during benchmarking.

## Review Notes
The metrics measure full HelmRelease reconciliation duration, not only the Helm install or upgrade action. Current Flux HelmRelease status also exposes `.status.lastAttemptedReleaseActionDuration`, which can be useful for action-specific timing when available.
