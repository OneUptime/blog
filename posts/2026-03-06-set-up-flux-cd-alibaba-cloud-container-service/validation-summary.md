# Validation Summary: How to Set Up Flux CD on Alibaba Cloud Container Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Alibaba Cloud Container Service for Kubernetes (ACK)
- Alibaba Cloud Container Registry (ACR)
- Kubernetes
- GitOps
- GitHub
- Alibaba Cloud ALB Ingress

## Sources Consulted
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux image update automation: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository and ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagerepositories/ and https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease and HelmRepository API references: https://fluxcd.io/flux/components/helm/api/v2/ and https://fluxcd.io/flux/components/source/helmrepositories/
- Flux notification providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Alibaba Cloud ACK CreateCluster API and CLI documentation: https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/developer-reference/api-cs-2015-12-15-createcluster and https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/developer-reference/create-a-cluster-2
- Alibaba Cloud ACK kubeconfig API documentation: https://www.alibabacloud.com/help/tc/ack/ack-managed-and-ack-dedicated/developer-reference/api-query-the-kubeconfig-file-of-a-cluster
- Alibaba Cloud Container Registry API documentation: https://www.alibabacloud.com/help/en/acr/developer-reference/api-cr-2018-12-01-overview
- Alibaba Cloud ACR access credentials documentation: https://www.alibabacloud.com/help/en/acr/user-guide/configure-access-credentials
- Alibaba Cloud ALB Ingress controller and AlbConfig documentation: https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/manage-the-alb-ingress-controller-1 and https://www.alibabacloud.com/help/doc-detail/341669.html

## Issues Found
- The ACK cluster creation command used non-matching high-level CLI flags. Replaced it with the documented `aliyun cs POST /clusters` JSON body format.
- The ACK cluster example used deprecated worker-node parameters. Replaced them with a `nodepools` configuration using `scaling_group.desired_size`, `instance_types`, `vswitch_ids`, and disk settings.
- The kubeconfig command used a non-documented `GetClusterConfig` operation. Replaced it with the documented `GET /k8s/$CLUSTER_ID/user_config` API path.
- The ACR Enterprise commands omitted required parameters and used incorrect names. Added `InstanceId`, `EndpointType`, `ModuleName`, `NamespaceName`, `RepoNamespaceName`, and `RepoName`.
- The ACR registry hostname mixed Personal Edition and Enterprise Edition formats. Updated examples to use the Enterprise Edition registry domain format.
- The ACR Docker credentials incorrectly implied AccessKey ID and secret could be used directly as registry username and password. Changed the secret examples to use registry credentials or an authorization token.
- The application referenced an `imagePullSecret` that was never created in the application namespace. Added a command to create `acr-pull-secret` in `my-app`.
- The ALB ingress controller was shown as an unsupported Flux Helm chart from an implausible repository URL. Replaced it with the ACK-managed add-on flow and an `IngressClass` matching Alibaba Cloud documentation.
- The ALB Ingress example used the deprecated ingress class annotation. Updated it to `spec.ingressClassName`.
- The service was `ClusterIP` while the cluster example uses Flannel; Alibaba Cloud documentation notes ALB Ingress backends with Flannel require `NodePort` or `LoadBalancer`. Changed the service to `NodePort`.
- Flux notification resources used `notification.toolkit.fluxcd.io/v1`, while current Provider and Alert examples use `v1beta3`. Updated the API versions.
- The DingTalk example pointed Flux generic provider directly at a DingTalk robot URL, but Flux generic events do not match DingTalk robot message payloads. Changed it to a webhook relay URL that transforms Flux events into DingTalk messages.
- The examples used `jq` without listing it as a prerequisite. Added `jq` to the prerequisites.

## Review Notes
- The Kubernetes version `1.28.3-aliyun.1` is version-specific and may not be available in all regions or at future cluster creation time. Users should confirm supported ACK versions in their selected region before running the example.
- The ACR temporary authorization token path is suitable for automation only if token refresh is handled; otherwise, use configured registry credentials appropriate for the ACR instance.
