# Validation Summary: Fix Contour `unresolved service reference` Errors

## Status

validated

## Post Type

Technical troubleshooting guide with Kubernetes manifests and diagnostic commands.

## Technologies Covered

- Contour 1.33 and the `projectcontour.io/v1` HTTPProxy API
- Kubernetes Services, namespaces, EndpointSlices, and RBAC
- Envoy routing, upstream health, and access logs
- kubectl, JSONPath, jq, and curl
- HTTP, HTTPS, and TLS certificate verification

## Sources Consulted

- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/): Service port types, status conditions, virtual hosts, and ingress-class annotation precedence.
- [Contour 1.33 inclusion and delegation](https://projectcontour.io/docs/1.33/config/inclusion-delegation/): cross-namespace includes and child HTTPProxy configuration.
- [Contour 1.33 deployment options](https://projectcontour.io/docs/1.33/deploy-options/): namespace watch scope and ingress-class selection.
- [Contour 1.33 TLS termination](https://projectcontour.io/docs/1.33/config/tls-termination/): enabling TLS with a certificate Secret on the root.
- [Contour 1.33 common proxy errors](https://projectcontour.io/docs/1.33/troubleshooting/common-proxy-errors/): `UH`, `UF`, HTTP 503s, and identifying the selected upstream.
- [Contour v1.33.0 HTTPProxy processor](https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/httpproxy_processor.go): exact unresolved-reference error and lookup in the route owner's namespace.
- [Contour v1.33.0 DAG accessors](https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/accessors.go): Service resolution independently of endpoint readiness.
- [Contour v1.33.0 proxy status implementation](https://github.com/projectcontour/contour/blob/v1.33.0/internal/status/proxystatus.go): population of the condition's observed generation.
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/): selectors and Service port versus target port.
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/): Service association labels, endpoint ports, and readiness.
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/): resource selection and output options.
- [kubectl apply](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/) and [kubectl wait](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/): server-side dry-run and condition waiting.
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/): range expressions and quoted newline literals.
- [jq manual](https://jqlang.org/manual/): array iteration and object construction shorthand.
- [curl manual](https://curl.se/docs/manpage.html): `--resolve`, verbose output, output redirection, and TLS verification.

## Issues Found

1. **HTTPS test did not match the manifests.** Both root examples omit TLS configuration, but the final request used HTTPS on port 443. Changed the request to HTTP on port 80, explained replacing the example IP, and specified the root TLS configuration needed before using HTTPS.
2. **TLS success was presented as proof of correct routing.** A trusted certificate matching the hostname does not establish which route or backend handled an HTTP request. Replaced that claim with the actual certificate checks and instructions to confirm the response and Envoy access log.
3. **Condition waiting could accept stale status.** Waiting for `Valid=True` alone can return using a condition from an earlier HTTPProxy generation. Added an explicit comparison of the condition's `observedGeneration` with `metadata.generation`, and advised checking the included child as well.

## Review Notes

- Verified the core name, namespace, numeric Service-port, inclusion, ingress-class, and endpoint-health guidance against the versioned documentation and implementation. The five documentation links in the original post resolved to the intended official resources.
- The APIs and flags used are appropriate for the stated Contour 1.33 scope. The ingress-class annotation is correctly identified as deprecated; the examples use `spec.ingressClassName`.
- Parsed all four YAML documents successfully and checked every Bash block with `bash -n`. Validated the JSON contents and checked the README diff for whitespace errors.
- This was a documentation, source-code, and syntax review. No live Kubernetes deployment, server-side schema validation, reconciliation, or request test was performed.
- The examples assume an installed Contour CRD/controller, matching ingress-class configuration, existing namespaces and backend workloads, and an application serving the requested path. The standalone and delegated manifests are alternative configurations.
- Endpoint readiness can be affected by `publishNotReadyAddresses`; a missing readiness value is not equivalent to explicit false. The post correctly tells readers to inspect endpoints whose readiness is false.
- The initial list describes common causes, not every possible cause. Contour can also report unresolved references for an invalid configured health-check Service port or a rejected ExternalName Service, as shown in the versioned implementation.
