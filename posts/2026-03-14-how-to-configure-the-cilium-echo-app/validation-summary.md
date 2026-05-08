# Validation Summary: Configuring the Cilium Echo App for Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Cilium CLI
- CiliumNetworkPolicy
- Kubernetes Deployments and Services
- Kubernetes Network Policy testing
- HTTP L7 policy enforcement
- Hubble/flow observation

## Sources Consulted
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium stable troubleshooting documentation for connectivity-check manifests: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Layer 7 policy documentation for HTTP policy fields and regex matching: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium Layer 7 protocol visibility documentation for L7 proxy requirements: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Envoy proxy documentation for L7 policy enforcement behavior: https://docs.cilium.io/en/stable/security/network/proxy/envoy/

## Issues Found
- The command `cilium connectivity test --deploy-only` is not listed in the current official Cilium CLI command reference. Changed it to `cilium connectivity test` and clarified that the command deploys its own test workloads.
- The connectivity-check manifest URL used the moving `main` branch. Changed it to the stable documented `1.19.3` path to avoid drift from future changes.
- The introduction claimed the example app provides HTTP and gRPC endpoints, but the manual example uses `quay.io/cilium/json-mock`, which is an HTTP JSON mock server. Updated the wording to refer only to the HTTP endpoints used in the post.
- The manual `json-mock` deployment did not set the `PORT` environment variable shown in Cilium's connectivity-check manifests. Added `PORT=8080` to match the container's expected configuration in the official manifest.
- The post described the echo app as "the recommended way" to test Cilium features. Softened this to "a practical way" because the official documentation recommends/runs Cilium connectivity tests rather than making that exact broad recommendation for this standalone app.
- The troubleshooting note said to ensure "Envoy proxy is enabled." Updated it to "L7 proxy support is enabled" to align with Cilium documentation, where L7 functionality uses Envoy and depends on L7 proxy support.

## Review Notes
The CiliumNetworkPolicy syntax, Kubernetes Deployment and Service snippets, and HTTP method/path matching examples are consistent with the official Cilium L7 policy documentation. The denied POST example may return an HTTP denial response rather than simply timing out, depending on the installed Cilium/L7 proxy behavior.
