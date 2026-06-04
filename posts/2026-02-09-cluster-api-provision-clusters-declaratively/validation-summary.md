# Validation Summary: How to Set Up Cluster API (CAPI) to Provision Kubernetes Clusters Declaratively

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Cluster API
- clusterctl
- Cluster API Provider Docker
- Cluster API Provider AWS
- kind
- kubeadm bootstrap and control plane providers
- Calico CNI
- AWS cloud-controller-manager
- Flux GitOps

## Sources Consulted
- Cluster API Quick Start: https://cluster-api.sigs.k8s.io/user/quick-start
- Cluster API clusterctl generate cluster command: https://cluster-api.sigs.k8s.io/clusterctl/commands/generate-cluster
- Cluster API clusterctl get kubeconfig command: https://cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Cluster API clusterctl describe cluster command: https://cluster-api.sigs.k8s.io/clusterctl/commands/describe-cluster
- Cluster API version support: https://cluster-api.sigs.k8s.io/reference/versions
- Cluster API Provider AWS Quick Start: https://cluster-api-aws.sigs.k8s.io/quick-start
- clusterawsadm credentials command: https://cluster-api-aws.sigs.k8s.io/clusterawsadm/clusterawsadm_bootstrap_credentials_encode-as-profile
- kind installation docs and releases: https://github.com/kubernetes-sigs/kind
- Calico installation docs: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- AWS cloud-provider getting started: https://kubernetes.github.io/cloud-provider-aws/getting_started/
- Flux GitRepository docs: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post claimed to download the latest `clusterctl` but pinned old CAPI v1.6.0. Updated the command to v1.13.2 and aligned example Kubernetes versions to the supported v1.34 to v1.35 window.
- The kind setup omitted the Docker socket mount required by the Docker infrastructure provider. Added a kind config with `/var/run/docker.sock` mounted into the management cluster.
- Docker provider initialization omitted the `CLUSTER_TOPOLOGY=true` feature gate required by current Docker quick-start templates. Added the environment variable before `clusterctl init --infrastructure docker`.
- The AWS credentials example incorrectly used `clusterctl init --list-images` to create `AWS_B64ENCODED_CREDENTIALS`. Replaced it with `clusterawsadm bootstrap iam create-cloudformation-stack` and `clusterawsadm bootstrap credentials encode-as-profile`.
- The `clusterctl generate cluster --list-variables docker` example had the arguments in the wrong shape. Updated it to include a cluster name and `--infrastructure docker`.
- The Docker cluster generation example needed the Docker provider development flavor. Added `--flavor development`.
- The readiness wait used `ControlPlaneReady`, which can block before CNI installation. Replaced it with `ControlPlaneInitialized`.
- The custom Cluster API YAML used deprecated v1beta1 resources and old reference fields. Updated the manifest to v1beta2-style API versions, references, and kubeadm extraArgs list syntax.
- The Calico manifest version was outdated. Updated it to v3.32.0.
- The AWS cloud-controller-manager example applied only the DaemonSet manifest and omitted the required RBAC manifest. Added the RBAC apply command.
- The Flux GitRepository example used invalid `spec.branch`. Changed it to `spec.ref.branch`.

## Review Notes
The Docker provider remains suitable for local development and testing only, not production use. Provider-specific production templates should normally be generated from the relevant provider documentation rather than hand-maintained from a generic Docker example.
