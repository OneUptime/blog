# Validation Summary: How to Deploy Consul Cluster with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul (server agent, ACLs, gossip encryption, EC2 cloud auto-join)
- OpenTofu / Terraform (HCL syntax, `templatefile`, `locals`, `jsonencode`)
- Terraform `random` provider (`random_bytes` resource)
- Terraform `aws` provider (`aws_instance`, `aws_iam_role_policy`, `aws_security_group`, `aws_secretsmanager_secret`)
- Terraform `consul` provider (`consul_acl_policy`)
- AWS EC2, IAM, Secrets Manager, VPC security groups

## Sources Consulted
- Terraform `random_bytes` resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/bytes
- Terraform `consul` provider: https://registry.terraform.io/providers/hashicorp/consul/latest/docs
- Consul agent configuration reference: https://developer.hashicorp.com/consul/docs/agent/config/config-files
- Consul ACL configuration: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/acl
- Consul encryption configuration: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/encryption
- Consul required ports: https://developer.hashicorp.com/consul/docs/install/ports
- Consul cloud auto-join (EC2): https://developer.hashicorp.com/consul/docs/install/cloud-auto-join

## Issues Found
1. **Double base64 encoding of the gossip key.** The original code used `secret_string = base64encode(random_bytes.gossip_key.base64)`. The `.base64` attribute of `random_bytes` is already base64-encoded, so wrapping it in `base64encode()` produces a doubly-encoded value that Consul cannot decode (Consul's `encrypt` field expects a 32-byte key, base64-encoded once). Fixed to `secret_string = random_bytes.gossip_key.base64`.
2. **Incorrect use of `ca_file` in the `consul` provider block.** The original code passed `ca_file = file("${path.module}/ca.crt")`, but the `consul` provider's `ca_file` argument expects a file path string, while `file()` returns the file's contents. The correct argument when supplying contents is `ca_pem`. Changed to `ca_pem = file("${path.module}/ca.crt")`, which matches the intent of inlining the CA certificate.

## Review Notes
- The section heading "KMS for Gossip Encryption" is slightly misleading — the snippet uses AWS Secrets Manager, not KMS. Left as-is since renaming sections is outside the scope of a technical-correctness review.
- The top-level `verify_incoming`, `verify_outgoing`, and `verify_server_hostname` flags still work but are superseded in modern Consul releases by the nested `tls { defaults { ... } internal_rpc { ... } }` block. Readers targeting current Consul versions may prefer the newer syntax.
- `t3.small` is undersized for production Consul servers; HashiCorp recommends `m5.large` or larger for production workloads. This is a sizing recommendation rather than a syntactic error.
- Port 8302 (Serf WAN) is not opened in the security group. This is fine for a single-datacenter deployment but would need to be added for WAN federation between datacenters.
- The post does not show how the TLS certificates (`ca.crt`, `server.crt`, `server.key`) are generated/distributed; readers will need a separate PKI step (e.g. `consul tls` CLI or Vault PKI) before the configuration becomes functional.
