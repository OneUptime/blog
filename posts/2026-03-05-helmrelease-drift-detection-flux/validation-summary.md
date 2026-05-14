# Validation Summary: How to Configure HelmRelease Drift Detection in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- Kubernetes HelmRelease custom resources
- Helm
- Kubernetes kubectl
- GitOps drift detection

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/#drift-detection
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm drift detection configuration page: https://fluxcd.io/flux/installation/configuration/helm-drift-detection/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Flux helm-controller source for drift events: https://github.com/fluxcd/helm-controller/blob/main/internal/reconcile/atomic_release.go

## Issues Found
- The post described drift detection as comparing against the "last applied state" and correcting drift by re-applying Helm release values. Updated this to match Flux documentation: the controller compares the manifest from Helm storage with live cluster state using server-side dry-run apply, then corrects drift by patching or creating resources from the dry-run apply result.
- The verification section said to check HelmRelease status and used `grep` on `driftDetection`, but `spec.driftDetection` is configuration rather than a status field. Updated the text and command to read `.spec.driftDetection.mode` with `kubectl get ... -o jsonpath`.
- The event-watching command did not actually watch for new events despite the surrounding text saying "watch." Added `--watch`, which is supported by the official `kubectl events` command.
- The example event message was made more consistent with the Flux helm-controller's `DriftDetected` event reason and message wording.
- The diagram said drift correction re-applies resources. Updated it to say Flux patches or creates resources, matching the current controller behavior.

## Review Notes
The HelmRelease examples use the current `helm.toolkit.fluxcd.io/v2` API and valid `spec.driftDetection.mode` values. The example using `kubectl scale` is technically valid for charts where the Deployment replica count is managed by Helm and is not ignored by drift detection; environments using HPAs should configure ignore rules for `/spec/replicas`.
