# Validation Summary: Rolling Out Kubernetes Rightsizing Safely

## Status
validated

## Post Type
Technical guide with YAML configuration examples and kubectl operational commands.

## Technologies Covered
- Kubernetes Deployments and ReplicaSets (`apps/v1`)
- CPU and memory requests and limits
- Horizontal Pod Autoscaler (HPA) and node autoscaling
- Startup and readiness probes
- PodDisruptionBudgets and voluntary evictions
- Canary traffic routing and Gateway API
- kubectl rollout and JSONPath
- Application performance monitoring and capacity planning

## Sources Consulted
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes probes (the post's original URL redirects here): https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes disruptions and PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes horizontal pod autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes node autoscaling: https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/
- Gateway API HTTP traffic splitting: https://gateway-api.sigs.k8s.io/guides/user-guides/traffic-splitting/
- kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- kubectl JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. The Deployment example omitted required `spec.selector` and `spec.template` fields without identifying itself as an excerpt. Clarified that it is a partial manifest whose settings must be merged into an existing complete Deployment. The rollout field names and values themselves are valid.
2. A distinct canary version label alone does not ensure controller isolation. Added the requirement for non-overlapping Deployment selectors and noted that an existing selector is immutable, preventing readers from assuming they can change it in place.
3. The opening reference to lowering memory did not distinguish requests from limits. Changed it to “memory limits” to accurately identify the setting that directly governs container OOM enforcement.

## Review Notes
- Confirmed the availability-delay and progress-deadline semantics, the lack of automatic deadline-triggered rollback, and the distinction between Deployment rolling-update controls and PDB eviction protection.
- Both YAML examples use valid syntax. The hypothesis and gate fields are illustrative experiment metadata, not a Kubernetes API schema or executable rollout policy. Thresholds, traffic percentages, and observation windows require workload-specific validation.
- Confirmed that resource-utilization HPA targets depend on requests, so changing requests can change replica decisions even at unchanged usage. CPU throttling and reactive memory-limit enforcement support the stated performance risks.
- Weighted routing requires a routing implementation; Deployment replica counts alone do not guarantee traffic percentages. Representative per-replica load should be checked before promotion.
- Reviewed all three commands against the rollout, Deployment, and JSONPath documentation. They assume an existing checkout Deployment in the payments namespace and suitable access. The undo command changes the workload and requires retained revision history; it is not a read-only check. Rollback restores the Pod template, not every Deployment field.
- Node-hour cost guidance assumes node-based billing. Actual savings and rollback scale-up time depend on infrastructure, scheduling constraints, autoscaler configuration, and available provider capacity.
- Monitoring suggestions and cost-per-successful-request comparisons are operational recommendations, not guarantees that Kubernetes exposes every listed metric by default. Runtime-specific instrumentation is needed for signals such as garbage collection.
- All links in the post resolved to the intended resources, including redirects for the probes documentation and author profile. No deprecated API or command usage was identified; the post does not pin a Kubernetes version.
- Review was documentation-based. No live-cluster rollout, load test, or rollback was executed, and workload-specific SLO or cost outcomes were not measured.
