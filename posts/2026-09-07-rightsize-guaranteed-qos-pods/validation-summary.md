# Validation Summary: How to Rightsize Guaranteed QoS Pods Without Losing Their Kubernetes QoS Class

## Status
validated

## Post Type
Technical guide with Kubernetes resource configuration fragments and inspection commands.

## Technologies Covered
- Kubernetes 1.37 Pod QoS classes and resource requests/limits
- PodLevelResources and PodLevelResourceManagers feature gates
- CPU Manager static policy, Memory Manager, and Topology Manager
- Node-pressure eviction, CPU throttling, and memory OOM enforcement
- Init containers, sidecars, admission policies, and LimitRanges
- kubectl, JSONPath, YAML, and strategic merge patches

## Sources Consulted
- Pod QoS classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Configure Pod Quality of Service: https://kubernetes.io/docs/tasks/configure-pod-container/quality-service-pod/
- CPU management policies: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Assign Pod-level CPU and memory resources: https://kubernetes.io/docs/tasks/configure-pod-container/assign-pod-level-resources/
- Pod-level resource managers: https://kubernetes.io/docs/concepts/resource-management/pod-level-resource-managers/
- Node-pressure eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Init containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- In-place container resizing: https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- JSONPath syntax: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Strategic merge patch behavior: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- LimitRanges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Admission webhook practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Kubernetes pause image changelog: https://github.com/kubernetes/kubernetes/blob/master/build/pause/CHANGELOG.md

## Issues Found
1. **Eviction ordering was described too broadly.** The post placed Guaranteed pods after BestEffort and Burstable pods generally. Replaced this with memory-pressure ranking by usage exceeding requests, Pod Priority, and relative usage. Burstable pods below requests join Guaranteed pods in the later eviction group. Clarified that QoS is not the direct sorting key and that disk/PID pressure differs, following the dedicated eviction documentation.
2. **Memory limits were described as an absolute consumption ceiling.** Replaced the assertion that pods cannot exceed CPU and memory limits with separate CPU and memory enforcement descriptions. Memory enforcement is reactive and can allow temporary excess usage before an OOM kill.
3. **Init-container peaks were conflated with scheduling inputs.** Changed “its peak” to “the request sized for its peak” and scoped the statement to the container-level model. Scheduling accounts for configured resource requests rather than measured runtime peaks; Pod-level requests take precedence when specified.

## Review Notes
- Confirmed the documented Kubernetes 1.37 feature states: PodLevelResources is beta and enabled by default; PodLevelResourceManagers is separately beta and disabled by default. Windows Pod-level resources remain unsupported in the consulted documentation.
- Confirmed container-level CPU/memory equality requirements, their application to app and init containers, Pod-level QoS precedence, and rejection of in-place changes that would alter the Pod's lifetime QoS class.
- Confirmed integer CPU requests are required for traditional static-policy exclusive CPU allocation. A 1500m request retains Guaranteed classification with equal pairs but uses the shared CPU pool.
- Checked all four YAML blocks with PyYAML and the Bash block with bash -n. Verified kubectl namespace/output flags and JSONPath newline syntax against official references. The unequal CPU example intentionally demonstrates a configuration that fails the Guaranteed criteria.
- The YAML examples are fragments, not standalone manifests. The strategic merge fragment assumes the named containers already exist in the Deployment; their existing images are retained through name-based merging. The pause containers illustrate resource sharing rather than implement application or telemetry services.
- All six official documentation links resolve to the intended topics. The author profile URL is structurally plausible and is not a technical source.
- This was a documentation and syntax review, not a live-cluster test. Admission defaults, injected containers, scheduling, throttling, OOM behavior, and performance still require the staging and canary checks described in the post.
- Pod-level in-place resizing additionally requires the alpha InPlacePodLevelResourcesVerticalScaling gate in Kubernetes 1.37. The shown Deployment-template update creates replacement pods and does not depend on that gate.
- No deprecated API fields or command options were identified in the examples.
