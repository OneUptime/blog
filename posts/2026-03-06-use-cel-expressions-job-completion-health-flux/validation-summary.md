# Validation Summary: How to Use CEL Expressions for Job Completion Health in Flux

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD Kustomization health checks
- Flux CD Kustomization dependencies
- Flux CD notification-controller Alerts
- Kubernetes Jobs
- Kubernetes TTL-after-finished controller
- Kustomize name suffixes
- kubectl debugging commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes TTL-after-finished documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes cli-utils kstatus package documentation: https://pkg.go.dev/sigs.k8s.io/cli-utils/pkg/kstatus/status

## Issues Found
- The post title, tags, and description claimed to cover CEL expressions and CronJobs, but the examples use Flux built-in `healthChecks` and `wait`, not `healthCheckExprs`, and there were no CronJob examples. Updated the title, tags, and description to match the actual technical content.
- The database migration Job claimed that a top-level custom annotation would force recreation on each deployment. Updated the example to use Flux's `kustomize.toolkit.fluxcd.io/force: enabled` annotation and moved the migration version into the pod template metadata so a version change affects an immutable field.
- The parallel Job example described `backoffLimit: 6` as retrying each pod two times. Kubernetes `backoffLimit` is the number of failed Pods allowed before the Job is marked failed, so the comment was corrected.
- The idempotency section stated that Jobs are immutable once created. Corrected this to the more precise statement that Job pod templates are immutable.
- The "Pre-Delete Hook Pattern" implied Flux supports a pre-apply hook for an arbitrary cleanup Job and that the shown Job would run before the main migration. Replaced it with the supported Flux force-replace pattern for immutable field changes.
- The Alert example used `notification.toolkit.fluxcd.io/v1` for an Alert. Current Flux documentation shows Alert under `notification.toolkit.fluxcd.io/v1beta3`, while `v1` is for Receiver. Updated the Alert API version.
- The Alert example used `.spec.summary`, which current Flux docs mark as deprecated. Updated it to `.spec.eventMetadata.summary`.
- The pruning best practice implied Flux pruning always affects active Job manifests. Clarified that this applies when keeping Job objects after manifests are removed or renamed.
- The `backoffLimit: 0` best practice described migrations as idempotent. Updated the wording to focus on migration Jobs where retries could be unsafe.

## Review Notes
The `kubectl` binary was not available in the local environment, so command validation was performed against Kubernetes documentation rather than local `kubectl --help` output. The Flux health check examples use built-in Job health checks, not custom CEL health expressions; a future post could add a separate `healthCheckExprs` section if CEL-specific Job logic is desired.
