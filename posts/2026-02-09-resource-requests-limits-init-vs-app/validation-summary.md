# Validation Summary: How to Set Resource Requests and Limits for Init Containers vs App Containers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes init containers
- Kubernetes sidecar containers
- Kubernetes resource requests and limits
- Kubernetes QoS classes
- kubectl
- Prometheus metrics

## Sources Consulted
- Kubernetes Init Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Sidecar Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes Resource Management for Pods and Containers documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Quality of Service Classes documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
- The post said init containers and app containers are never running at the same time. This is true for regular init containers, but not for sidecar init containers. Updated the wording to specify regular init containers.
- The resource limits section said the effective app-container limit side was the max of all app container limits. Kubernetes uses the sum of all app container limits for that resource, then compares that sum with the effective init limit. Updated the bullet to say "sum".
- The limits example said the pod can use up to the effective limit at any moment. Container limits still apply to individual containers, so this could imply more runtime capacity for app containers than their own limits allow. Updated the wording to distinguish the pod's effective limit from per-container caps.
- The sidecar init container section described support as "Kubernetes 1.28+". Native sidecar containers were introduced behind the `SidecarContainers` feature gate, enabled by default since Kubernetes 1.29, and stable in Kubernetes 1.33. Updated the version wording.
- The sidecar init container resource calculation was broadly correct for the example, but needed a caveat that sidecars add to the non-init container total unless another regular init container has a larger request. Added that caveat.

## Review Notes
The remaining examples use placeholder images and partial manifests in several sections, which is acceptable for illustrative snippets. The `kubectl top pod my-app --containers` command matches the official kubectl reference, but it only reports current metrics through the metrics pipeline; historical init-container usage requires a separate metrics backend such as Prometheus.
