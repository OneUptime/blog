# Validation Summary: How to Set Resource Requests and Limits for Kubernetes Apps in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- Kubernetes resource requests and limits
- Kubernetes QoS classes
- Kubernetes `LimitRange`
- Metrics Server

## Sources Consulted
- Portainer Applications: https://docs.portainer.io/user/kubernetes/applications
- Portainer Add a new application using a form: https://docs.portainer.io/2.27/user/kubernetes/applications/add
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Assign Memory Resources to Containers and Pods: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- `kubectl top node` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Metrics Server installation instructions: https://github.com/kubernetes-sigs/metrics-server

## Issues Found
1. **Portainer UI section name was off.** The post referred to a generic `Resources` section, while current Portainer documentation labels this area `Resource reservations`. I updated the wording to match the documented UI.
2. **The YAML snippet needed explicit scope.** The example started at `spec.containers`, which is valid as a Pod-spec fragment but incomplete as a standalone manifest. I added a short lead-in clarifying that the snippet is for a Pod spec so readers do not treat it as a full manifest.
3. **The resource-sizing recommendation was too prescriptive.** The original text implied a fixed percentage formula for requests and limits. Kubernetes documentation does not prescribe that rule, so I changed it to a safer guidance based on steady-state usage and observed peaks.
4. **The memory-limit explanation was inaccurate.** The post said a container is immediately killed when it exceeds its memory limit. Kubernetes documents memory limits as reactively enforced by the kernel under memory pressure, and OOM kills are commonly seen as `OOMKilled` with exit code `137`. I corrected that wording and replaced the unreliable `kubectl get events | grep OOMKilled` command with `kubectl describe pod` and `kubectl get pod -o yaml`, which align with the Kubernetes troubleshooting guidance.
5. **The CPU-throttling check used the wrong tool.** `kubectl top` reports usage, not throttling. I updated the text so it explicitly frames `kubectl top pod --containers` as a usage check and notes that direct throttling data usually comes from the monitoring stack rather than `kubectl top`.
6. **The QoS class criteria were oversimplified.** The original table defined `Burstable` as `requests != limits`, which is not the Kubernetes rule. I updated the `Guaranteed`, `Burstable`, and `BestEffort` conditions to match the official QoS criteria.
7. **Several `kubectl top` commands did not match the official reference form.** I normalized them to the documented `kubectl top pod` and `kubectl top node` command forms.

## Review Notes
- The core explanations of CPU units, memory units, scheduler use of requests, CPU throttling behavior, and `LimitRange` defaults are technically correct after the fixes.
- The post does not pin Kubernetes or Portainer versions. The reviewed guidance matches current Kubernetes documentation and Portainer 2.27 documentation as of April 24, 2026.
- Newer Kubernetes versions also support Pod-level resource requests and limits behind the `PodLevelResources` feature, but the post's container-level examples remain correct and are the relevant model for the Portainer form flow described here.
- `kubectl` was not installed in the local review environment, so command verification relied on the official generated `kubectl` reference pages rather than local `--help` output.
