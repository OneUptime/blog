# Validation Summary: How to Configure HelmRelease Rollback Action in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Kubernetes HelmRelease custom resources
- Helm rollback and release history
- GitOps deployment remediation

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `get helmreleases` reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI `suspend helmrelease` reference: https://fluxcd.io/flux/cmd/flux_suspend_helmrelease/
- Flux CLI `resume helmrelease` reference: https://fluxcd.io/flux/cmd/flux_resume_helmrelease/
- Helm rollback command reference: https://helm.sh/docs/helm/helm_rollback/
- Helm history command reference: https://helm.sh/docs/helm/helm_history/

## Issues Found
- The post described rollback as happening only after retries are exhausted. Flux performs remediation between retry attempts, and remediates the last failure when `remediateLastFailure` is enabled or defaults to enabled because `retries` is greater than `0`. Updated the explanation and diagram.
- The post described `spec.rollback.recreate` as deleting and recreating changed resources. Current Flux documentation says this option performs pod restarts if applicable, is deprecated as of Flux v2.8, and no longer has any effect. Updated the explanation and YAML comments.
- The post described `spec.rollback.force` as delete/recreate of all resources. Flux documents this as forcing resource updates through a replacement strategy. Updated the explanation and warning.
- The basic example comment said `rollback.cleanupOnFail` cleans up resources from a failed upgrade. That field cleans up new resources created during a failed rollback. Updated the comment.
- The post said Flux would retry the failed upgrade on the next reconciliation cycle after rollback. Flux tracks failure counters and resets them on configuration/value/chart changes or explicit reset. Updated the text to avoid implying unconditional retry on the next interval.
- The max history section implied arbitrary rollback depth. Updated the wording to say `spec.maxHistory` controls how much release history is available for rollback.

## Review Notes
The HelmRelease manifests use the current `helm.toolkit.fluxcd.io/v2` API and valid field names. The CLI commands for Flux, Helm, and kubectl are syntactically valid. The `spec.chart` form remains supported, though Flux production guidance now commonly recommends OCI-based charts with `chartRef` for new production setups.
