# Validation Summary: How to Troubleshoot the Kubeletstats Receiver Returning Empty Metrics Due to

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry kubeletstats receiver
- Kubernetes Kubelet API
- Kubernetes RBAC
- Kubernetes DaemonSet environment variables
- EKS, GKE, and AKS managed Kubernetes clusters

## Sources Consulted
- OpenTelemetry Collector Contrib kubeletstats receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kubeletstatsreceiver
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Kubernetes kubelet authentication and authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/
- Kubernetes ports and protocols documentation: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Google Cloud GKE documentation for disabling the kubelet read-only port: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/disable-kubelet-readonly-port
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The kubelet port description said every node has two API endpoints and described port 10250 as read-write. I changed this to describe the common kubelet ports and call 10250 the secure authenticated Kubelet API, which matches Kubernetes and OpenTelemetry documentation more closely.
- The `curl` commands used `$(NODE_IP)`, which tries to execute a command named `NODE_IP`, and the service account token command would be expanded by the local shell instead of inside the Collector pod. I changed the examples to run through `sh -c` inside the pod and use the `$NODE_IP` environment variable correctly.
- The RBAC snippet included `nodes/proxy` and `nodes` permissions but omitted `nodes/pods`, which the kubeletstats receiver needs when using `extra_metadata_labels` or request/limit utilization metrics. I replaced the permissions with the documented receiver permissions for `nodes/stats`, `nodes/pods`, and the persistent volume resources needed by `k8s_api_config`.
- The GKE section claimed GKE uses a different authentication model and might need node metadata. I changed it to align with GKE guidance to migrate workloads from the insecure read-only port to port 10250.
- The AKS section suggested checking whether API server authorization includes Node. I replaced that with the OpenTelemetry-documented AKS caveat that a custom kubelet server certificate may be needed when not using `insecure_skip_verify`.

## Review Notes
The post is technically relevant and the corrected receiver configuration fields are current for the OpenTelemetry Collector Contrib kubeletstats receiver as of the validation date. The example DaemonSet manifest is intentionally partial and should be treated as an excerpt rather than a complete deployable manifest.
