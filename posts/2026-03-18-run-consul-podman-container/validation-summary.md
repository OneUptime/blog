# Validation Summary: How to Run Consul in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containers
- HashiCorp Consul
- Consul agent and server modes
- Consul HTTP API
- Consul service registration and health checks
- Consul KV store
- Consul DNS interface
- Consul HCL configuration
- Container volumes and port publishing

## Sources Consulted
- Consul agent command options: https://developer.hashicorp.com/consul/commands/agent
- Consul on Docker documentation: https://developer.hashicorp.com/consul/docs/docker
- Deploy Consul server agent on Docker: https://developer.hashicorp.com/consul/docs/deploy/server/docker
- Consul web UI documentation: https://developer.hashicorp.com/consul/docs/fundamentals/interface/ui
- Consul ports reference: https://developer.hashicorp.com/consul/docs/reference/architecture/ports
- Consul service definition documentation: https://developer.hashicorp.com/consul/docs/register/service/vm/define
- Consul Agent Service HTTP API: https://developer.hashicorp.com/consul/api-docs/agent/service
- Consul KV Store HTTP API: https://developer.hashicorp.com/consul/api-docs/kv
- Consul agent configuration file reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file
- Consul general configuration parameters: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/general
- Consul UI configuration parameters: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/ui
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The introduction and summary implied the container is rootless by default. Updated the wording to clarify that Consul can run rootless when Podman is run rootless.
- The `podman run` examples used the unqualified image name `hashicorp/consul:latest` after pulling `docker.io/hashicorp/consul:latest`. Changed run commands to use `docker.io/hashicorp/consul:latest` consistently so Podman does not depend on short-name registry resolution.
- The persistent storage example used `agent -dev`, but Consul development mode turns persistence off and does not write data to disk. Changed the example to run a single Consul server with `-server`, `-bootstrap-expect=1`, and `-data-dir=/consul/data`.
- The UI example pointed users to `http://localhost:8500`; Consul's documented UI path is `/ui`. Changed the browser URL to `http://localhost:8500/ui`.
- The service registration example used unreachable placeholder service addresses and a health check URL that would fail in the local container. Changed the example to use a local Consul status endpoint so the registered service can pass its health check for the tutorial's DNS examples.
- The DNS node query used `consul.node.consul`, but the dev agent did not set that node name. Added `-node=consul` to the dev server command.
- The custom configuration example reused the same `consul-data` volume as the persistent server example, which could cause data directory locking or state conflicts if the examples are run in sequence without cleanup. Changed it to use a separate `consul-custom-data` volume and updated cleanup.
- The comment for `client_addr` said it only applied to the HTTP API. Updated it to reflect that Consul uses `client_addr` for HTTP, DNS, and gRPC interfaces.
- The management section described `consul operator raft list-peers` as forcing a leader election. That command lists Raft peers; updated the comment accordingly.

## Review Notes
Podman is not installed in this workspace, so Podman CLI behavior was validated against official Podman documentation rather than local `podman --help` output. The Consul examples are appropriate for local development and testing; production deployments should add ACLs, gossip encryption, TLS, stable version pinning, and a multi-server quorum.
