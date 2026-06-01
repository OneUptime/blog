# Validation Summary: How to Set Up AKS with WebAssembly Workloads Using Spin and WASI Node Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS WASI node pools
- WebAssembly (WASM)
- WebAssembly System Interface (WASI)
- Spin
- Rust
- Kubernetes Deployments, Services, Ingress, and RuntimeClass
- Azure Container Registry (ACR)
- Azure CLI

## Sources Consulted
- Microsoft Azure documentation: Create WebAssembly System Interface (WASI) node pools in Azure Kubernetes Service (AKS) to run your WebAssembly workload, https://docs.azure.cn/en-us/aks/use-wasi-node-pools
- Microsoft Learn: Deploy SpinKube to Azure Kubernetes Service (AKS) to run serverless WebAssembly workloads, https://learn.microsoft.com/en-us/azure/aks/deploy-spinkube
- Microsoft Learn REST API reference for AKS agent pool `workloadRuntime`, https://learn.microsoft.com/en-us/rest/api/aks/agent-pools/create-or-update
- Microsoft Learn: Azure Container Registry authentication options, https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Microsoft Learn: Azure Container Registry quickstart with Azure CLI, https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-azure-cli
- Microsoft Learn: Authenticate with Azure Container Registry from Azure Kubernetes Service, https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration
- Spin documentation: Rust components and HTTP handlers, https://spinframework.dev/v2/rust-components
- Spin documentation: Spin plugins and `spin plugins install kube`, https://spinframework.dev/v3/plugin-authoring
- SpinKube documentation: `spin kube scaffold` and SpinApp deployment, https://www.spinkube.dev/docs/reference/cli-reference/
- Rust documentation: `wasm32-wasip1` platform support, https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- Rust Blog: Changes to Rust's WASI targets, https://blog.rust-lang.org/2024/04/09/updates-to-rusts-wasi-targets/
- Kubernetes documentation: RuntimeClass, https://kubernetes.io/docs/concepts/containers/runtime-class/

## Issues Found
- The post used `wasmtime-spin-v2` for AKS WASI node pool labels and runtime class names. Microsoft WASI node pool documentation shows AKS-provided WASI node pool labels and RuntimeClass examples using `wasmtime-spin-v1`, so the node selector, `runtimeClassName`, and verification command were updated.
- The post omitted creation of the Kubernetes `RuntimeClass` required by the AKS WASI node pool workflow. Added a minimal `wasmtime-spin-v1` RuntimeClass manifest and `kubectl apply` command.
- The Rust build target used `wasm32-wasi`, which has been renamed to `wasm32-wasip1` in current Rust toolchains. Updated the prerequisite, added `rustup target add wasm32-wasip1`, and changed the Spin manifest source path and build command.
- The ACR publishing step used only `az acr login`, which authenticates Docker-oriented workflows and may not authenticate the Spin CLI. Updated the example to use `az acr login --expose-token` with `spin registry login`, and added `az aks update --attach-acr` so AKS can pull the artifact.
- The ACR placeholder used mixed case (`myRegistry`) even though Azure Container Registry names must be lowercase alphanumeric. Updated the registry-name placeholder to `myregistry`.
- The performance claims were too absolute: "sub-millisecond cold starts", "10-100x less memory", scale-from-zero being nearly instantaneous, and fixed memory ranges. Reworded these to accurate, less absolute claims consistent with official Spin and AKS guidance.
- The statement that Spin is "the most popular" way to build WASM workloads for Kubernetes was not verifiable from official documentation. Reworded it to "a common way".
- The container comparison said to use containers for any application needing filesystem access. Updated this to "broad host filesystem access" because WASI and runtimes can provide capability-scoped filesystem access.

## Review Notes
The Azure WASI node pool feature remains preview-oriented and version-sensitive. For newer production-style Spin-on-Kubernetes workflows, SpinKube and the Spin Operator are the current documented path, while AKS WASI node pool examples still use the lower-level RuntimeClass and containerd shim workflow.
