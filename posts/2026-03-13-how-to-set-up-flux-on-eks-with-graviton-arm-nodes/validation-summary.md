# Validation Summary: How to Set Up Flux on EKS with Graviton ARM Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- AWS Graviton / ARM64 nodes
- eksctl
- Kubernetes scheduling, node labels, affinity, and topology spread constraints
- Flux GitOps bootstrap
- Flux image automation APIs
- Flux HelmRelease APIs
- kube-prometheus-stack
- Docker multi-architecture image manifests
- Git

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS platform versions: https://docs.aws.amazon.com/eks/latest/userguide/platform-versions.html
- eksctl ARM support: https://docs.aws.amazon.com/eks/latest/eksctl/arm-support.html
- eksctl managed node groups: https://docs.aws.amazon.com/eks/latest/eksctl/nodegroup-managed.html
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux `flux bootstrap github` command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Kubernetes well-known labels: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes node labels populated by kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes node affinity documentation: https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/
- Kubernetes pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Docker manifest inspect reference: https://docs.docker.com/reference/cli/docker/manifest/inspect/

## Issues Found
- The EKS cluster example used Kubernetes `1.29`, which is no longer listed as available in the current EKS standard or extended support versions. Updated the cluster config to `1.34`, which is available in EKS standard support and is compatible with current Flux Kubernetes support guidance.
- The prerequisite specified `eksctl` version `0.170 or later`, which is stale for a guide using current EKS versions. Updated it to recommend the latest `eksctl` version.
- The GitHub token prerequisite only mentioned repo permissions. Flux GitHub bootstrap requires sufficient administrative access to create or configure the target repository, so the prerequisite now calls out admin access to the target repository or organization.
- The Flux bootstrap command later used Flux image automation CRDs, but Flux image automation controllers are not installed by default. Added `--components-extra=image-reflector-controller,image-automation-controller` and `--read-write-key` to the bootstrap command.
- The post stated that Flux controllers "will run" on ARM64 nodes in a mixed-architecture cluster. Multi-arch images make this possible, but Kubernetes may schedule the controllers on ARM64 or amd64 nodes unless constraints are added. Updated the wording to reflect scheduler behavior accurately.
- The Step 7 heading said Flux Image Automation builds multi-architecture images. Flux image automation tracks image tags and can update Git manifests; it does not build images. Updated the heading and intro sentence accordingly.

## Review Notes
The Kubernetes affinity, topology spread, ImageRepository, ImagePolicy, HelmRelease, `kubectl`, `eksctl create cluster`, and `flux bootstrap github` examples are syntactically consistent with the referenced official documentation after the edits. The kube-prometheus-stack HelmRelease assumes the referenced `HelmRepository` and `monitoring` namespace are created elsewhere in the GitOps repository.
