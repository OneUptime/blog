# Validation Summary: How to Create Linode NodeBalancers with OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Linode (Akamai Cloud) Terraform provider (`linode/linode`)
- Linode NodeBalancers (managed load balancers)
- Linode Compute Instances
- Health checks (HTTP, TCP connection)

## Sources Consulted
- Linode Terraform provider — `linode_nodebalancer` resource: https://github.com/linode/terraform-provider-linode/blob/main/docs/resources/nodebalancer.md
- Linode Terraform provider — `linode_nodebalancer_config` resource: https://github.com/linode/terraform-provider-linode/blob/main/docs/resources/nodebalancer_config.md
- Linode Terraform provider — `linode_nodebalancer_node` resource: https://github.com/linode/terraform-provider-linode/blob/main/docs/resources/nodebalancer_node.md
- Linode Terraform provider — `linode_instance` resource: https://github.com/linode/terraform-provider-linode/blob/main/docs/resources/instance.md

## Issues Found
1. **Missing `private_ip = true` on `linode_instance` in the "Adding Backend Nodes" section.** The example referenced `linode_instance.web[count.index].private_ip_address` to attach backend nodes to the NodeBalancer, but `private_ip_address` is only populated when `private_ip = true` is set on the instance. The `linode_nodebalancer_node` resource also requires the `address` to be a private IP. Without enabling private networking, the address would be empty and the apply would fail. **Fix:** Added `private_ip = true` to the `linode_instance "web"` block.

## Review Notes
- Resource argument names and valid values were verified against the upstream provider docs:
  - `algorithm`: `roundrobin`, `leastconn`, `source` ✓
  - `stickiness`: `none`, `table`, `http_cookie` ✓
  - `check`: `none`, `connection`, `http`, `http_body` ✓
  - `protocol`: `http`, `https`, `tcp` ✓
  - `mode`: `accept`, `reject`, `drain`, `backup` ✓
- Computed attribute `ipv4` on `linode_nodebalancer` is valid for the output.
- `ssl_cert` / `ssl_key` are the correct attribute names for HTTPS configurations.
- Region `us-east` is a valid Linode region ID.
- The provider also supports newer features (UDP protocol via `client_udp_sess_throttle` / `udp_check_port`, VPC attachment) that the post does not cover; this is a scope choice, not an error.
