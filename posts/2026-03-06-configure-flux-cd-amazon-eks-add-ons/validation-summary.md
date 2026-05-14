# Validation Summary: How to Configure Flux CD with Amazon EKS Add-ons

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD HelmRelease, HelmRepository, Kustomization, and Notification APIs
- Amazon EKS add-ons
- Amazon VPC CNI
- CoreDNS
- AWS EBS CSI Driver
- AWS EFS CSI Driver
- Kubernetes StorageClass, Deployment, and DaemonSet resources
- AWS CLI for EKS add-on discovery and deletion
- Helm chart version pinning and SemVer ranges

## Sources Consulted
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease API and CRD policy documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification API documentation: https://fluxcd.io/flux/components/notification/api/
- AWS EKS add-ons documentation: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
- AWS EKS available add-ons documentation: https://docs.aws.amazon.com/eks/latest/userguide/workloads-add-ons-available-eks.html
- AWS CLI EKS describe-addon-versions command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-versions.html
- AWS CLI EKS list-addons command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/list-addons.html
- AWS CLI EKS delete-addon command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/delete-addon.html
- Amazon VPC CNI network policy configuration documentation: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy-configure.html
- Amazon VPC CNI chart repository index: https://aws.github.io/eks-charts/index.yaml
- CoreDNS Helm chart repository index: https://coredns.github.io/helm/index.yaml
- AWS EBS CSI Driver Helm chart repository index: https://kubernetes-sigs.github.io/aws-ebs-csi-driver/index.yaml
- AWS EFS CSI Driver Helm chart repository index: https://kubernetes-sigs.github.io/aws-efs-csi-driver/index.yaml

## Issues Found
- The introduction claimed the guide covered AWS-managed add-ons via ACK, but the examples only use self-managed Helm releases. Changed the claim to match the actual implementation.
- The prerequisites listed `eksctl`, but no `eksctl` workflow is used. Replaced it with the IRSA/IAM role prerequisite required by the HelmRelease examples.
- The VPC CNI example used the `ENABLE_NETWORK_POLICY` environment variable for Helm-based network policy enablement. AWS documents the Helm value as `enableNetworkPolicy=true`, and the chart wires that value into the network policy agent and ConfigMap, so the example was corrected.
- The VPC CNI example skipped CRDs while enabling network policy support. The chart ships the `PolicyEndpoint` CRD required by this feature, so the Flux CRD policy was changed to `CreateReplace` for install and upgrade.
- Several chart version examples were stale relative to the published chart repositories. Updated VPC CNI, CoreDNS, EBS CSI, and EFS CSI chart version constraints and pinning examples to current chart versions available on 2026-05-14.
- The Step 6 text said a single Kustomization ensures add-ons are installed in the correct order. Flux dependency ordering is modeled with `dependsOn` between Kustomization objects, so the wording was changed to say the example groups the sources and releases.
- The VPC CNI troubleshooting command selected pods with `app.kubernetes.io/name=aws-node`, but the AWS chart labels pods with `k8s-app=aws-node` and `app.kubernetes.io/name=aws-vpc-cni`. Updated the command to use `k8s-app=aws-node`.

## Review Notes
The examples intentionally deploy these add-ons as self-managed Helm releases. Clusters that already use EKS managed add-ons should remove or migrate those managed add-ons before adopting the corresponding Helm releases to avoid ownership conflicts.
