# Validation Summary: How to Secure Nomad Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- HashiCorp Nomad
- TLS and mTLS
- Nomad ACLs
- Serf gossip encryption
- Consul Connect / service mesh

## Sources Consulted
- HashiCorp Nomad TLS agent configuration: https://developer.hashicorp.com/nomad/docs/configuration/tls
- HashiCorp Nomad TLS encryption guide: https://developer.hashicorp.com/nomad/docs/secure/traffic/tls
- HashiCorp Nomad ACL agent configuration: https://developer.hashicorp.com/nomad/docs/configuration/acl
- HashiCorp Nomad ACL bootstrap guide: https://developer.hashicorp.com/nomad/docs/secure/acl/bootstrap
- HashiCorp Nomad gossip encryption guide: https://developer.hashicorp.com/nomad/docs/secure/traffic/gossip-encryption
- HashiCorp Nomad gossip keyring generate command reference: https://developer.hashicorp.com/nomad/commands/operator/gossip/keyring-generate
- HashiCorp Nomad agent configuration reference: https://developer.hashicorp.com/nomad/docs/configuration

## Issues Found
- The ACL example included `default_policy = "deny"` and `enable_token_persistence = true`, which are not current Nomad agent `acl` block parameters. Removed those fields and left the supported `enabled = true` setting. Nomad's default deny behavior is handled by ACL enforcement after bootstrap.
- The gossip encryption key generation command used `nomad operator keygen`, which was deprecated and removed in current Nomad versions. Replaced it with `nomad operator gossip keyring generate`.
- The gossip explanation said Nomad uses Serf for cluster membership generally. Updated it to specify Nomad servers, matching current Nomad gossip encryption documentation.
- The TLS section showed a server certificate while saying to configure servers and clients. Added a short note to use the matching server or client certificate on each agent.

## Review Notes
The TLS example is technically valid, including `verify_server_hostname` and `verify_https_client`, but `verify_https_client = true` requires API clients and browsers accessing the UI to present client certificates. This is secure but can complicate UI and CLI access; operators may choose to rely on ACLs for HTTPS client authorization depending on their deployment model.
