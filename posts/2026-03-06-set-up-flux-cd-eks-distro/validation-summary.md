# Validation Summary: How to Set Up Flux CD on EKS Distro (EKS-D)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS Distro (EKS-D)
- kOps
- Kubernetes
- Flux CD
- Flux image automation
- Amazon EBS CSI Driver
- AWS Load Balancer Controller
- Amazon ECR
- Amazon CloudWatch
- AWS CLI and IAM

## Sources Consulted
- EKS-D documentation: https://distro.eks.amazonaws.com/
- EKS-D kOps install documentation: https://distro.eks.amazonaws.com/users/install/kops/
- EKS-D v1.30 release manifest: https://distro.eks.amazonaws.com/kubernetes-1-30/kubernetes-1-30-eks-12.yaml
- kOps create cluster documentation: https://kops.sigs.k8s.io/cli/kops_create_cluster/
- kOps update cluster documentation: https://kops.sigs.k8s.io/cli/kops_update_cluster/
- kOps export kubeconfig documentation: https://kops.sigs.k8s.io/cli/kops_export_kubeconfig/
- Flux bootstrap documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux check documentation: https://fluxcd.io/flux/cmd/flux_check/
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- AWS Load Balancer Controller NLB documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/
- Amazon EKS AWS Load Balancer Controller Helm documentation: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Amazon EKS EBS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- AWS EKS Helm charts repository: https://github.com/aws/eks-charts
- Amazon CloudWatch Container Insights documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html

## Issues Found
- The kOps cluster creation example used an EKS-D release manifest URL as `--kubernetes-version`. EKS-D's kOps documentation uses the official EKS-D kOps scripts to generate a kOps configuration with EKS-D artifacts and images. Updated the section to use `eks-distro/development/kops` scripts and the `RELEASE_BRANCH`/`RELEASE` variables.
- The cluster environment variable used only `NAME`; EKS-D's kOps scripts require `KOPS_CLUSTER_NAME`. Added `KOPS_CLUSTER_NAME` and kept `NAME` as an alias for consistency.
- The sample EKS-D generated values used a generic release manifest URL instead of the artifact URL and image tags generated for the pinned release. Updated the example to the v1.30.3 artifacts and pause image tag from EKS-D `kubernetes-1-30-eks-12`.
- The Flux bootstrap command enabled image automation but did not request a write-capable deploy key. Added `--read-write-key`.
- The AWS integration text implied EKS-D automatically had the same AWS integrations as EKS. Clarified that these integrations require the cluster to run on AWS and have controller IAM permissions configured.
- The EBS CSI and AWS Load Balancer Controller Helm examples lacked IAM role annotations for the controller service accounts. Added service account annotations with placeholder role ARNs.
- The Service example used `service.beta.kubernetes.io/aws-load-balancer-type: nlb` while saying it used AWS Load Balancer Controller. Updated it to `external` and added `aws-load-balancer-nlb-target-type: instance`, which routes the Service to AWS Load Balancer Controller for current NLB deployments.
- The deployment image was `nginx`, while the ECR image automation resources targeted an `eksd-app` ECR repository. Updated the image to the ECR example and added the Flux image policy marker required for automation.
- The ImageUpdateAutomation example used `strategy: Setters`, which is no longer shown in the current v1 API examples, and it lacked a valid image marker target. Removed the explicit strategy and added the marker to the Deployment.
- The image automation commit message template referenced `{{.NewValue}}`, which is not part of the current Flux ImageUpdateAutomation template data. Replaced it with a static valid message.
- The troubleshooting commands used `flux get image repository` and `flux get image policy`; current Flux CLI documentation uses `flux get images repository` and `flux get images policy`. Updated both commands.

## Review Notes
- The AWS IAM examples still use broad managed policies and placeholder IAM role ARNs. They are technically illustrative, but production readers should replace them with least-privilege policies and real trust relationships for the chosen kOps/EKS-D authentication model.
