# Validation Summary: How to Create Alibaba Cloud SLB Load Balancers with OpenTofu

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- OpenTofu / Terraform
- Alibaba Cloud SLB (Server Load Balancer, classic)
- Alibaba Cloud ECS / VPC (referenced via `alicloud_instance` and `alicloud_vswitch`)
- HCL (HashiCorp Configuration Language)
- The `aliyun/alicloud` provider resources: `alicloud_slb_load_balancer`, `alicloud_slb_listener`, `alicloud_slb_server_group`, `alicloud_slb_server_group_server_attachment`, `alicloud_slb_server_certificate`

## Sources Consulted
- alicloud_slb_load_balancer resource docs: https://github.com/aliyun/terraform-provider-alicloud/blob/master/website/docs/r/slb_load_balancer.html.markdown
- alicloud_slb_listener resource docs: https://github.com/aliyun/terraform-provider-alicloud/blob/master/website/docs/r/slb_listener.html.markdown
- alicloud_slb_server_group resource docs: https://github.com/aliyun/terraform-provider-alicloud/blob/master/website/docs/r/slb_server_group.html.markdown
- alicloud_slb_server_group_server_attachment resource docs: https://github.com/aliyun/terraform-provider-alicloud/blob/master/website/docs/r/slb_server_group_server_attachment.html.markdown
- alicloud_slb_server_certificate resource docs: https://github.com/aliyun/terraform-provider-alicloud/blob/master/website/docs/r/slb_server_certificate.html.markdown
- Terraform Registry (aliyun/alicloud provider): https://registry.terraform.io/providers/aliyun/alicloud/latest/docs

## Issues Found
- **`health_check_type` used on HTTP and HTTPS listeners.** Per the `alicloud_slb_listener` documentation, `health_check_type` is only valid for TCP listeners (where it selects `tcp` vs. `http` style checks). For HTTP/HTTPS listeners the health check type is implicitly HTTP, and only `health_check = "on" | "off"` toggles the feature. Including `health_check_type` on HTTP/HTTPS listeners is rejected by the API. **Fix:** removed the `health_check_type = "http"` line from both the HTTP listener block and the HTTPS listener block.

## Review Notes
- All other resource and argument names verified against the official aliyun/alicloud provider docs: `load_balancer_name`, `load_balancer_spec` (`slb.s2.small` is a valid performance-guaranteed spec), `address_type` (`internet`/`intranet`), `vswitch_id`, `payment_type` (`PayAsYouGo`), and `tags` are all correct on `alicloud_slb_load_balancer`.
- `alicloud_slb_server_group` correctly uses `name` (not `server_group_name`); `alicloud_slb_server_certificate` likewise uses `name`. These are the canonical attribute names in the SLB (classic) resources.
- `alicloud_slb_server_group_server_attachment` arguments (`server_group_id`, `server_id`, `port`, `weight`) are valid; the resource also accepts optional `type` and `description`, but omitting them is fine.
- For HTTPS listeners, `server_certificate_id` and `tls_cipher_policy` (e.g., `tls_cipher_policy_1_2`) are valid arguments.
- `bandwidth = -1` (unmetered) is appropriate for PayAsYouGo as noted in the post.
- `health_check_http_code = "http_2xx,http_3xx"` uses the documented comma-separated format.
- Caveat for future readers: Alibaba Cloud's classic SLB has been largely superseded by ALB (Application Load Balancer) and NLB (Network Load Balancer) for new deployments. The `alicloud_slb_*` resources still target classic SLB (CLB); newer workloads should consider `alicloud_alb_*` / `alicloud_nlb_*` resources. This is a future-direction note, not a correctness issue with the post.
