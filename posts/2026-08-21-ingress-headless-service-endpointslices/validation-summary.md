# Validation Summary: How Ingress Routes to a Headless Service Through EndpointSlices

## Status

validated

## Post Type

Technical guide / Kubernetes troubleshooting tutorial

## Technologies Covered

- Kubernetes Ingress (`networking.k8s.io/v1`)
- Kubernetes Services and headless Services (`v1`)
- Kubernetes EndpointSlices (`discovery.k8s.io/v1`)
- Kubernetes Deployments, Pods, named ports, and readiness probes
- Ingress controllers and controller-specific backend discovery
- Retired community ingress-nginx controller v1.15.1
- Kubernetes RBAC, Events, NetworkPolicy, and DNS diagnostics
- `kubectl` custom columns, resource inspection, and logs
- Kubernetes `agnhost:2.53` diagnostic image

## Sources Consulted

- [Kubernetes Ingress concepts](https://kubernetes.io/docs/concepts/services-networking/ingress/) and [Ingress v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/) - verified API stability, frozen status, controller responsibility, Service backends, resource backends, port references, and path fields.
- [Kubernetes Service documentation](https://kubernetes.io/docs/concepts/services-networking/service/) and [Service v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/) - verified headless and selectorless behavior, named `targetPort` resolution, `publishNotReadyAddresses`, custom EndpointSlices, and the API-server port-forward restriction.
- [Kubernetes EndpointSlice concepts](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/) and [EndpointSlice v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/) - verified slice grouping, the control-plane default of 100 endpoints per slice, the API maximum of 1000, joining all Service slices, port mapping, address types, conditions, management labels, and `targetRef`.
- [Kubernetes readiness probe documentation](https://kubernetes.io/docs/concepts/workloads/pods/probes/) and [Pod lifecycle documentation](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination) - verified HTTP probe behavior and Pod readiness and termination effects on EndpointSlice conditions.
- [Kubernetes namespaces documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/) and [namespace creation task](https://kubernetes.io/docs/tasks/administer-cluster/namespaces/#creating-a-new-namespace) - verified that `apps` is not an initial namespace and must be created before namespaced objects can be stored there.
- [Kubernetes `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [`kubectl describe`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/), and [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) references - verified the commands, selectors, custom-column output, deployment log target, and `--since` duration.
- [Kubernetes kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/#viewing-and-finding-resources) and [Event API migration guidance](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#event) - verified the current Event sort key and the deprecation of legacy Event timestamps.
- [Kubernetes `agnhost:2.53` Dockerfile](https://github.com/kubernetes/kubernetes/blob/534003da8a5df5d90f1e0c9daaf3bce03a50fecc/test/images/agnhost/Dockerfile) and [`netexec` implementation](https://github.com/kubernetes/kubernetes/blob/534003da8a5df5d90f1e0c9daaf3bce03a50fecc/test/images/agnhost/netexec/netexec.go) - verified the `/agnhost` entrypoint, `netexec` subcommand, `--http-port` flag, and successful root-path response used by the readiness probe.
- [Ingress-NGINX Service Upstream documentation](https://github.com/kubernetes/ingress-nginx/blob/controller-v1.15.1/docs/user-guide/nginx-configuration/annotations.md#service-upstream) - verified the documented switch from endpoint peers to one Service ClusterIP and port.
- [Ingress-NGINX v1.15.1 controller source](https://github.com/kubernetes/ingress-nginx/blob/controller-v1.15.1/internal/ingress/controller/controller.go#L1115-L1173) and [EndpointSlice source](https://github.com/kubernetes/ingress-nginx/blob/controller-v1.15.1/internal/ingress/controller/endpointslices.go#L83-L188) - verified rejection of `clusterIP: None`, the logged error, fallback to EndpointSlice-derived peers, and readiness filtering.
- [Kubernetes v1.36 release: ingress-nginx retirement](https://kubernetes.io/blog/2026/04/22/kubernetes-v1-36-release/#ingress-nginx-retirement) - verified the March 24, 2026 retirement and end of releases, bug fixes, and security patches.
- [Kubernetes Gateway API documentation](https://kubernetes.io/docs/concepts/services-networking/gateway/) and [Endpoints deprecation announcement](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/) - verified the current alternative to frozen Ingress and the legacy status of the Endpoints API.

## Issues Found

1. The primary manifest used the `apps` namespace without creating it, so it failed on a stock cluster. Added a `v1/Namespace` object named `apps` before the namespaced resources.
2. The introduction and conclusion implied that every Ingress backend names a Service and that every controller supporting a headless backend must use EndpointSlices. Ingress can also use a custom-resource backend, and Kubernetes does not standardize controller discovery internals. Scoped the backend wording to Service-backed Ingresses and the direct-address behavior to controllers that consume EndpointSlices.
3. The EndpointSlice size statement applied the 100-endpoint default to any controller-managed slice. That default belongs to the Kubernetes control plane, while the API permits up to 1000 endpoints per slice. Scoped the statement to control-plane-managed EndpointSlices.
4. The Pod lifecycle statement was broad enough to include manually managed slices. Limited it to Kubernetes-managed EndpointSlices for selector-based Services backed by Pods.
5. The ingress-nginx discussion was outdated and described its ClusterIP option as simply incompatible with a headless backend. Identified ingress-nginx as retired and documented final v1.15.1 behavior: the single-ClusterIP lookup fails and logs an error, then the controller falls back to EndpointSlice-derived endpoints.
6. The troubleshooting checklist required EndpointSlice RBAC even for controllers that use DNS or legacy Endpoints. Made the RBAC check conditional on the controller consuming EndpointSlices.
7. The 502/503 explanation implied a fixed failure mapping across controllers. Reworded it to say a controller may return either status when no usable upstream is available, preserving the implementation-specific nature of the behavior.
8. The Event command sorted on legacy `.lastTimestamp`, which can be unset for newer Event representations. Changed it to the current documented `.metadata.creationTimestamp` sort key.

## Review Notes

- All five namespaced resources passed server-side API validation against Kubernetes v1.35.6 when tested in an existing namespace. Both final YAML blocks also passed client-side parsing with `kubectl` v1.34.1 and use current stable API versions.
- The `registry.k8s.io/e2e-test-images/agnhost:2.53` tag still resolves. Its entrypoint and `netexec` implementation make the Deployment arguments and HTTP readiness probe valid. It is a Kubernetes test image, not a production application image.
- The Service and Pod custom-column expressions, EndpointSlice label selector, `kubectl describe`, and `kubectl logs deployment/... --since=10m` syntax are valid. The Deployment log form selects one Pod by default; operators with multiple controller replicas may need `--all-pods=true --prefix` or a label selector for comprehensive logs.
- EndpointSlice condition fields are optional. Consumers must interpret an absent `ready` value as true and an absent `terminating` value as false; the controller-generated and manual examples in the post populate the relevant conditions as expected.
- The post correctly describes legacy Endpoints as an implementation possibility rather than recommending them; the core Endpoints API has been deprecated since Kubernetes v1.33.
- All external links in the post resolved to the intended official documentation, source, or retirement notice during validation.
