# Validation Summary: How to Use wrk for Istio Performance Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- wrk
- LuaJIT scripting
- Istio service mesh
- Kubernetes
- Envoy/Istio retry and rate limiting behavior
- Fortio

## Sources Consulted
- wrk README and command-line options: https://github.com/wg/wrk
- wrk SCRIPTING API reference: https://raw.githubusercontent.com/wg/wrk/master/SCRIPTING
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Istio release-1.22 httpbin sample manifest: https://raw.githubusercontent.com/istio/istio/release-1.22/samples/httpbin/httpbin.yaml
- Fortio official documentation: https://fortio.org/

## Issues Found
- The introduction said wrk can generate significant load from a single thread. The official wrk README describes significant load from a single multi-core CPU with a multithreaded design, so this was changed to "single multi-core machine."
- The introduction described wrk as producing latency histograms. wrk prints latency statistics and, with `--latency`, percentile distribution output, so this was changed to "latency statistics."
- The custom Lua report labeled `summary.errors.status` as total errors. wrk's scripting API separates connect, read, write, status, and timeout errors, so the example now sums all error categories before printing total errors.
- The rate limiting section implied the wrk command alone tests a configured rate limit. The text now clarifies that the command is for services that already have an Istio or Envoy rate limit policy configured.

## Review Notes
The examples use Istio release-1.22 sample manifests, which are valid for the version referenced in the URLs. The `williamyeh/wrk:latest` container image is not an official wrk image, but the post uses it only as a convenient runtime image; pinning to a digest or maintained internal image would improve reproducibility in the future.
