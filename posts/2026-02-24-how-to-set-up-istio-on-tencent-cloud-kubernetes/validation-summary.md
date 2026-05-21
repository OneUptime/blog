# Validation Summary: How to Set Up Istio on Tencent Cloud Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Tencent Kubernetes Engine (TKE)
- Tencent Cloud Load Balancer (CLB)
- Tencent Cloud CLI
- Kubernetes
- VPC-CNI and GlobalRouter networking
- Tencent Cloud Log Service (CLS)
- Tencent Cloud SSL Certificates

## Sources Consulted
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio installation guide and Kubernetes compatibility notes: https://istio.io/latest/docs/setup/install/
- Istio installation customization documentation: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio Tencent Cloud platform setup documentation: https://istio.io/latest/docs/setup/platform-setup/tencent-cloud-mesh/
- Tencent Cloud TKE CreateCluster API documentation: https://intl.cloud.tencent.com/document/product/457/32027
- Tencent Cloud TKE API data types documentation: https://www.tencentcloud.com/document/api/457/32022
- Tencent Cloud TKE Service Annotation documentation: https://intl.cloud.tencent.com/document/product/457/39142
- Tencent Cloud TKE LogConfig YAML documentation: https://www.tencentcloud.com/document/product/457/40951
- Tencent Cloud TKE VPC-CNI documentation: https://intl.cloud.tencent.com/ind/document/product/457/38970
- Tencent Cloud TKE Pod Security Group documentation: https://www.tencentcloud.com/ind/document/product/457/74269

## Issues Found
- The Istio install command downloaded the latest release but then changed into `istio-1.24.0`, which would fail once the latest version differs from 1.24.0. Updated the command to pin `ISTIO_VERSION=1.30.0` and changed the directory and image tags to `1.30.0`.
- The example TKE cluster version was `1.30.0`, while current Istio 1.30 documentation lists testing against Kubernetes 1.32 through 1.36. Updated the example to `1.32.0` and added a note to confirm regional TKE availability.
- The `tccli tke CreateCluster` sample omitted important CVM pass-through fields required by `RunInstancesPara`, such as placement, VPC/subnet, disk, login, and security group settings. Expanded the sample to match the documented API shape.
- The CLI sample placed `SubnetId` in `ClusterBasicSettings`, but Tencent documents that field for Cilium Overlay private CLB usage, while worker node subnet selection belongs in the CVM `VirtualPrivateCloud` pass-through configuration. Moved the subnet to `RunInstancesPara`.
- The VPC-CNI section said no IP masquerading was needed and implied security groups can always be applied directly to pods. Narrowed this to documented behavior: pods receive VPC IPs, pod-level security groups require the supported Pod security group mode, and sidecars do not consume separate pod IPs.
- The troubleshooting section claimed GlobalRouter adds an overlay that can conflict with Istio iptables rules. Tencent documents GlobalRouter as VPC global routing rather than an overlay, so this was replaced with safer checks for network mode, routing, security groups, and VPC-CNI subnet IP capacity.

## Review Notes
The Istio sample addons are suitable for demos and evaluation, but production monitoring and tracing should use managed or production-grade deployments rather than the sample manifests.
