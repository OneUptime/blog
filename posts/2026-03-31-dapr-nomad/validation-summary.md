# Validation Summary: How to Use Dapr with Nomad

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (daprd sidecar runtime)
- HashiCorp Nomad (container orchestration)
- HashiCorp Consul (service discovery / name resolution)
- Redis (state store component)
- Docker (task driver)

## Sources Consulted
- Dapr self-hosted Docker documentation: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- daprio/daprd Docker Hub image: https://hub.docker.com/r/daprio/daprd
- Dapr CLI run command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Consul name resolution reference: https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-consul/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Nomad network block docs: https://developer.hashicorp.com/nomad/docs/job-specification/network
- Nomad update block docs: https://developer.hashicorp.com/nomad/docs/job-specification/update
- Nomad job command reference: https://developer.hashicorp.com/nomad/commands/job
- Nomad job scale command reference: https://developer.hashicorp.com/nomad/commands/job/scale
- Nomad alloc logs command reference: https://developer.hashicorp.com/nomad/commands/alloc/logs
- Dapr v1.14 release announcement: https://blog.dapr.io/posts/2024/08/14/dapr-v1.14-is-now-available/

## Issues Found

1. **Deprecated `--components-path` flag**: The blog used the `--components-path` flag for daprd, which has been deprecated in favor of `--resources-path`. Updated to `--resources-path` to use the current, non-deprecated flag.

2. **Non-standard `daprPortMetaKey` value**: The Consul name resolution configuration used `daprPortMetaKey: dapr-port`, but the Dapr default and conventional value is `DAPR_PORT`. Using a non-standard key would cause a mismatch with Dapr's self-registration metadata. Updated to `DAPR_PORT` to match the ecosystem default.

## Review Notes
- The `daprio/daprd:1.14.0` image tag is valid (Dapr v1.14.0 was released August 2024), but readers should consider using a more recent version as newer Dapr releases are available.
- All Nomad HCL syntax, CLI commands, update stanza fields, and scaling commands are correct.
- The Consul service health check using `/v1.0/healthz` on the Dapr HTTP port is correct.
- The Redis state store component definition (`state.redis`, `redisHost` metadata field) is accurate.
- The Nomad template block correctly uses Nomad's `env` function to reference dynamic addresses, which is the idiomatic approach for Nomad templates.
