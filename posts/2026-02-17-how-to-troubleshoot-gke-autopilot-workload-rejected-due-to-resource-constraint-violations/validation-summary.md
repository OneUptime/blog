# Validation Summary: How to Troubleshoot GKE Autopilot Workload Rejected Due to Resource Constraint

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine Autopilot
- Kubernetes Deployments, Pods, DaemonSets, resource requests, limits, and securityContext
- Kubernetes volume types
- kubectl server-side dry run
- GKE Autopilot compute classes and GPU scheduling

## Sources Consulted
- Google Cloud: Resource requests in Autopilot - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests
- Google Cloud: GKE Autopilot security measures - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-security
- Google Cloud: Choose compute classes for Autopilot Pods - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/autopilot-compute-classes
- Google Cloud: Deploy GPU workloads in Autopilot - https://cloud.google.com/kubernetes-engine/docs/how-to/autopilot-gpus
- Kubernetes documentation: Resource management for Pods and containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: kubectl apply reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#apply

## Issues Found
- The resource limits table used outdated or oversimplified values. Updated general-purpose CPU, memory, and ephemeral storage minimums and maximums to reflect current Autopilot behavior, including bursting versus non-bursting clusters.
- The post stated that Autopilot always sets limits equal to requests and adjusts higher limits down to requests. Updated this to reflect current bursting behavior: CPU and memory limits can be unset or higher than requests on clusters that support bursting, while ephemeral storage limits must equal requests.
- Several complete Deployment examples omitted required `spec.selector` and matching template labels. Added selectors and labels so the examples are valid `apps/v1` Deployments.
- The compute class example used an annotation. Updated it to use the documented `cloud.google.com/compute-class` `nodeSelector`.
- The volume list incorrectly said `nfs` was not allowed and omitted `csi` and `gcePersistentDisk`. Updated the allowed and blocked volume lists, including Autopilot's limited read-only `/var/log` exception for `hostPath`.
- The post described privilege escalation as blocked by default in Autopilot. Updated the section to explain that `allowPrivilegeEscalation: false` is required by stricter Pod Security or custom policies, not by the default Autopilot policy.
- The DaemonSet section implied only allowlisted controllers could use DaemonSets. Updated it to state that Autopilot supports DaemonSets but applies distinct resource defaults and limits, and that blocked host-level features still require another pattern.
- The migration checklist said Autopilot requires resource requests. Updated it to explain that Autopilot can add defaults, but explicit resource requests are recommended.

## Review Notes
Autopilot limits are version-sensitive and depend on compute class, hardware, and cluster bursting support. Future updates should re-check the GKE resource request table before publishing or revising numeric limits.
