# Validation Summary: How to Compare Istio vs AWS App Mesh for Your Use Case

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Istio
- AWS App Mesh
- Envoy
- Kubernetes
- Amazon EKS
- Amazon ECS
- Amazon EC2
- AWS Fargate
- AWS Cloud Map
- AWS Certificate Manager and AWS Private CA
- AWS CloudFormation
- AWS CloudWatch
- AWS X-Ray

## Sources Consulted
- AWS App Mesh end-of-support announcement: https://aws.amazon.com/blogs/containers/migrating-from-aws-app-mesh-to-amazon-ecs-service-connect/
- AWS App Mesh User Guide, getting started and supported platforms: https://docs.aws.amazon.com/app-mesh/latest/userguide/getting-started.html
- AWS App Mesh Envoy documentation: https://docs.aws.amazon.com/app-mesh/latest/userguide/envoy.html
- AWS App Mesh TLS documentation: https://docs.aws.amazon.com/app-mesh/latest/userguide/tls.html
- AWS App Mesh routes documentation: https://docs.aws.amazon.com/app-mesh/latest/userguide/routes.html
- AWS App Mesh virtual nodes and outlier detection documentation: https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_nodes.html
- AWS App Mesh Kubernetes getting started documentation: https://docs.aws.amazon.com/app-mesh/latest/userguide/getting-started-kubernetes.html
- AWS App Mesh Controller for Kubernetes API reference: https://aws.github.io/aws-app-mesh-controller-for-k8s/reference/api_spec/
- AWS CloudFormation App Mesh mesh egress filter reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-appmesh-mesh-egressfilter.html
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio virtual machine architecture documentation: https://istio.io/latest/docs/ops/deployment/vm-architecture/

## Issues Found
- The post presented App Mesh as a normal current choice for new AWS service mesh deployments. AWS has announced that App Mesh will be discontinued on September 30, 2026, and that new customers have been unable to onboard since September 24, 2024. Updated the introduction, managed-service discussion, App Mesh recommendation section, AWS integration caveat, and summary to make App Mesh a legacy or migration comparison point rather than a greenfield recommendation.
- The post said the actual proxy handling traffic is the same and that raw data plane performance is essentially identical. Both products use Envoy, but exact builds, versions, generated configuration, workload shape, and resource limits affect performance. Updated the wording to "broadly the same" and "broadly comparable."
- The post said App Mesh integrates with AWS Certificate Manager for certificate management. App Mesh TLS documentation specifically describes private certificates in ACM issued by AWS Private Certificate Authority for this integration. Updated the wording to mention AWS Private CA-backed ACM certificates.

## Review Notes
The Istio VirtualService example, App Mesh VirtualRouter example, AWS CLI `create-virtual-node` command shape, and CloudFormation `AWS::AppMesh::Mesh` egress filter snippet are consistent with the official documentation. Istio also supports virtual machine workloads, so "Kubernetes-first" is more accurate than "Kubernetes-only" in the summary.
