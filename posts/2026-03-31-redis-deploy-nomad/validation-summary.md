# Validation Summary: How to Deploy Redis with Nomad

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7 (Alpine Docker image)
- HashiCorp Nomad (job scheduling, Docker driver, host volumes, rolling updates)
- HashiCorp Consul (KV store for secrets, DNS-based service discovery)
- Docker (container runtime)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Nomad Job Specification documentation (developer.hashicorp.com/nomad/docs/job-specification)
- Nomad Docker Driver documentation (developer.hashicorp.com/nomad/docs/drivers/docker)
- Nomad Interpolation documentation (developer.hashicorp.com/nomad/docs/runtime/interpolation)
- Nomad CLI reference — `nomad deployment status` (developer.hashicorp.com/nomad/docs/commands/deployment/status)
- Nomad CLI reference — `nomad job revert` (developer.hashicorp.com/nomad/docs/commands/job/revert)
- Nomad Host Volumes documentation (developer.hashicorp.com/nomad/docs/configuration/client#host_volume-block)
- Nomad Service Check documentation (developer.hashicorp.com/nomad/docs/job-specification/check)
- Consul KV CLI reference (developer.hashicorp.com/consul/commands/kv/put)
- Consul DNS documentation (developer.hashicorp.com/consul/docs/services/discovery/dns-overview)
- Redis Docker image documentation (hub.docker.com/_/redis)

## Issues Found
1. **`nomad deployment status` missing required argument**: The command `nomad deployment status` was used without a deployment ID, but the CLI requires a deployment ID or prefix as a positional argument. Fixed to `nomad deployment status <deployment-id>`.

## Review Notes
- The `service` block is placed at the task level rather than the group level. Both are valid, but group-level service registration is preferred for Consul Connect/service mesh scenarios. For this simple Redis deployment, task-level placement is fine.
- The Nomad docs recommend using absolute paths for script check `command` fields (e.g., `/usr/local/bin/redis-cli` instead of `redis-cli`). In practice, PATH resolution works inside the Docker container, so the current form functions correctly, but using an absolute path would be more robust.
- The summary states "Consul KV stores secrets securely." While Consul KV can be ACL-protected and encrypted in transit via TLS, it does not encrypt values at rest by default. For production secrets management, HashiCorp Vault is the recommended approach. This is a best-practices nuance rather than a technical error.
- The `template` stanza does not explicitly set `change_mode`. It defaults to `"restart"`, which is appropriate for this use case (task restarts if the Consul KV password value changes).
