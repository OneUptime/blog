# Validation Summary: How to Migrate a Kubernetes Deployment to Argo Rollouts Without Downtime

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- Argo Rollouts 1.9.1 and the `argoproj.io/v1alpha1` Rollout API
- Kubernetes Deployments, ReplicaSets, Pods, Services, and EndpointSlices
- Argo Rollouts `workloadRef` migration and `scaleDown` modes
- Replica-weighted and traffic-routed canary strategies
- Argo Rollouts kubectl plugin
- Kubernetes readiness probes and PodDisruptionBudgets
- Horizontal Pod Autoscaling
- GitOps reconciliation
- jq

## Sources Consulted

- Argo Rollouts: Migrating to Rollouts — https://argo-rollouts.readthedocs.io/en/stable/migrating/
- Argo Rollouts: Rollout specification — https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- Argo Rollouts: Canary strategy — https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Argo Rollouts: Getting started — https://argo-rollouts.readthedocs.io/en/stable/getting-started/
- Argo Rollouts: Traffic management overview — https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/
- Argo Rollouts: HPA support — https://argo-rollouts.readthedocs.io/en/stable/features/hpa-support/
- Argo Rollouts kubectl plugin: get rollout — https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/
- Argo Rollouts kubectl plugin: status — https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_status/
- Argo Rollouts kubectl plugin: promote — https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_promote/
- Argo Rollouts 1.9.1 release — https://github.com/argoproj/argo-rollouts/releases/tag/v1.9.1
- Argo Rollouts 1.9.1 controller promotion and `onsuccess` scale-down logic — https://github.com/argoproj/argo-rollouts/blob/v1.9.1/rollout/sync.go
- Argo Rollouts 1.9.1 progressive workload scale-down logic — https://github.com/argoproj/argo-rollouts/blob/v1.9.1/rollout/replicaset.go
- Argo Rollouts 1.9.1 Rollout status API definition — https://github.com/argoproj/argo-rollouts/blob/v1.9.1/pkg/apis/rollouts/v1alpha1/types.go
- Kubernetes: Deployments — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes: Services — https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes: EndpointSlices — https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes: Configure liveness, readiness, and startup probes — https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes: Disruptions and PodDisruptionBudgets — https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes: `kubectl get` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes: `kubectl scale` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes: Update API objects with `kubectl patch` — https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/

## Issues Found

1. **PodDisruptionBudgets were described as scheduling and controller scale-down constraints.** PDBs constrain voluntary evictions through the Eviction API; they do not make Pods schedulable and do not block workload controllers from scaling or rolling out Pods. Moved PDBs out of the scheduling checks, documented their actual role, and removed them from the list of reasons new Pods may remain unscheduled.

2. **Service routing to Ready endpoints was stated too absolutely.** A Service with `publishNotReadyAddresses: true` treats endpoints as ready regardless of Pod readiness, and modern proxies have special fallback behavior for terminating endpoints. Qualified the claim for the example's default `publishNotReadyAddresses: false` behavior and stated that proxies normally exclude endpoints marked not ready.

3. **The rollout status timeout was shorter than the configured rollout duration.** The canary has two ten-minute pauses, so a 20-minute timeout leaves no time for image pulls, scheduling, readiness, or controller reconciliation and would normally expire before completion. Increased the timeout to 30 minutes.

4. **The staged traffic-router sequence conflicted with `workloadRef.scaleDown: onsuccess`.** With `onsuccess`, Argo can scale the Deployment to zero when the initial Rollout becomes healthy, even if an intentionally unchanged production route still points to the Deployment topology. Added the requirement to use `scaleDown: never` for that manual routing sequence so the operator controls the final scale-down.

5. **The rollback commands could race the Rollouts controller.** Scaling the referenced Deployment up while the initial Rollout remains healthy and configured with `onsuccess` can be undone by controller reconciliation. Added a merge patch that changes `scaleDown` to `never` before restoring Deployment capacity, and expanded the GitOps warning to cover that field.

6. **HPA ownership during cutover was underspecified.** An HPA still targeting the Deployment can write its replica count after Argo scales it down. Added an explicit prerequisite to retarget the HPA to the Rollout or otherwise prevent it from writing Deployment replicas during cutover.

7. **The Pod diagnostic could not identify the workload controller and checked only the first container.** A managed Pod's direct owner is a ReplicaSet regardless of whether a Deployment or Rollout owns that ReplicaSet, so the owner kind was always `ReplicaSet`. In addition, the readiness of `containerStatuses[0]` is not the Pod's overall Ready condition when sidecars are present. Changed the output to show the owning ReplicaSet name and the Pod-level Ready condition.

8. **The final label-filtered query omitted both controller objects in the supplied manifests.** `kubectl get ... -l app=checkout` filters each resource's own metadata labels; the examples apply `app: checkout` to Pod templates but not to Deployment or Rollout metadata. Split the command so controllers are listed without that label filter while ReplicaSets and Pods retain it.

9. **The raw status inspection did not guard against a stale Rollout phase or display the conditions named by the surrounding text.** The Rollout 1.9.1 API states that clients should rely on `status.phase` only when `status.observedGeneration` equals `metadata.generation`. Added both generation values and `.status.conditions` to the jq output, and documented the required generation check.

## Review Notes

- The post was validated against Argo Rollouts 1.9.1, released July 17, 2026. `argoproj.io/v1alpha1` remains the current Rollout API version in that release.
- The complete `workloadRef` Rollout example passed `kubectl-argo-rollouts` 1.9.1 lint validation. All YAML snippets parsed successfully, and the jq filter compiled successfully.
- The image names under `registry.example.com` and the `/ready` endpoint are intentionally illustrative and must exist in the reader's environment.
- Zero-downtime behavior still depends on accurate readiness, sufficient capacity, application connection draining, and the actual Service or external routing data plane.
