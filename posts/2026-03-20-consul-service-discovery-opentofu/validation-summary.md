# Validation Summary: How to Set Up Consul Service Discovery with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HashiCorp Consul 1.18.0 (service discovery, KV, health checks)
- HashiCorp Consul Terraform provider (`consul_service`, `consul_node`, `consul_key_prefix`)
- AWS provider (`aws_instance`)
- Consul cloud auto-join (AWS provider)
- Consul go-sockaddr template syntax (`GetInterfaceIP`)

## Sources Consulted
- [Consul agents configuration file reference](https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file) — confirmed `data_dir` is required for all agents
- [General parameters for Consul agent configuration](https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/general)
- [consul_service Terraform Registry docs](https://registry.terraform.io/providers/hashicorp/consul/latest/docs/resources/service) — verified check block argument requirements
- HashiCorp `terraform-provider-consul` source (`consul/resource_consul_service.go`) — confirmed required check fields are `check_id`, `name`, `interval`, `timeout`; `tls_skip_verify`, `status`, `http`, `deregister_critical_service_after` are optional
- [Consul releases](https://releases.hashicorp.com/consul/) — confirmed 1.18.0 is a real release (Feb 2024)

## Issues Found
1. **Missing `data_dir` in Consul server config** — The original `config.hcl` heredoc omitted `data_dir`, which is required for any Consul agent (server or client). Without it, `consul agent` refuses to start. Added `data_dir = "/opt/consul"` to the configuration.
2. **Missing `mkdir -p /etc/consul.d`** — The bootstrap script wrote to `/etc/consul.d/config.hcl` without first creating the directory. On a manual install (no consul package), this directory does not exist, so the heredoc would fail with "No such file or directory". Added `mkdir -p /etc/consul.d /opt/consul` (the latter for the new `data_dir`).

## Review Notes
- The `consul_service` `check` block in the post correctly uses `check_id`, `name`, `http`, `interval`, `timeout`, and `deregister_critical_service_after`. All are valid; `interval` and `timeout` are required, the rest optional. No changes needed.
- Running `consul agent ... &` from `user_data` orphans the process to PID 1 — it survives the user-data script exit but will not restart on reboot. A real production setup should use a systemd unit. Acceptable for an introductory blog post but worth noting.
- The `provider "consul"` block addresses `aws_instance.consul_server[0].private_ip` directly. On the very first `tofu apply`, the provider cannot connect until that instance exists, which can cause issues if the same root module also declares `consul_*` resources. A two-stage apply (or `-target`) is typically required. Not a syntactic error.
- The `output "consul_ui_url"` references `public_ip`, but the instances are placed in `var.private_subnet_ids` and have no `associate_public_ip_address`, so this output will resolve to an empty string. Cosmetic / architectural inconsistency — left as-is to avoid changing the post's intent (some readers may swap to public subnets).
- The `bind_addr = "{{ GetInterfaceIP \"eth0\" }}"` go-sockaddr template is correct for Consul; the escaped quotes are needed because the string sits inside a bash heredoc (`<<EOF`, not `<<'EOF'`).
- Consul `1.18.0` is a real release; the `releases.hashicorp.com` URL pattern is correct.
- AWS cloud auto-join string `provider=aws tag_key=... tag_value=... region=...` is the correct go-discover syntax for Consul's `retry_join`.
