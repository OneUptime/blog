# Validation Summary: How to Configure ImageUpdateAutomation Update Strategy in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Image Automation Controller
- ImageUpdateAutomation
- ImagePolicy marker comments
- Kubernetes manifests
- Flux CLI

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI `flux get images update` documentation: https://fluxcd.io/flux/cmd/flux_get_images_update/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- Deployment examples were missing the required `.spec.selector` and matching `.spec.template.metadata.labels` fields for `apps/v1` Deployments. Added matching `app: frontend` selectors and pod template labels.
- The CronJob example omitted `.spec.jobTemplate.spec.template.spec.restartPolicy`. Added `restartPolicy: OnFailure`, which is valid for Jobs created by CronJobs.
- The StatefulSet example omitted required StatefulSet fields for a valid standalone manifest. Added `serviceName`, `.spec.selector`, and matching pod template labels.
- The marker format code fence was labeled `json` even though the example included a YAML comment prefix. Changed it to `text`; the JSON object inside the comment remains unchanged.

## Review Notes
Flux-specific content was current and aligned with official documentation: `image.toolkit.fluxcd.io/v1`, `strategy: Setters`, `update.path`, marker suffixes `:tag` and `:name`, HelmRelease value markers, and the Flux CLI commands are valid. The post does not mention digest markers, which are also supported, but that omission is not technically incorrect.
