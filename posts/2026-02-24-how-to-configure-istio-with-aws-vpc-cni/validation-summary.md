# Validation Summary: How to Configure Istio with AWS VPC CNI

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- Amazon EKS
- Amazon VPC CNI
- Kubernetes Services and DaemonSets
- AWS Load Balancer Controller
- AWS Network Load Balancer
- AWS security groups and security groups for Pods
- AWS App Mesh

## Sources Consulted
- Amazon EKS User Guide: Assign IPs to Pods with the Amazon VPC CNI - https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html
- Amazon EKS Best Practices Guide: Amazon VPC CNI - https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html
- Amazon EKS User Guide: Increase the available IP addresses for your Amazon EKS node - https://docs.aws.amazon.com/eks/latest/userguide/cni-increase-ip-addresses-procedure.html
- Amazon EKS User Guide: Assign security groups to individual Pods - https://docs.aws.amazon.com/eks/latest/userguide/security-groups-for-pods.html
- Amazon EKS User Guide: Use a security group policy for an Amazon EKS Pod - https://docs.aws.amazon.com/eks/latest/userguide/sg-pods-example-deployment.html
- Amazon EKS User Guide: View Amazon EKS security group requirements for clusters - https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html
- AWS Load Balancer Controller documentation: Service annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- AWS Load Balancer Controller documentation: Network Load Balancer - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/
- Istio documentation: Install with Istioctl - https://istio.io/latest/docs/setup/install/istioctl/
- Istio documentation: IstioOperator Options - https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio documentation: Application Requirements / Ports used by Istio - https://istio.io/latest/docs/ops/deployment/application-requirements/
- AWS App Mesh User Guide: Service Meshes - https://docs.aws.amazon.com/app-mesh/latest/userguide/meshes.html

## Issues Found
- The prerequisite command labeled "Check available IPs" only displayed node pod capacity, not available IPs. Updated the label and output column name to avoid implying that it reports free subnet IPs.
- The prefix delegation section omitted important AWS prerequisites. Added that prefix delegation requires Nitro-based instances and Amazon VPC CNI 1.9.0 or later for IPv4 clusters, and noted when kubelet `maxPods` must be updated.
- The AWS Load Balancer Controller health check protocol annotation used lowercase `"http"`. Changed it to `"HTTP"` to match the documented annotation values.
- The NLB IP target security group example allowed application traffic on port 8080 but omitted the Istio gateway readiness health check port used later in the post. Added an ingress rule example for port 15021 and clarified that these manual rules apply when backend security group rules are not being managed by the controller.
- The `SecurityGroupPolicy` example selected pods with `security.istio.io/tlsMode: istio`, which is not an application workload label users should rely on for selecting pods. Changed the example to select a normal workload label, `app: backend`.
- The App Mesh section said App Mesh and Istio should not be used simultaneously without nuance and did not mention AWS's announced App Mesh end-of-support date. Updated it to warn against injecting both sidecars into the same workloads and added the September 30, 2026 support end date.
- The App Mesh check could produce a namespace-not-found error in clusters without App Mesh. Added `--ignore-not-found` and clarified the expected result.
- The troubleshooting command labeled `PODS_USED` actually printed `.status.allocatable.pods`. Renamed it to `PODS_ALLOCATABLE`.

## Review Notes
The remaining examples are version-sensitive. Istio and AWS Load Balancer Controller annotation support can vary by installed version, and EKS Auto Mode has different networking and load balancing behavior than standard EKS node groups. The post is technically valid as a standard EKS with Amazon VPC CNI guide, but future updates should call out tested EKS, Istio, VPC CNI, and AWS Load Balancer Controller versions.
