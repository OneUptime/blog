# Validation Summary: How to Handle Pod Startup Order with Istio Sidecar

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Istio sidecar injection
- Envoy sidecar proxy readiness
- Kubernetes init containers and native sidecar containers
- Istio CNI plugin
- Kubernetes startup probes
- Python requests retry configuration
- Go HTTP client startup checks
- Shell entrypoint wrappers

## Sources Consulted
- Istio Global Mesh Options / ProxyConfig: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio Kubernetes Native Sidecars blog: https://istio.io/latest/blog/2023/native-sidecars/
- Istio sidecar injection template source: https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/files/injection-template.yaml
- Kubernetes Sidecar Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes v1.28 native sidecar announcement: https://kubernetes.io/blog/2023/08/25/native-sidecar-containers/
- Kubernetes API reference for init container restartPolicy: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/
- Kubernetes configure liveness, readiness, and startup probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Requests advanced usage documentation: https://requests.readthedocs.io/en/latest/user/advanced/
- urllib3 Retry API reference: https://urllib3.readthedocs.io/en/stable/reference/urllib3.util.html#urllib3.util.Retry
- Go net/http package documentation: https://pkg.go.dev/net/http

## Issues Found
- The native sidecar section implied Kubernetes 1.28+ support without caveats. Updated it to state that Kubernetes 1.28 introduced the feature as alpha, Kubernetes 1.29 enables it by default, and Kubernetes 1.33 marks it stable.
- The Istio CNI section incorrectly stated that init containers run without traffic interception when CNI is enabled. Updated it to match Istio's documentation: CNI configures redirection before init containers run, so init containers can still lose traffic unless a workaround such as proxy UID bypass or traffic exclusions is used.
- The `curl` wrapper used `curl -s -o /dev/null`, which exits successfully for HTTP error responses such as 503. Updated it to use `curl -fsS -o /dev/null` so it waits for a successful HTTP response.
- The Go sidecar wait example did not close HTTP response bodies. Updated it to close the response body and compare against `http.StatusOK`.
- Removed an unused Python `time` import from the retry example.
- Added clarification that Istio outbound IP and port exclusions apply to the whole pod, not just init containers.

## Review Notes
The examples remain intentionally concise. The Go snippet assumes the surrounding file imports `fmt`, `net/http`, and `time`.
