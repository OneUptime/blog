# Validation Summary: How to Troubleshoot GKE Node Pool Out of Memory Kills

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Pods, Deployments, node pressure eviction, and QoS classes
- Kubernetes resource requests and limits
- Vertical Pod Autoscaler
- kubectl
- gcloud CLI and Cloud Logging log-based metrics
- Java and Node.js container memory settings

## Sources Consulted
- Kubernetes: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes: Assign Memory Resources to Containers and Pods - https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Kubernetes: Node-pressure Eviction - https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes: Pod Quality of Service Classes - https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes: Vertical Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes: Deployment API reference - https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes: kubectl top reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/
- Kubernetes: kubectl set resources reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Google Cloud: Troubleshoot OOM events in GKE - https://cloud.google.com/kubernetes-engine/docs/troubleshooting/oom-events
- Google Cloud: Scale container resource requests and limits with GKE VPA - https://cloud.google.com/kubernetes-engine/docs/how-to/vertical-pod-autoscaling
- Google Cloud: Resource requests in GKE Autopilot - https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests
- Google Cloud SDK: gcloud container node-pools create - https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud SDK: gcloud logging metrics create - https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create

## Issues Found
- The opening explanation said `OOMKilled` means the container exceeded its memory limit. Updated it to account for both container-level and node-level OOM events, matching GKE's OOM troubleshooting documentation.
- The exit code 137 explanation was too absolute. Clarified that 137 means SIGKILL, and it indicates an OOM event when paired with the `OOMKilled` termination reason.
- The node-level eviction explanation was oversimplified as pure QoS ordering. Updated it to mention requests, priority, and usage relative to requests, which Kubernetes considers during node-pressure eviction.
- The Deployment YAML omitted the required `spec.selector` and matching Pod template labels for `apps/v1`. Added the selector and labels.
- The memory request/limit guidance incorrectly implied that equal requests and limits should generally be avoided because they prevent bursting. Updated it to reflect Kubernetes/GKE guidance: equal memory requests and limits are appropriate for Guaranteed QoS and predictable scheduling; higher limits than requests are for bursty workloads that can tolerate eviction risk.
- The VPA section said VPA recommends requests and limits. Updated it to say VPA provides CPU and memory request recommendations, consistent with GKE's documented output.
- The Cloud Logging metric filter used `resource.type="k8s_container"` and `jsonPayload.message=~"OOMKilled"`, which does not match GKE's documented OOM log query pattern. Updated it to use `resource.type="k8s_node"` with `jsonPayload.MESSAGE:("ContainerDied" OR "TaskOOM event")`.
- The Autopilot section focused only on limits and used a JSON Patch `replace` operation that can fail if the target resource fields do not already exist. Updated it to adjust both requests and limits with `kubectl set resources`.

## Review Notes
The local environment did not have `kubectl` or `gcloud` installed, so CLI validation was performed against official Kubernetes and Google Cloud SDK documentation instead of local `--help` output.
