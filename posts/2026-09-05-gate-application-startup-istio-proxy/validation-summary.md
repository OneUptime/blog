# Validation Summary: The Application Starts Before Istio Proxy: Gate Startup with `holdApplicationUntilProxyStarts` or Native Sidecars

## Status

validated

## Post Type

Technical troubleshooting and configuration guide.

## Technologies Covered

- Istio 1.31 sidecar injection, proxy configuration, Istio CNI, and pilot-agent
- Kubernetes Pods, lifecycle hooks, restartable init containers, probes, Deployments, and Jobs
- Envoy readiness and xDS configuration
- kubectl, istioctl, Bash, curl, jq, and YAML

## Sources Consulted

- Istio Global Mesh Options: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Sidecar Injection Problems: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio CNI installation and traffic redirection: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio installation with istioctl and IstioOperator input: https://istio.io/latest/docs/setup/install/istioctl/
- Istio 1.24 change notes, including the per-Pod native-sidecar annotation: https://istio.io/latest/news/releases/1.24.x/announcing-1.24/change-notes/
- Istio pilot-discovery command and environment reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio 1.31 injection template: https://github.com/istio/istio/blob/release-1.31/manifests/charts/istio-control/istio-discovery/files/injection-template.yaml
- Istio 1.31 chart defaults: https://github.com/istio/istio/blob/release-1.31/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio 1.31 wait implementation: https://github.com/istio/istio/blob/release-1.31/pilot/cmd/pilot-agent/app/wait.go
- Kubernetes Sidecar Containers: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes Adopting Sidecar Containers: https://kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/
- Kubernetes Pod Lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes logs command: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes apply command: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes rollout status command: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes port-forward command: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes v1.33 kubelet container startup and failed postStart handling: https://github.com/kubernetes/kubernetes/blob/v1.33.0/pkg/kubelet/kuberuntime/kuberuntime_container.go
- Kubernetes v1.33 kubelet regular-container startup loop: https://github.com/kubernetes/kubernetes/blob/v1.33.0/pkg/kubelet/kuberuntime/kuberuntime_manager.go

## Issues Found

1. **The legacy hold was described as an indefinite blocking gate on proxy failure.** Istio 1.31 invokes `pilot-agent wait` without overriding its default 60-second timeout. Kubernetes kills the proxy when its postStart hook fails, but the regular-container startup loop can continue to the application. Updated the opening description, limitations, and disruption-test expectations to describe this timeout and avoid promising fail-closed behavior. This conclusion follows from the Istio wait implementation and kubelet error handling, rather than only the simplified Istio troubleshooting description.
2. **The native-sidecar guidance did not make the readiness-gating requirement explicit.** A restartable init container without a startup probe can be considered started once its process runs. A readiness probe alone does not gate application startup. Clarified that the startup probe must succeed and that Istio 1.31 enables the port-15021 readiness startup probe by default, so the injected result must retain it.
3. **The explanation for quoting the annotation value was incomplete.** Changed the explanation to identify Kubernetes annotation string requirements; being an Istio feature selector is not the reason YAML boolean values must be quoted.
4. **The conclusion described regular containers as starting concurrently.** Replaced this with the precise absence of readiness-based ordering. Kubelet issues regular-container start operations in a loop, while their processes can initialize concurrently; literal simultaneous starts are not the relevant guarantee.

## Review Notes

- Confirmed the Kubernetes native-sidecar milestones: alpha in 1.28, default-enabled beta in 1.29, and stable in 1.33. The 1.28 termination caveat is documented. Historical feature availability does not imply that a current Istio release supports every older Kubernetes version.
- Confirmed the native-sidecar annotation's introduction in Istio 1.24, its alpha catalog status, its precedence over the injector environment setting, and the current documented `auto` default.
- Confirmed that the Istio 1.31 template suppresses the legacy hold hook for native sidecars. Custom proxy lifecycle values can override the generated lifecycle hook, reinforcing the existing instruction to inspect injected Pods.
- Confirmed the hold option's false default and its proxy configuration placement. The IstioOperator example remains valid input for istioctl; it does not require the removed in-cluster Istio operator. Deployment snippets are intentionally incomplete merge fragments, as the post explains.
- Confirmed capture setup precedes regular application containers, native-sidecar Job completion and shutdown semantics, and the distinction between agent readiness on port 15021 and Envoy admin requests on port 15000. Local proxy readiness does not certify downstream dependency health.
- Checked CLI syntax and relevant flags against official references. Parsed every YAML block, checked every Bash block with `bash -n`, and executed both jq filters against representative Pod JSON successfully.
- Checked the documentation destinations and retrieved the version-specific GitHub source through raw.githubusercontent.com when the browsing tool could not fetch the raw URLs. The post's source links identify the corresponding files.
- No live Kubernetes cluster was used. Injection rendering, admission behavior, rollout timing, failure-mode reproduction, and Job execution were reviewed through documentation and source rather than tested in a deployed environment. The example namespace, Pod names, labels, and deployment.yaml require an appropriate user environment.
- Startup gating does not continuously gate an already-running application when the proxy later restarts. The retained application retry, readiness, deadline, and concurrency-safety guidance remains necessary.
