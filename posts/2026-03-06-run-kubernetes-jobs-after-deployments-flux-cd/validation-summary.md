# Validation Summary: How to Run Kubernetes Jobs After Deployments with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD Kustomization dependencies and reconciliation
- Flux notification Alert resources
- Flux HelmRelease resources
- Kubernetes Deployments, Services, and Jobs
- Kubernetes Job cleanup behavior
- Helm chart hooks
- kubectl and flux CLI commands
- Shell scripting in Kubernetes Job containers

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes TTL-after-finished documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/

## Issues Found
- Flux Kustomization examples used `wait: true` together with explicit `healthChecks`. Flux documentation states that `.spec.healthChecks` is ignored when `.spec.wait` is `true`, so the redundant health check blocks were removed and the wording was changed to describe `wait: true` accurately.
- The post described `force: true` as recreating a Job each time. Flux documents `force` as recreating resources when immutable field changes prevent patching, so the comment was corrected and a note was added explaining that the Job pod template must change for a new release rerun.
- Flux-managed Job examples used `ttlSecondsAfterFinished`. Kubernetes TTL cleanup deletes finished Jobs, while Flux periodically corrects drift and reapplies missing desired-state objects, which can cause Jobs to run again later. The TTL fields were removed from Flux-managed Job examples and left only on the Helm hook Job.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1` and `spec.summary`. Current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3`, and `spec.summary` is deprecated in favor of `spec.eventMetadata.summary`, so the snippet was updated.
- The integration-test shell script captured `$?` after `cat /tmp/results/summary.txt`, not after `./run-tests.sh`. The exit-code assignment was moved immediately after the test command so the Job exits with the actual test result.

## Review Notes
The local workspace does not have `flux` or `kubectl` installed, so CLI command checks were performed against official documentation rather than local `--help` output. The Helm hook example is technically valid, but Flux HelmRelease users should keep hook wait/remediation behavior aligned with their installed Flux version and operational expectations.
