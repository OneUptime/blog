# Validation Summary: How to Configure HelmRelease Retry Strategy in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- HelmRelease custom resources
- Kubernetes
- Helm
- kubectl

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `flux get helmreleases` reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI `flux reconcile helmrelease` reference: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The post stated that after remediation retries are exhausted, Flux keeps trying the same desired state on each reconciliation interval. Updated this to match Flux behavior: after retries are exhausted, the release is left failed for that desired state; retrying the same desired state requires resetting failure counts or changing the desired state.
- The retry timeline showed only three total upgrade attempts for `retries: 3` and then a new interval cycle. Updated the timeline to show the initial attempt plus three retries, followed by exhausted retries and a new attempt only after a Git fix or reset.
- The best practice for timeout math said total time equals `retries * timeout`. Updated it because Flux has an initial attempt plus retries, and remediation time can also contribute.
- The `flux get helmrelease my-application -n production` command did not match the current official Flux CLI reference, which documents `flux get helmreleases [flags]`. Updated the command to `flux get helmreleases -n production`.
- The post implied `remediateLastFailure` should always be enabled. Updated this guidance to note that it should be used intentionally and that upgrade remediation defaults it to `true` when at least one retry is configured.

## Review Notes
- The HelmRelease examples use the current `helm.toolkit.fluxcd.io/v2` API and valid remediation, timeout, CRD, and cleanup fields.
- Flux also supports the newer `RetryOnFailure` install and upgrade strategy. The post now scopes its retry discussion to the default `RemediateOnFailure` strategy, which matches the remediation fields shown.
