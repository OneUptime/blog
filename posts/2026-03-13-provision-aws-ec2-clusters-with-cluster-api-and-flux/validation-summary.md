# Validation Summary: How to Provision AWS EC2 Clusters with Cluster API and Flux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Cluster API (CAPI)
- Cluster API Provider AWS (CAPA)
- AWS EC2
- Kubernetes (v1.29.2)
- kubeadm-based control plane (KubeadmControlPlane, KubeadmConfigTemplate)
- Flux CD (Kustomize controller)
- Calico CNI (v3.27.0)
- AWS Cloud Controller Manager
- `clusterctl` CLI

## Sources Consulted
- CAPA API types (AMIReference, AWSCluster): https://github.com/kubernetes-sigs/cluster-api-provider-aws/blob/main/api/v1beta2/types.go
- CAPA AWSCluster types (controlPlaneLoadBalancer): https://github.com/kubernetes-sigs/cluster-api-provider-aws/blob/main/api/v1beta2/awscluster_types.go
- CAPA upstream cluster template: https://github.com/kubernetes-sigs/cluster-api-provider-aws/blob/main/templates/cluster-template.yaml
- CAPA documentation site: https://cluster-api-aws.sigs.k8s.io/
- Cluster API book — `clusterctl generate cluster`: https://cluster-api.sigs.k8s.io/clusterctl/commands/generate-cluster.html
- Kubernetes 1.29 cloud provider integration changes: https://kubernetes.io/blog/2023/12/14/cloud-provider-integration-changes/
- Flux Kustomize Controller v1 API: https://fluxcd.io/flux/components/kustomize/api/v1/
- Calico v3.27 manifest release tag (projectcalico/calico)
- AWS Cloud Provider Helm chart: https://kubernetes.github.io/cloud-provider-aws

## Issues Found

1. **Invalid AMI field `ami.lookupType: AnyOwner`** — The `AMIReference` type in CAPA's `infrastructure.cluster.x-k8s.io/v1beta2` only exposes `id` and `eksLookupType`. There is no `lookupType: AnyOwner` value. AMI lookup for non-EKS images is controlled by sibling fields on `AWSMachineSpec` (`imageLookupFormat`, `imageLookupOrg`, `imageLookupBaseOS`), not under `ami:`. **Fix:** removed the invalid `ami.lookupType: AnyOwner` block from the control plane `AWSMachineTemplate` and added a comment explaining how AMI auto-lookup and overrides work.

2. **Use of in-tree `cloud-provider: aws` with Kubernetes 1.29** — The in-tree AWS cloud provider was deprecated and removed; Kubernetes 1.29 requires `cloud-provider: external` and a separately deployed AWS Cloud Controller Manager. The official CAPA `cluster-template.yaml` uses `external`. **Fix:** changed every `cloud-provider: aws` occurrence (`initConfiguration.nodeRegistration.kubeletExtraArgs`, `joinConfiguration.nodeRegistration.kubeletExtraArgs` in both `KubeadmControlPlane` and `KubeadmConfigTemplate`, plus `apiServer.extraArgs` and `controllerManager.extraArgs` in `clusterConfiguration`) to `cloud-provider: external`.

3. **Missing CCM installation step** — Because the cluster is now configured with `cloud-provider: external`, the AWS Cloud Controller Manager must run inside the workload cluster, otherwise nodes will stay tainted with `node.cloudprovider.kubernetes.io/uninitialized` and load balancers / EBS provisioning won't work. **Fix:** added a `helm upgrade --install aws-cloud-controller-manager` command alongside the existing Calico installation in Step 7.

## Review Notes
- API versions used in the post (`cluster.x-k8s.io/v1beta1` for `Cluster`/`MachineDeployment`, `controlplane.cluster.x-k8s.io/v1beta1` for `KubeadmControlPlane`, `bootstrap.cluster.x-k8s.io/v1beta1` for `KubeadmConfigTemplate`, `infrastructure.cluster.x-k8s.io/v1beta2` for `AWSCluster`/`AWSMachineTemplate`) match the current CAPI v1.6/CAPA v2 schema.
- `controlPlaneLoadBalancer.loadBalancerType: nlb` is a valid enum value; supported values are `classic`, `elb`, `alb`, `nlb`, `disabled`.
- `kustomize.toolkit.fluxcd.io/v1` is the GA version for Flux Kustomization and is correct.
- `clusterctl generate cluster` flags (`--kubernetes-version`, `--control-plane-machine-count`, `--worker-machine-count`, `--infrastructure aws`) are all valid.
- The introduction's description mentions "AWS EKS/EC2-based" but the guide provisions a kubeadm-based cluster directly on EC2 (not EKS); this is a minor description wording issue, not a technical error, so it was left as-is per the "only fix technical errors" guideline.
- The `prune: false` Kustomization setting is a deliberate safety choice for cluster CRs — correct for this use case but operators should remember to delete clusters out-of-band when retiring them.
- Calico v3.27.0 is a valid release and its manifest URL resolves.
