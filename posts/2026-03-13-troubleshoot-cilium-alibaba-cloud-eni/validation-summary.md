# Validation Summary: Troubleshoot Cilium on Alibaba Cloud ENI

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Alibaba Cloud ECS
- Alibaba Cloud ENI
- Alibaba Cloud RAM
- Alibaba Cloud CLI
- eBPF networking

## Sources Consulted
- Cilium AlibabaCloud ENI installation documentation: https://docs.cilium.io/en/latest/installation/alibabacloud-eni/
- Cilium operator AlibabaCloud command reference: https://docs.cilium.io/en/stable/cmdref/cilium-operator-alibabacloud/
- CiliumNode API reference: https://manifests.fyi/cilium.io/v2/CiliumNode/
- Alibaba Cloud ECS DescribeNetworkInterfaces API documentation: https://help.aliyun.com/zh/ecs/api-describenetworkinterfaces
- Alibaba Cloud ECS DescribeInstanceRamRole API documentation: https://help.aliyun.com/zh/ecs/developer-reference/api-ecs-2014-05-26-describeinstanceramrole
- Alibaba Cloud ECS general-purpose instance family documentation: https://www.alibabacloud.com/help/en/ecs/user-guide/general-purpose-instance-families
- Alibaba Cloud ECS compute-optimized instance family documentation: https://www.alibabacloud.com/help/en/ecs/user-guide/compute-optimized-instance-families

## Issues Found
- The CiliumNode ENI status command searched for `eni:`, which is the AWS ENI status field. Updated it to search for `alibaba-cloud:`, the AlibabaCloud-specific CiliumNode status field.
- The RAM credential check used `DescribeInstanceAttribute` and queried `.RamRoleName`, but the ECS API for checking attached instance RAM roles is `DescribeInstanceRamRole`. Updated the command and `jq` path accordingly.
- The permissions list was incomplete for Cilium AlibabaCloud ENI. Added the missing ECS and VPC permissions documented by Cilium.
- The wording implied only ECS instance RAM roles were used. Updated the text to refer to the Alibaba Cloud credentials used by Cilium, while keeping an optional instance RAM role check.
- Clarified the best-practice note about missing RAM permissions so it refers to authorization errors rather than silent failure.

## Review Notes
The post is technically relevant and command-focused. The instance-limit examples for `ecs.c6.large` and `ecs.g6.4xlarge` match Alibaba Cloud instance family documentation as of this review.
