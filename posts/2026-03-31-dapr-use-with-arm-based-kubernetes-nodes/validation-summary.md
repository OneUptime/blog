# Validation Summary: How to Use Dapr with ARM-Based Kubernetes Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (v1.14.0)
- Kubernetes (EKS, AKS)
- ARM64 / Graviton3 / Azure Cobalt / Ampere Altra
- Docker buildx (multi-architecture builds)
- eksctl (EKS cluster provisioning)
- Azure CLI (AKS cluster provisioning)
- hey (HTTP load testing tool)

## Sources Consulted
- Dapr documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr container images on Docker Hub (daprio/daprd multi-arch manifests)
- eksctl documentation: https://eksctl.io/usage/creating-and-managing-clusters/
- Azure CLI `az aks create` reference: https://learn.microsoft.com/en-us/cli/azure/aks
- Docker buildx documentation: https://docs.docker.com/build/building/multi-platform/
- Kubernetes well-known labels: https://kubernetes.io/docs/reference/labels-annotations-taints/#kubernetes-io-arch
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr State Management API: https://docs.dapr.io/reference/api/state_api/

## Issues Found
1. **Broken bash line continuation in eksctl command (line 34)**: The `eksctl create cluster` command had an inline comment after a backslash line continuation: `--node-type m7g.xlarge \   # Graviton3`. In bash, `\` must be the very last character before the newline to act as a line continuation. The trailing spaces and `# Graviton3` comment caused the continuation to fail, which would break the command when copied and run. **Fix**: Removed the inline comment, leaving just the backslash continuation. The Graviton3 context is already provided by the preceding comment line.

## Review Notes
- The `m7g.xlarge` instance type is correctly identified as a Graviton3 instance.
- The Azure VM size `Standard_D4plds_v5` is an ARM-based (Cobalt/Ampere) VM, which is correct for the use case.
- Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) and the `kubernetes.io/arch` node selector label are all correct.
- The Dapr state API endpoint `http://localhost:3500/v1.0/state/statestore` is correct for the Dapr sidecar's default HTTP port and state management API path.
- The `docker manifest inspect` command is the correct way to verify multi-arch image support.
- The post references Dapr v1.14.0, which is a valid release. Readers should check for newer versions as the Dapr project continues active development.
