# Validation Summary: How to Use ArgoCD with AWS Fargate Profiles

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS EKS
- AWS Fargate profiles
- Argo CD
- Argo CD Helm chart
- Kubernetes Deployments, Services, Ingresses, PersistentVolumes, and PersistentVolumeClaims
- AWS Load Balancer Controller / ALB
- CoreDNS
- Amazon EFS CSI driver
- CloudWatch Container Insights
- AWS Distro for OpenTelemetry

## Sources Consulted
- Amazon EKS Fargate profile documentation: https://docs.aws.amazon.com/eks/latest/userguide/fargate-profile.html
- Amazon EKS Fargate pod configuration details: https://docs.aws.amazon.com/eks/latest/userguide/fargate-pod-configuration.html
- Amazon EKS Fargate considerations: https://docs.aws.amazon.com/eks/latest/userguide/fargate.html
- AWS CLI `eks create-fargate-profile` reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-fargate-profile.html
- Amazon EKS CoreDNS on Fargate guidance: https://docs.aws.amazon.com/eks/latest/userguide/fargate-getting-started.html
- AWS Load Balancer Controller Ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- Argo CD ALB ingress documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD Helm chart values and HA notes: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Amazon EKS EFS CSI documentation: https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html
- CloudWatch Container Insights / ADOT for EKS Fargate: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-EKS-otel.html
- AWS Distro for OpenTelemetry EKS Fargate Container Insights guide: https://aws-otel.github.io/docs/getting-started/container-insights/eks-fargate/

## Issues Found
- The post stated a maximum Fargate pod size of 4 vCPU and 30 GB memory. AWS now documents valid combinations up to 16 vCPU and 120 GB memory, so the limit was updated.
- Several Fargate examples used CPU and memory requests that differed from limits. AWS documents EKS Fargate pods as guaranteed QoS, with requested CPU and memory equal to limits, so the examples were corrected.
- The Helm values pinned Argo CD to `v2.10.0`, which is outdated. The explicit old image tag was removed so the chart can use its supported default application version.
- The Redis HA comments incorrectly implied DaemonSet/EBS requirements. The wording was changed to describe the practical Fargate recommendation without making that inaccurate claim.
- The ALB gRPC example used an action annotation that was not referenced through a `use-annotation` backend and pointed to an invalid Argo CD service port. It was replaced with a separate gRPC service and condition-based Ingress routing consistent with Argo CD and AWS Load Balancer Controller documentation.
- The EFS example used dynamic provisioning through a StorageClass. AWS documents that Fargate nodes cannot use dynamic persistent volume provisioning, so the example was changed to a statically provisioned EFS PersistentVolume and matching PVC.
- The application and sidecar examples said resources are required and used unequal requests/limits. The text now says to set resources explicitly, and the requests/limits match.
- The CloudWatch monitoring section used the Amazon CloudWatch Observability add-on for Fargate. AWS documents ADOT as the required path for EKS Fargate Container Insights, so the command was changed to the ADOT EKS Fargate manifest.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. Production users should still review current Argo CD chart release notes, AWS Load Balancer Controller version-specific behavior, and IAM prerequisites before applying the examples in a live cluster.
