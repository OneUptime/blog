# Validation Summary: Istio Proxy Readiness Returns 503: Verify Service Ports, Endpoints, and Envoy Configuration

## Status

validated

## Post Type

Technical troubleshooting guide.

## Technologies Covered

- Istio 1.31, pilot-agent, istioctl, sidecar injection, and xDS synchronization.
- Envoy readiness, initialization, listeners, routes, clusters, and endpoints.
- Kubernetes Pods, native sidecars, probes, Services, EndpointSlices, Deployments, and ephemeral debugging containers.
- kubectl, Bash, jq, and curl.

## Sources Consulted

- Istio 1.31 readiness implementation: https://github.com/istio/istio/blob/release-1.31/pilot/cmd/pilot-agent/status/ready/probe.go
- Istio 1.31 status HTTP handler: https://github.com/istio/istio/blob/release-1.31/pilot/cmd/pilot-agent/status/server.go
- Istio 1.31 injection template: https://github.com/istio/istio/blob/release-1.31/manifests/charts/istio-control/istio-discovery/files/injection-template.yaml
- Istio 1.31 chart defaults: https://github.com/istio/istio/blob/release-1.31/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio resource annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio debugging commands and synchronization states: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio CLI reference: https://istio.io/latest/docs/reference/commands/istioctl/
- pilot-agent CLI reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio configuration analysis: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio application requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Pod lifecycle and probes: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes
- Kubernetes native sidecars: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl debug: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl port-forward: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- kubectl apply: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl rollout status: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes agnhost image build definition, including shell and iproute2 installation: https://github.com/kubernetes/kubernetes/blob/v1.33.0/test/images/agnhost/Dockerfile
- Official registry manifest for the example image tag: https://registry.k8s.io/v2/e2e-test-images/agnhost/manifests/2.53
- Envoy admin readiness: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html#get--ready
- Envoy initialization and listener warming: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/init.html

## Issues Found

1. **Readiness dependencies were stated too absolutely.** The agent does not directly require populated EDS endpoints or particular HTTP routes, but Envoy initialization can wait for initial EDS/RDS responses or fetch timeouts before workers start. Qualified the statement to preserve this distinction.
2. **Probe inspection omitted native sidecars.** The two proxy/probe inspection filters searched only `spec.containers`. Updated them to include `spec.initContainers`, where Kubernetes native sidecars reside.
3. **Default startup-probe behavior was missing.** Stock Istio 1.31 enables a startup probe on the same readiness endpoint. Added the fact that kubelet defers readiness probing until startup succeeds, so startup failures must be distinguished from readiness failures.
4. **The admin command lacked execution context.** Clarified that `pilot-agent request GET ready` runs inside the `istio-proxy` container, where it can reach Envoy's local admin interface.
5. **Service enumeration implied automatic selector matching.** The jq command lists namespace Services and their selectors; it does not filter by the Pod's labels. Corrected the instruction to require comparing those selectors with the labels.
6. **Numeric and named target ports were conflated.** Clarified that numeric target ports must match the workload socket, while named target ports resolve through declared container ports. A numeric target port does not require a matching containerPort declaration.
7. **Endpoint readiness needed the publication exception.** Added that `publishNotReadyAddresses: true` makes EndpointSlice endpoints ready regardless of Pod readiness.
8. **The synchronization command produced the wrong output for the explanation.** Supplying a proxy ID to `istioctl proxy-status` requests a configuration diff. Changed it to the status table command and instructed readers to locate the example Pod's row. Scoped the missing-session statement to the queried control plane.
9. **Candidate configuration was not passed to the analyzer.** Changed the command to `istioctl analyze -n catalog catalog-service.yaml` so the proposed file is included in analysis before application.
10. **Rollout monitoring was presented as initiating a single-replica rollout.** Clarified that the displayed commands only monitor an already initiated rollout, that canary verification requires a canary Deployment, and that Service/xDS changes normally propagate without Pod recreation.
11. **The liveness warning contradicted cached readiness behavior.** Scoped the control-plane-disconnection restart-loop warning to a custom liveness check that requires an active connection. Explicitly stated that stock readiness does not fail solely on a later xDS disconnect.
12. **The conclusion excluded shutdown failures.** The readiness implementation also rejects readiness when its context is canceled. Expanded the conclusion's characterization to include proxy lifecycle/shutdown behavior.

## Review Notes

- Confirmed from release-1.31 source that the agent requires positive CDS and LDS success counters, caches successful configuration and Envoy readiness checks, checks LIVE state and worker startup, and retains a context-cancellation check. Empty application endpoint sets alone do not fail this gate.
- Confirmed the default probe path and port, admin request behavior, protocol naming conventions, appProtocol precedence, and the unsupported conflicting-protocol case for Services sharing a workload port.
- Reviewed the command syntax and documented flags. All 13 Bash code blocks passed `bash -n`. All four jq filters executed successfully against synthetic Kubernetes JSON containing application and native-sidecar containers plus a Service.
- Verified that the official registry serves the agnhost:2.53 manifest. Reviewed the official agnhost Dockerfile for shell and socket-inspection tooling; the image itself was not pulled or executed.
- Official documentation links were reachable. GitHub source pages were verified through their corresponding raw.githubusercontent.com URLs when the browser fetch could not retrieve them.
- This was a documentation/source review with local syntax and fixture checks, not a live Kubernetes/Istio integration test. Example Pod names, namespace, application container name, Service FQDN, ports, and candidate manifest must match the reader's environment.
- Changes were limited to technical corrections within the existing sections. The post remains relevant and technically substantive.
