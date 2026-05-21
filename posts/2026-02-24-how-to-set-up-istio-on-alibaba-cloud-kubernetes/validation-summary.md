# Validation Summary: How to Set Up Istio on Alibaba Cloud Kubernetes

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Istio
- Alibaba Cloud Container Service for Kubernetes (ACK)
- Kubernetes
- Alibaba Cloud CLI
- Alibaba Cloud Classic Load Balancer / Server Load Balancer annotations
- Alibaba Cloud Container Registry (ACR)
- Alibaba Cloud ARMS / ack-onepilot

## Sources Consulted
- Alibaba Cloud CLI Linux installation: https://www.alibabacloud.com/help/en/cli/install-cli-on-linux
- Alibaba Cloud ACK cluster creation with CLI: https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/developer-reference/create-a-cluster-2
- Alibaba Cloud ACK managed cluster creation API and nodepool example: https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/create-an-ack-managed-cluster-2/
- Alibaba Cloud ACK Kubernetes version support policy: https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/support-for-kubernetes-versions/
- Alibaba Cloud ACK Kubernetes 1.34 release notes: https://www.alibabacloud.com/help/doc-detail/2981208.html
- Alibaba Cloud ACK CLB Service annotations: https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/add-annotations-to-the-yaml-file-of-a-service-to-configure-clb-instances
- Alibaba Cloud ACR CreateNamespace API: https://www.alibabacloud.com/help/en/acr/developer-reference/api-cr-2018-12-01-createnamespace
- Alibaba Cloud ARMS Java Application Monitoring / ack-onepilot: https://www.alibabacloud.com/help/doc-detail/125726.html
- Istio download release documentation: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio 1.24 end-of-life announcement: https://istio.io/latest/news/support/announcing-1.24-eol-final/
- Istio 1.29 release announcement and Kubernetes support range: https://istio.io/latest/news/releases/1.29.x/announcing-1.29/

## Issues Found
- The Alibaba Cloud CLI install snippet used a less precise tar extraction command and filename than the current official Linux installation instructions. Updated it to download `aliyun-cli-linux-latest.tgz`, extract with `tar xzvf`, and move `./aliyun`.
- The ACK cluster creation command omitted the `--region` and `Content-Type` header used in Alibaba Cloud's CLI examples. Added both.
- The ACK cluster creation body used older worker-node fields and an outdated Kubernetes version. Updated it to use an ACK managed cluster profile/spec, Kubernetes `1.34.3-aliyun.1`, required add-ons, and a `nodepools` configuration.
- The Istio installation pinned `1.24.0`, which reached end of support in June 2025. Updated the guide to install Istio `1.29.2`, which is current for Kubernetes 1.31 through 1.35.
- The SLB specification text did not mention the pay-by-specification limitation. Clarified that `slb.s2.small` applies when creating a pay-by-specification CLB instance and that users can omit the spec annotation for default pay-by-usage CLB billing.
- The health check annotation used `health-check-connect-port`, which is not part of the current CLB annotation example set checked for this guide. Replaced it with `health-check-connect-timeout`.
- The container image mirror snippet pointed to an unverified Alibaba-hosted Istio mirror. Changed it to a user-owned ACR registry/namespace placeholder and kept the Istio tag aligned with the install version.
- The ACR namespace example used an incorrect REST-style `aliyun cr POST /namespace` command. Replaced it with the current `CreateNamespace` API parameters, including `InstanceId`, `NamespaceName`, and `AutoCreateRepo`.
- The ARMS installation command referenced an obsolete `arms-pilot` manifest URL. Replaced it with instructions to install the supported `ack-onepilot` add-on from the ACK console.

## Review Notes
The guide now uses supported ACK and Istio versions as of 2026-05-21. In the future, the pinned ACK Kubernetes patch version and Istio version should be refreshed together because ACK only allows creating clusters on currently supported patch versions, and Istio support is tied to Kubernetes minor versions.
