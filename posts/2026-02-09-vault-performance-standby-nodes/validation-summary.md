# Validation Summary: How to Configure Vault Performance Standby Nodes on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault Enterprise
- Vault performance standby nodes
- Vault Integrated Storage / Raft
- Kubernetes Services and StatefulSets
- Vault CLI
- Go Vault API client
- Prometheus alerting rules

## Sources Consulted
- HashiCorp Vault performance standby documentation: https://developer.hashicorp.com/vault/docs/enterprise/performance-standby
- HashiCorp Vault performance standby tutorial: https://developer.hashicorp.com/vault/tutorials/enterprise/performance-standbys
- HashiCorp Vault Integrated Storage / Raft configuration: https://developer.hashicorp.com/vault/docs/configuration/storage/raft
- HashiCorp Vault `operator raft` CLI documentation: https://developer.hashicorp.com/vault/docs/commands/operator/raft
- HashiCorp Vault `/sys/health` API documentation: https://developer.hashicorp.com/vault/api-docs/system/health
- HashiCorp Vault TCP listener configuration: https://developer.hashicorp.com/vault/docs/configuration/listener/tcp
- HashiCorp Vault telemetry metrics reference: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/core-system
- HashiCorp Vault availability telemetry metrics: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/availability
- HashiCorp Vault telemetry configuration: https://developer.hashicorp.com/vault/docs/configuration/telemetry
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes dependent environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Kubernetes Service API reference for `publishNotReadyAddresses`: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.25/

## Issues Found
- The post described standard standby nodes as idle and said performance standbys can handle lease renewals locally. Updated the wording to match Vault documentation: standard standbys forward requests, while performance standbys handle most read-only requests locally and forward writes.
- The description claimed disaster recovery capabilities. Performance standbys improve read scalability and high availability, but DR is a separate Vault Enterprise replication feature, so the description was corrected.
- The Vault listener example incorrectly defined a second TCP listener on port 8201. Updated it to use `cluster_address` on the TCP listener, which is the documented way to bind the cluster port.
- The Raft node ID example used a generic `NODE_ID` environment variable. Updated the Kubernetes manifest to set `VAULT_RAFT_NODE_ID`, the documented environment override for Raft node IDs.
- The Kubernetes Service selected `vault-active: "true"`, but the shown StatefulSet never applied that label. Updated the service selector to target all Vault pods, matching the text about load balancing across active and performance standby nodes.
- The health probes only used `perfstandbyok=true`. Updated them to `standbyok=true&perfstandbyok=true` so active, standby, and performance standby nodes can be treated as healthy by Kubernetes probes.
- The initialization and scaling commands manually joined nodes even though `retry_join` was configured. Updated the commands to explain that `retry_join` adds nodes after the first node is initialized.
- The `vault status` sample showed `HA Mode` as `performance standby`. Vault reports `HA Mode` as `standby` and exposes performance standby state on the separate `Performance Standby Node` line, so the sample was corrected.
- The Prometheus rules used unsupported metric selectors such as `vault_core_active{mode="performance_standby"}` and a replication Merkle metric for standby lag. Updated the rules to use documented Vault telemetry metrics such as `vault_core_performance_standby`, `vault_ha_rpc_client_echo_*`, and `vault_core_handle_request_count`.
- The failover tuning example used unsupported Raft settings `heartbeat_timeout` and `leader_lease_timeout`. Replaced them with Vault's documented `performance_multiplier` setting.
- The Vault Enterprise container tag was updated from the outdated `1.15` series to `1.21` to align the example with current Vault documentation.

## Review Notes
The guide now validates as a technically accurate tutorial. For a production-grade future revision, consider distinguishing voting Raft nodes from Enterprise non-voter nodes when scaling read-only workloads, because non-voters can add read capacity without increasing quorum size.
