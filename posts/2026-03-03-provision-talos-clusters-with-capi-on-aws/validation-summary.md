# Validation Summary: How to Provision Talos Clusters with CAPI on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Cluster API (CAPI)
- Cluster API Provider AWS (CAPA)
- Cluster API Bootstrap Provider Talos (CABPT)
- Cluster API Control Plane Provider Talos (CACPPT)
- AWS (EC2, ELB, VPC, IAM)
- Kubernetes (v1.30.0)
- `clusterctl`, `clusterawsadm`, `kubectl`, `talosctl`, `kind`, `helm`
- Cilium CNI
- AWS Cloud Controller Manager

## Sources Consulted
- CAPA `clusterawsadm` reference: https://cluster-api-aws.sigs.k8s.io/clusterawsadm/clusterawsadm_bootstrap_credentials_encode-as-profile.html
- CAPA v1beta2 Go API: https://pkg.go.dev/sigs.k8s.io/cluster-api-provider-aws/v2/api/v1beta2
- CAPA CRD reference: https://cluster-api-aws.sigs.k8s.io/crd/
- CAPA prerequisites with `clusterawsadm`: https://cluster-api-aws.sigs.k8s.io/topics/using-clusterawsadm-to-fulfill-prerequisites
- CAPA bastion / EC2 access docs: https://cluster-api-aws.sigs.k8s.io/topics/accessing-ec2-instances
- Sidero `cluster-api-bootstrap-provider-talos` (CABPT): https://github.com/siderolabs/cluster-api-bootstrap-provider-talos
- Sidero `cluster-api-control-plane-provider-talos` (CACPPT): https://github.com/siderolabs/cluster-api-control-plane-provider-talos
- `TalosControlPlane` v1alpha3 CRD: https://doc.crds.dev/github.com/siderolabs/cluster-api-control-plane-provider-talos/controlplane.cluster.x-k8s.io/TalosControlPlane/v1alpha3@v0.5.10
- Amazon Time Sync Service (incl. public `time.aws.com`): https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-time-sync.html
- Google Public NTP: https://developers.google.com/time
- Sidero Labs official Talos AWS AMI account (`540036508848`): Talos Linux AWS install documentation

## Issues Found
No technical issues found.

Verifications performed:
- `clusterctl init --bootstrap talos --control-plane talos --infrastructure aws` — correct invocation.
- `clusterawsadm bootstrap credentials encode-as-profile` — correct command for `AWS_B64ENCODED_CREDENTIALS`.
- AMI owner ID `540036508848` — verified as Sidero Labs' official Talos AMI publisher account.
- API versions:
  - `cluster.x-k8s.io/v1beta1` for `Cluster` / `MachineDeployment` — current CAPI core.
  - `infrastructure.cluster.x-k8s.io/v1beta2` for `AWSCluster` / `AWSMachineTemplate` — current CAPA v2.
  - `controlplane.cluster.x-k8s.io/v1alpha3` for `TalosControlPlane` — current for CACPPT.
  - `bootstrap.cluster.x-k8s.io/v1alpha3` for `TalosConfigTemplate` — current for CABPT.
- `AWSCluster.spec.network.cni.cniIngressRules` and `spec.bastion.enabled` — valid CAPA fields.
- IAM instance profiles `control-plane.cluster-api-provider-aws.sigs.k8s.io` and `nodes.cluster-api-provider-aws.sigs.k8s.io` — standard names created by the `clusterawsadm` CloudFormation stack.
- Talos config-patch JSON paths (`/machine/time`, `/machine/kubelet/extraArgs`, `/cluster/apiServer/extraArgs`) — all valid Talos machine config locations.
- NTP servers: both `time.google.com` (Google Public NTP) and `time.aws.com` (public Amazon Time Sync) are real public NTP endpoints.
- `clusterctl get kubeconfig`, `clusterctl describe cluster`, `kubectl patch machinedeployment`, and `kubectl delete cluster` — correct CAPI lifecycle commands.

## Review Notes
- The Kubernetes version pinned (`v1.30.0`) and Talos version (`v1.7.0`) are accurate but will continue to age; readers should pick currently-supported versions when following the guide.
- `AWSCluster.spec.network.cni.cniIngressRules` is being deprecated in favor of `securityGroupOverrides` / explicit security-group definitions in newer CAPA releases — still valid today but worth watching.
- Setting `sshKeyName: ""` works to skip SSH key assignment; Talos has no SSH anyway, so an explicit value is unnecessary.
- The `MachineDeployment` `selector.matchLabels: {}` is auto-populated by CAPI controllers; explicit labels would be preferable for clarity but the empty form is accepted.
- The Helm install snippets for Cilium and the AWS cloud controller manager assume the relevant Helm repositories have already been added (`helm repo add`); a reader copy-pasting cold would need to run those first, but this is conventional for Helm install instructions.
