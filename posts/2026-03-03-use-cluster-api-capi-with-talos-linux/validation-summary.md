# Validation Summary: How to Use Cluster API (CAPI) with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cluster API (CAPI)
- clusterctl
- Cluster API Provider AWS (CAPA)
- clusterawsadm
- Talos Linux
- CAPI Bootstrap Provider Talos (CABPT)
- CAPI Control Plane Provider Talos (CACPPT)
- Kubernetes
- kubectl
- Flux CD Kustomization
- Cilium-related Talos configuration

## Sources Consulted
- Cluster API `clusterctl init` documentation: https://cluster-api.sigs.k8s.io/clusterctl/commands/init.html
- Cluster API `clusterctl describe cluster` documentation: https://cluster-api.sigs.k8s.io/clusterctl/commands/describe-cluster.html
- Cluster API version support documentation: https://cluster-api.sigs.k8s.io/reference/versions.html
- Cluster API Provider AWS `clusterawsadm bootstrap iam create-cloudformation-stack` documentation: https://cluster-api-aws.sigs.k8s.io/clusterawsadm/clusterawsadm_bootstrap_iam_create-cloudformation-stack
- Cluster API Provider AWS CRD reference: https://cluster-api-aws.sigs.k8s.io/crd/
- Talos CAPI bootstrap provider README: https://github.com/siderolabs/cluster-api-bootstrap-provider-talos
- Talos CAPI control plane provider README: https://github.com/siderolabs/cluster-api-control-plane-provider-talos
- Talos Linux support matrix: https://www.talos.dev/latest/introduction/support-matrix/
- Talos Linux Cilium deployment guide: https://www.talos.dev/latest/kubernetes-guides/network/deploying-cilium/
- Talos Linux machine configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Homebrew `clusterctl` formula: https://formulae.brew.sh/formula/clusterctl
- Homebrew `clusterawsadm` formula: https://formulae.brew.sh/formula/clusterawsadm
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The prerequisites and installation step omitted `clusterawsadm`, but the AWS initialization commands use it and CAPA requires it for IAM bootstrapping. Added `clusterawsadm` to the prerequisites and install commands.
- The AWS setup sequence encoded credentials but did not create the CAPA IAM CloudFormation stack. Added `clusterawsadm bootstrap iam create-cloudformation-stack` before `AWS_B64ENCODED_CREDENTIALS`.
- The provider verification command `clusterctl describe --showspec` is not the right command for provider inventory. Replaced it with `kubectl get providers.clusterctl.cluster.x-k8s.io -A`.
- The Talos examples used Talos `v1.6` and Kubernetes `v1.29`, which are stale for a new 2026 guide. Updated the examples to Talos `v1.11` and Kubernetes `v1.34`, which match the consulted Talos support matrix.
- The Cilium-oriented Talos config disabled kube-proxy but left the default Talos CNI enabled. Added `cluster.network.cni.name: none` patches for both control plane and worker configuration.
- The worker configuration did not disable kube-proxy even though the control plane did. Added the same `cluster.proxy.disabled: true` patch to worker configuration for consistency.
- The upgrade command block was marked as YAML even though it contains shell commands. Changed the fence to `bash`.
- The upgrade section claimed to upgrade both Kubernetes and Talos but only patched the control plane. Added worker `MachineDeployment` and `TalosConfigTemplate` patches and preserved the full Talos patch list so merge-patching `configPatches` does not drop required CNI/proxy/node label settings.

## Review Notes
- The core CAPI examples still use `cluster.x-k8s.io/v1beta1` because the Talos control plane provider documentation continues to describe v1beta1 CAPI compatibility. CAPI v1beta2 is available and v1beta1 contract compatibility is temporary, so a future update should revisit these manifests once the Talos provider documentation and examples move fully to v1beta2.
- The AWS AMI IDs remain placeholders. Users must choose Talos AMIs for their AWS region and update AMI references when rolling Talos versions.
