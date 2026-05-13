# Validation Summary: HelmRelease Upgrade Remediation with Rollback on Failure in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- HelmRelease custom resources
- Kubernetes
- kubectl
- Helm

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The post described `retries: 3` as "attempt the upgrade up to three times." Flux treats `retries` as the number of retries after the failed action, so the text now says Flux retries the failed upgrade up to three times after the initial failed upgrade.
- The advanced rollback example used `rollback.recreate: false` and described rollback behavior as recreating pods. The Flux API marks `recreate` as deprecated and no longer functional after helm-controller moved to the Helm 4 SDK, so the field was removed and the explanation was adjusted.
- The common pitfalls section said `retries: 0` prevents any remediation. This is incomplete because Flux can still remediate the final failure when `remediateLastFailure: true` is set. The text now distinguishes retry remediation from final-failure remediation.
- The post said `remediateLastFailure` defaults to true for the rollback strategy. Flux documents that upgrade remediation defaults this field to `false` unless `retries` is greater than zero, so the explanation was corrected.

## Review Notes
The HelmRelease manifests use the current `helm.toolkit.fluxcd.io/v2` API and valid `spec.upgrade.remediation` fields. The `kubectl events --for helmrelease/my-app -n production --watch` command matches the current kubectl events reference.
