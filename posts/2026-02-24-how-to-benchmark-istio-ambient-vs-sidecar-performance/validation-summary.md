# Validation Summary: How to Benchmark Istio Ambient vs Sidecar Performance

## Status
validated

## Post Type
Tutorial / benchmarking guide

## Technologies Covered
- Istio ambient mesh
- Istio sidecar mode
- Kubernetes namespaces, Deployments, labels, and resource metrics
- Kubernetes Gateway API
- Istio waypoint proxies and ztunnel
- Fortio load testing

## Sources Consulted
- Istio ambient install with istioctl: https://istio.io/latest/docs/ambient/install/istioctl/
- Istio ambient overview and ztunnel/waypoint architecture: https://istio.io/latest/docs/ambient/overview/
- Istio sidecar vs ambient dataplane modes: https://istio.io/latest/docs/overview/dataplane-modes/
- Istio add workloads to ambient mesh: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio configure waypoint proxies: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio resource labels reference: https://istio.io/latest/docs/reference/config/labels/
- Fortio usage documentation: https://fortio.github.io/fortio-website/docs/getting-started/usage

## Issues Found
- The install command used `istioctl install --set profile=ambient -y`; updated it to the official documented form `istioctl install --set profile=ambient --skip-confirmation`.
- The post configured a waypoint before the benchmark loop, which meant the script would not capture separate Ambient (L4) and Ambient (L7) results. Added instructions to run the benchmark once before waypoint enrollment for L4 results and again after waypoint enrollment for L7 results.
- The post omitted the Kubernetes Gateway API CRD prerequisite needed for waypoint proxies. Added the official CRD check/apply command.
- The expected-results table described ambient memory as per-pod overhead. Updated the wording to clarify that ambient does not add an application pod sidecar container; memory is consumed by shared ztunnel and waypoint proxies.
- The scale section said 100 services imply 100+ Envoy instances. Corrected this to 100 workload pods, because sidecars are injected per pod, not per Service object.
- Cleanup deleted the namespace before deleting the waypoint. Reordered the commands so waypoint deletion happens before namespace deletion.

## Review Notes
- The benchmark values are illustrative and correctly described as hardware- and configuration-dependent.
- The Fortio flags used in the examples are valid, including `-qps 0`, `-json`, and `-keepalive=false`.
- For more reproducible benchmarks, the Fortio image could be pinned to a specific version instead of `latest`, but this is a reproducibility improvement rather than a correctness issue.
