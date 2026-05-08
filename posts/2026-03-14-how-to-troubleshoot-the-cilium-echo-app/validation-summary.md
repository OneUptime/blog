# Validation Summary: Troubleshooting the Cilium Echo App

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- Helm
- Hubble
- CiliumNetworkPolicy
- Cilium connectivity tests

## Sources Consulted
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Envoy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium connectivity-check manifest: https://raw.githubusercontent.com/cilium/cilium/1.19.3/examples/kubernetes/connectivity-check/connectivity-check.yaml
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post used `app=echo-server` as the pod selector, but Cilium's documented connectivity-check manifest labels echo pods with `name=echo-a` and `name=echo-b`. Changed the selector to `name=echo-a`.
- The image pull test claimed to check access to `quay.io` but used the Docker Hub `busybox` image. Changed it to pull `quay.io/cilium/alpine-curl:v1.10.0`.
- The service endpoint check used the deprecated Endpoints API. Changed the command to inspect EndpointSlices with the standard `kubernetes.io/service-name=echo-a` label.
- The connectivity examples referenced `deploy/echo-client` and `echo-server`, which do not match Cilium's documented connectivity-check workload names. Changed them to use `deploy/pod-to-a` and the `echo-a` service.
- The direct pod IP example used the same incorrect `echo-server` selector and root path. Changed it to select `name=echo-a` and request `/public`, matching the connectivity-check probes.
- The verification curl referenced `echo-server`. Changed it to request `http://echo-a:8080/public` from `deploy/pod-to-a`.
- The troubleshooting note referred to a service with no endpoints. Updated it to refer to EndpointSlices.

## Review Notes
The L7 proxy Helm value `l7Proxy=true` is still valid and defaults to true in current Cilium Helm values. `cilium connectivity test` is valid, but current Cilium CLI versions create test namespaces with a numeric suffix when using the CLI-managed test suite; the post otherwise focuses on the separately deployed `cilium-test` connectivity-check manifest.
