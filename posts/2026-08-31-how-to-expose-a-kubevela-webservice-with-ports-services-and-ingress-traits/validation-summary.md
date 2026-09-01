# Validation Summary: How to Expose a KubeVela Webservice with Ports, Services, and Ingress Traits

## Status
validated

## Post Type
Technical guide and troubleshooting tutorial

## Technologies Covered
- KubeVela Applications and programmable definitions
- KubeVela `webservice`, `scaler`, `expose`, and `gateway` capabilities
- Kubernetes Deployments, Services, and EndpointSlices
- Kubernetes Ingress, IngressClass, and ingress controllers
- Kubernetes readiness probes, TLS Secrets, and NetworkPolicy
- `vela`, `kubectl`, and `curl`

## Sources Consulted
- KubeVela Gateway for Public Access: https://kubevela.io/docs/end-user/traits/ingress/
- KubeVela built-in trait reference: https://kubevela.io/docs/end-user/traits/references/
- KubeVela built-in component reference: https://kubevela.io/docs/end-user/components/references/
- KubeVela v1.11 `gateway` definition: https://github.com/kubevela/kubevela/blob/v1.11.0/vela-templates/definitions/internal/trait/gateway.cue
- KubeVela v1.11 `webservice` definition: https://github.com/kubevela/kubevela/blob/v1.11.0/vela-templates/definitions/internal/component/webservice.cue
- KubeVela v1.7 deprecated `ingress` definition: https://github.com/kubevela/kubevela/blob/v1.7.0/vela-templates/definitions/deprecated/ingress.cue
- KubeVela v1.7 `gateway` definition: https://github.com/kubevela/kubevela/blob/v1.7.0/vela-templates/definitions/internal/trait/gateway.cue
- KubeVela v1.10 `gateway` definition: https://github.com/kubevela/kubevela/blob/v1.10.0/vela-templates/definitions/internal/trait/gateway.cue
- KubeVela namespaced capability lookup used by `vela show`: https://github.com/kubevela/kubevela/blob/v1.11.0/references/docgen/cluster.go
- KubeVela CLI reference for `vela show`: https://kubevela.io/docs/cli/vela_show/
- KubeVela CLI reference for `vela def list`: https://kubevela.io/docs/cli/vela_def_list/
- KubeVela CLI reference for `vela dry-run`: https://kubevela.io/docs/cli/vela_dry-run/
- KubeVela CLI reference for `vela up`: https://kubevela.io/docs/cli/vela_up/
- KubeVela CLI reference for `vela status`: https://kubevela.io/docs/cli/vela_status/
- Kubernetes Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress controllers: https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Service debugging: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/#does-the-service-have-any-endpointslices
- Kubernetes readiness probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes TLS Secrets: https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- curl `--resolve` reference: https://curl.se/docs/manpage.html#--resolve

## Issues Found
- The initial inspection commands did not explicitly query the Application namespace. Because namespace-local KubeVela definitions can override definitions from `vela-system`, the commands could miss the customized schema that the `apps` Application actually uses. Added `--namespace apps` to `vela show`, listed traits in both `apps` and `vela-system`, and retained the existing name filter.
- The opening said that a Service selects ready Pods. Service selectors match Pod labels independently of readiness; EndpointSlice conditions determine whether the selected backends are ready for ordinary Service traffic. Corrected the description to separate Pod selection from ready endpoints.
- The combined example created two Services: `ports[].expose: true` rendered `api`, while the named `gateway` trait rendered `api-public` and routed the Ingress to it. Added `existingServiceName: api` so the gateway reuses the webservice-owned Service, explained the behavior, and included a gateway-generated backend Service among the possible Service ownership choices.
- The EndpointSlice troubleshooting text stated categorically that an empty endpoint list means the selector matched no Pods. Matching Pods can still be ineligible as endpoints, including when they do not yet have Pod IPs. Changed this to a diagnostic indication and added the selector, Pod-label, and Pod-IP checks.
- The text treated `conditions.ready: false` only as failed Pod readiness. Terminating EndpointSlice endpoints also have `ready: false`, including cases where `serving` remains true. Corrected the explanation and directed readers to the `serving` and `terminating` conditions.

## Review Notes
- KubeVela v1.7 included both `gateway` and a deprecated `ingress` definition; the post correctly warns readers not to transplant the deprecated v1.7 schema into a current manifest.
- KubeVela's built-in `gateway` trait currently renders a Kubernetes Ingress; it is distinct from the Kubernetes Gateway API. Kubernetes now recommends Gateway API for new functionality, while the Ingress API remains stable but frozen.
- `ghcr.io/example/catalog-api:2.4.1`, `catalog.example.com`, and the angle-bracketed resource names and addresses are placeholders. A real image must listen on port 8080 and serve `/ready`, as the post states.
- The corrected Application YAML was parsed and dry-run rendered with the official KubeVela v1.11.0 CLI and v1.11 definitions. It produced one Deployment, one ClusterIP Service named `api`, and an Ingress named `api-public` whose backend is Service `api` on port 8080.
