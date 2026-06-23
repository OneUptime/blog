# Validation Summary: How to Configure Consul for Multi-Datacenter

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- HashiCorp Consul
- Consul WAN federation
- Consul ACL replication
- Consul service mesh / Connect
- Consul mesh gateways and Envoy
- Consul prepared queries and DNS
- Consul Enterprise network segments
- Python Consul client usage

## Sources Consulted
- HashiCorp Consul agent configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file
- HashiCorp Consul general agent parameters, including ports and primary_datacenter: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/general
- HashiCorp Consul ACL agent configuration parameters: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/acl
- HashiCorp Consul advertise address parameters: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/address
- HashiCorp Consul join parameters: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/join
- HashiCorp Consul service definition reference: https://developer.hashicorp.com/consul/docs/reference/service
- HashiCorp Consul mesh gateway federation guide: https://developer.hashicorp.com/consul/docs/east-west/mesh-gateway/federation
- HashiCorp Consul `consul connect envoy` CLI reference: https://developer.hashicorp.com/consul/commands/connect/envoy
- HashiCorp Consul prepared query API reference: https://developer.hashicorp.com/consul/api-docs/query
- HashiCorp Consul ACL API reference, including `/v1/acl/replication`: https://developer.hashicorp.com/consul/api-docs/acl
- HashiCorp Consul `acl set-agent-token` CLI reference: https://developer.hashicorp.com/consul/commands/acl/set-agent-token
- HashiCorp Consul network segments guide: https://developer.hashicorp.com/consul/docs/multi-tenant/network-segment/vm

## Issues Found
- The Consul server port examples enabled plaintext `grpc = 8502` but did not expose `grpc_tls = 8503`. Current Consul documentation distinguishes plaintext gRPC from TLS gRPC and recommends `grpc_tls` for encrypted xDS/API traffic. Added `grpc_tls = 8503` to both datacenter server examples.
- The ACL replication section said to create the replication token "On secondary datacenter" while the command comment correctly created it in the primary datacenter. Reworded the instruction to create the token in the primary datacenter and set it on each secondary server.
- The ACL-enabled examples showed unauthenticated CLI/API usage without any caveat. Added a concise note that ACL-protected CLI and API commands require a token with the required privileges.
- The monitoring section described `consul operator raft list-peers` as checking datacenter connectivity. Raft peers are local to a Consul datacenter's server cluster, so the comment now says it checks local Raft peers.
- The monitoring script counted catalog nodes as healthy using a `Status` field that is not returned by the catalog nodes endpoint. Updated the script to report registered node count instead.

## Review Notes
The post is technically relevant and the main workflow is consistent with current Consul documentation. In a future revision, the examples could be expanded to show full ACL token handling for every `curl`, `dig`, and CLI example, but the current corrections keep the article accurate without restructuring it.
