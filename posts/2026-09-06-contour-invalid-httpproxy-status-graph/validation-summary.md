# Validation Summary: Diagnose Invalid HTTPProxies with Status and the Contour Graph

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes and Contour CLI examples.

## Technologies Covered
- Contour 1.33 and the projectcontour.io/v1 HTTPProxy API
- Kubernetes CRDs, conditions, Services, EndpointSlices, Secrets, and kubectl
- HTTPProxy inclusion and TLSCertificateDelegation
- Envoy LDS, RDS, CDS, and EDS resources
- Graphviz DOT/SVG and curl

## Sources Consulted
- Contour 1.33 HTTPProxy API reference: https://projectcontour.io/docs/1.33/config/api-reference/
- Contour 1.33 graph visualization: https://projectcontour.io/docs/1.33/troubleshooting/contour-graph/
- Contour 1.33 xDS inspection: https://projectcontour.io/docs/1.33/troubleshooting/contour-xds-resources/
- Contour 1.33 debug logging: https://projectcontour.io/docs/1.33/troubleshooting/contour-debug-log/
- Contour 1.33 inclusion: https://projectcontour.io/docs/1.33/config/inclusion-delegation/
- Contour 1.33 routing: https://projectcontour.io/docs/1.33/config/request-routing/
- Contour 1.33 TLS termination: https://projectcontour.io/docs/1.33/config/tls-termination/
- Contour ingress class configuration: https://projectcontour.io/docs/1.33/config/ingress/
- Contour v1.33.0 HTTPProxy processing (validation, Service references, includes, partial routes, and 502 responses): https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/httpproxy_processor.go
- Contour v1.33.0 DOT renderer: https://github.com/projectcontour/contour/blob/v1.33.0/internal/debug/dot.go
- Contour v1.33.0 Secret validation: https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/secret.go
- Contour v1.33.0 ingress class filtering: https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/cache.go
- Contour v1.33.0 status generation: https://github.com/projectcontour/contour/blob/v1.33.0/internal/status/proxystatus.go
- Contour v1.33.0 detailed conditions: https://github.com/projectcontour/contour/blob/v1.33.0/apis/projectcontour/v1/detailedconditions.go
- Kubernetes condition conventions: https://github.com/kubernetes/community/blob/main/contributors/devel/sig-architecture/api-conventions.md#typical-status-properties
- kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl apply: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl wait: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kubectl wait observed-generation checks: https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/wait/condition.go
- kubectl port-forward: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Graphviz command line: https://graphviz.org/doc/info/command.html
- curl options: https://curl.se/docs/manpage.html

## Issues Found
1. **Invalid status was treated as an all-or-nothing rejection.** Clarified that fatal validation errors can coexist with generated routes. The 1.33 processor can preserve unaffected routes and generate direct 502 responses for certain invalid includes, so an invalid HTTPProxy does not imply that all its routes are absent from xDS.
2. **DOT was described as showing child HTTPProxy connections.** Replaced that description with virtual-host, route, cluster, and Service connections. The renderer does not emit child HTTPProxy nodes; inclusion is flattened before rendering.
3. **Certificate hostname coverage was mixed into Secret semantic validation.** Removed FQDN coverage from the invalid-Secret row. Contour checks Secret data and delegation, but its serving-Secret validator does not verify the certificate against the virtual-host FQDN. Hostname coverage remains necessary for successful client TLS verification.
4. **The duplicate-route clue was too broad.** Replaced it with duplicate include conditions, which corresponds to the processor's DuplicateMatchConditions error for sibling includes. Arbitrary overlapping routes are not interchangeable with that validation error.
5. **Class filtering was presented like a root-namespace validation error.** Distinguished disallowed root namespaces from missing or stale status caused by class filtering. Added the legacy ingress-class annotation because it takes precedence over spec.ingressClassName in this version.
6. **A path matcher appeared mandatory.** Changed “one” to “at most one”; routes can omit a path condition, including routes that match only headers or query parameters.
7. **The Kubernetes debug flag lacked its argument requirement.** Specified that --kubernetes-debug takes an integer verbosity level and supplied an example.

## Review Notes
- Reviewed against the explicitly linked Contour 1.33 documentation and v1.33.0 implementation, without assuming that 1.33 is the latest release.
- Confirmed the Valid condition polarity, errors/warnings distinction, observedGeneration assignment, and legacy status fields.
- Confirmed kubectl command syntax, EndpointSlice Service label, server-side dry-run semantics, local debug port 6060, /debug/dag endpoint, curl options, and Graphviz SVG output syntax.
- Confirmed the documented contour cli subcommands, certificate flags, and streaming behavior. Namespace, Pod labels, container name, and /certs paths assume the documented example deployment and must match the installed deployment.
- The current kubectl wait implementation checks condition observedGeneration when available; retained the wait command and subsequent YAML inspection.
- Official documentation links resolved to the intended resources. The Kubernetes conventions URL redirects from master to main.
- Checked every Bash block with bash -n and parsed validation.json. This was a documentation/source and syntax review; no live Kubernetes cluster, Contour deployment, or Envoy traffic test was used.
