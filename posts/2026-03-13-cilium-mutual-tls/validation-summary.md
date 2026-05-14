# Validation Summary: Mutual TLS with Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium Service Mesh mutual authentication
- Kubernetes
- CiliumNetworkPolicy
- SPIFFE and SPIRE
- Helm
- Cilium CLI and Cilium agent debugging
- Prometheus metrics

## Sources Consulted
- Cilium Mutual Authentication documentation: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication/
- Cilium Mutual Authentication example: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication-example/
- Cilium Helm reference for authentication and SPIRE values: https://docs.cilium.io/en/latest/helm-reference/
- Cilium Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- SPIRE agent command documentation: https://github.com/spiffe/spire/blob/main/doc/spire_agent.md

## Issues Found
- The post described Cilium mutual authentication as encrypting service-to-service application traffic. Cilium's documentation states that its mutual authentication uses an out-of-band mTLS handshake, and users must enable WireGuard or IPsec transparent encryption to encrypt pod data traffic. I corrected the description, introduction, verification wording, diagram, and conclusion to distinguish authentication from traffic encryption.
- The post claimed Cilium uses its own certificate authority and that identities are derived from Kubernetes service accounts. I updated this to reflect Cilium's documented SPIFFE/SPIRE integration, where workload SPIFFE IDs are based on Cilium security identities and Cilium registers identities with SPIRE.
- The Helm example omitted `authentication.enabled=true`, which the Cilium Helm reference requires for authentication processing. I added that value and included restarts for the Cilium operator and agent after changing the configuration.
- The SPIRE verification commands were too generic and included `cilium debuginfo | grep -i spiffe`, which is not how Cilium documents mutual authentication verification. I replaced them with the documented SPIRE healthcheck, attested-agent list, delegate identity, and workload identity commands.
- The active-authentication verification commands used `cilium endpoint list`, `cilium endpoint get`, and Hubble filtering for auth state. Cilium documents verification through debug logs and uses `cilium-dbg` inside the Cilium agent for endpoint inspection, so I replaced those examples.
- The SPIRE agent certificate check did not include Cilium's SPIRE agent socket path. I added `-socketPath /run/spire/sockets/agent/agent.sock`, matching Cilium's Helm defaults.
- The conclusion referred to `authentication: required`, but the actual CiliumNetworkPolicy field is `authentication.mode: "required"`. I corrected the field reference.

## Review Notes
- Cilium mutual authentication is still documented as beta in Cilium 1.19 stable, and the docs list several security-model roadmap items. The post now avoids overstating it as complete transparent traffic encryption.
