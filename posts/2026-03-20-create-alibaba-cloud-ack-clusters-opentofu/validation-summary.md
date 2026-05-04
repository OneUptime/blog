# Validation Summary: How to Create Alibaba Cloud ACK Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Alibaba Cloud Container Service for Kubernetes (ACK)
- Alibaba Cloud Terraform provider (`aliyun/alicloud`)
- Kubernetes
- Alibaba Cloud CLI (`aliyun`)
- kubectl

## Sources Consulted
- `alicloud_cs_managed_kubernetes` resource docs: https://github.com/aliyun/terraform-provider-alicloud/blob/master/website/docs/r/cs_managed_kubernetes.html.markdown
- `alicloud_cs_kubernetes_node_pool` resource docs: https://github.com/aliyun/terraform-provider-alicloud/blob/master/website/docs/r/cs_kubernetes_node_pool.html.markdown
- DescribeClusterUserKubeconfig API reference: https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/developer-reference/api-cs-2015-12-15-describeclusteruserkubeconfig
- Alibaba Cloud ACK product documentation (cluster_spec values, RRSA, RAM Roles for Service Accounts)

## Issues Found
1. **Deprecated `name` field on `alicloud_cs_kubernetes_node_pool`**: The `name` argument was deprecated in provider version 1.219.0 in favor of `node_pool_name`. Replaced both occurrences in the worker pool and auto-scaling pool examples with `node_pool_name`.

2. **Invalid `node_name_mode = "nodeip"`**: The `node_name_mode` argument does not accept a bare string like `"nodeip"`. The documented format is `customized,<prefix>,ip,<suffix>` (a comma-separated 4-part string). Changed to `"customized,worker,ip,"` which produces names like `worker192.168.x.x`.

## Review Notes
- `cluster_spec = "ack.standard"` is a valid documented value, though Alibaba Cloud generally recommends `ack.pro.small` for new managed clusters. The post correctly demonstrates both.
- `vswitch_ids` on `alicloud_cs_managed_kubernetes` (control-plane vSwitches) requires Alibaba Cloud Terraform provider v1.241.0+. Worker vSwitches go on the node pool, which the post handles correctly.
- `enable_rrsa = true` is a one-way operation (cannot be disabled once enabled) and requires Kubernetes 1.22.3+. Not strictly an error since the example uses 1.30.1, but worth being aware of.
- `version = "1.30.1-aliyun.1"` follows the correct `<k8s>-aliyun.<n>` format; actual availability depends on ACK's current release status in the chosen region.
- `scaling_config.type = "cpu"` is valid (other accepted values: `gpu`, `gpushare`, `spot`).
- `image_type = "AliyunLinux3"`, `system_disk_category = "cloud_essd"`, and the `labels` block syntax (`{ key = ..., value = ... }`) are all correct per current provider docs.
- The `aliyun cs DescribeClusterUserKubeconfig --ClusterId <id>` command, parameter casing, and the `.config` JSON response field are all correct.
