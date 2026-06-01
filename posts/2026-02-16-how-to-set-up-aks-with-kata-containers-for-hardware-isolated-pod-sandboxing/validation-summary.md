# Validation Summary: How to Set Up AKS with Kata Containers for Hardware-Isolated Pod Sandboxing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS Pod Sandboxing
- Kata Containers
- Kubernetes RuntimeClass
- Kubernetes Pods, Deployments, Jobs, Services, and Namespaces
- Azure CLI
- Cloud Hypervisor
- BuildKit buildctl

## Sources Consulted
- Microsoft Learn: Pod Sandboxing with Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/use-pod-sandboxing
- Microsoft Learn: Overview of Pod Sandboxing in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/concepts-pod-sandboxing
- Microsoft Learn: Pod Sandboxing considerations: https://learn.microsoft.com/en-us/azure/aks/considerations-pod-sandboxing
- Microsoft Learn: az aks nodepool CLI reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Kubernetes documentation: RuntimeClass: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes API documentation: Pod, Deployment, Job, Service, and Namespace resource schemas: https://kubernetes.io/docs/reference/kubernetes-api/

## Issues Found
- The post used the outdated/non-current AKS workload runtime `KataMshvVmIsolation` and RuntimeClass `kata-mshv-vm-isolation`. Updated them to `KataVmIsolation` and `kata-vm-isolation`, which match current AKS Pod Sandboxing documentation.
- The prerequisites only mentioned nested virtualization. Added the documented Azure CLI, Kubernetes version, Azure Linux, and generation 2 nested virtualization requirements.
- The VM-size check implied that listing VM sizes verified Kata support. Reworded it to say the command checks regional availability for matching example sizes.
- The existing-cluster flow added a Kata node pool but omitted the documented `az aks update` step and did not fetch kubeconfig before running `kubectl`. Added both commands.
- The Deployment and Service examples referenced the `untrusted-workloads` namespace without creating it. Added a Namespace manifest to make the example apply cleanly.
- The CI/CD example claimed Docker-in-Docker would run safely but did not configure a Docker daemon or privileged/container build setup. Reworded the claim and changed the command to a container build tool example using `buildctl`.
- The performance section claimed a fixed 128-256MB memory overhead. Replaced it with AKS-documented Pod VM memory sizing and RuntimeClass overhead behavior, including the default 512Mi Pod VM size and 600Mi runtime overhead.
- The startup timing commands measured only `kubectl run` API submission time, not readiness. Updated the commands to create pods and then time `kubectl wait --for=condition=Ready`.
- The networking section implied all networking behavior was transparent. Added the AKS-documented caveat that direct host-network access from inside the Kata VM is not supported.
- Removed the unsupported "about 100ms" VM boot claim because the AKS documentation does not make that guarantee.

## Review Notes
The post is technically relevant and now matches current AKS Pod Sandboxing terminology and setup flow. Performance figures remain workload-dependent; the corrected text avoids presenting benchmark-like numbers as guarantees.
