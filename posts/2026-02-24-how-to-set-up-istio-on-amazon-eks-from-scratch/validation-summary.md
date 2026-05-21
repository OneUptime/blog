# Validation Summary: How to Set Up Istio on Amazon EKS from Scratch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- AWS CLI
- eksctl
- Kubernetes
- Istio and istioctl
- AWS Load Balancer Controller
- Network Load Balancer
- AWS Certificate Manager
- AWS Distro for OpenTelemetry
- Prometheus and Grafana

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio download instructions: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio installation configuration profiles and EKS platform profile: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio 1.30 release and supported Kubernetes versions: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Istio application requirements and ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Bookinfo sample: https://istio.io/latest/docs/examples/bookinfo/
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS Network Load Balancer guide: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- Amazon EKS Auto Mode NLB annotations: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- Amazon EKS AWS Load Balancer Controller guide: https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html
- Amazon EKS AWS Load Balancer Controller Helm install guide: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/guide/service/annotations/
- eksctl getting started and cluster creation docs: https://eksctl.io/getting-started/

## Issues Found
- The cluster creation example used Kubernetes 1.30, which is in EKS extended support on the validation date and is outside the supported Kubernetes range for Istio 1.30. Updated the example to Kubernetes 1.33.
- The Istio download command fetched the latest release but then changed into `istio-1.24.0`, which would fail with the current release. Pinned the download and directory to Istio 1.30.0.
- The Istio install examples did not apply Istio's EKS platform profile. Added `values.global.platform=eks` to the install command and IstioOperator snippets.
- The NLB example used legacy/deprecated AWS service annotations. Updated it to the AWS Load Balancer Controller annotations `aws-load-balancer-type: external`, `aws-load-balancer-nlb-target-type: instance`, and `aws-load-balancer-attributes`.
- The prerequisites did not mention the AWS Load Balancer Controller even though the corrected NLB annotations require it. Added it to the prerequisites.
- The post installed the default ingress gateway before applying NLB annotations, but AWS warns not to add or modify the load balancer type annotation after Service creation. Added a command to delete the existing gateway Service before reinstalling it with the custom IstioOperator configuration.
- The ACM certificate ARN example used a non-12-digit AWS account ID. Updated it to a valid placeholder account ID length.
- The security group note described the Istio webhook and xDS ports imprecisely. Clarified that the EKS control plane reaches the webhook service on 443 and workloads use 15012 for xDS.
- The troubleshooting note still allowed the legacy in-tree cloud provider path for the NLB example. Updated it to focus on the AWS Load Balancer Controller.

## Review Notes
- The Bookinfo commands use Istio's classic Gateway and VirtualService sample. Current Istio docs increasingly show Gateway API examples, but the classic sample remains valid.
- The ADOT manifest URL returned HTTP 200 during validation.
