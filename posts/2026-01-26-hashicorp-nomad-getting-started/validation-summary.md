# Validation Summary: How to Get Started with HashiCorp Nomad

## Status
validated

## Post Type
Tutorial / Getting-started guide

## Technologies Covered
- HashiCorp Nomad
- Nomad HCL job specifications
- Nomad agent configuration
- Nomad CLI
- Docker task driver
- Consul service discovery
- Vault secrets templating
- Prometheus metrics
- systemd

## Sources Consulted
- HashiCorp Nomad install documentation: https://developer.hashicorp.com/nomad/docs/deploy
- HashiCorp Nomad current release page: https://developer.hashicorp.com/nomad/install
- HashiCorp Nomad agent command reference: https://developer.hashicorp.com/nomad/commands/agent
- HashiCorp Nomad agent configuration reference: https://developer.hashicorp.com/nomad/docs/configuration
- HashiCorp Nomad server configuration reference: https://developer.hashicorp.com/nomad/docs/configuration/server
- HashiCorp Nomad client configuration reference: https://developer.hashicorp.com/nomad/docs/configuration/client
- HashiCorp Nomad Consul integration reference: https://developer.hashicorp.com/nomad/docs/configuration/consul
- HashiCorp Nomad Vault integration reference: https://developer.hashicorp.com/nomad/docs/configuration/vault
- HashiCorp Nomad job specification reference: https://developer.hashicorp.com/nomad/docs/job-specification
- HashiCorp Nomad service block reference: https://developer.hashicorp.com/nomad/docs/job-specification/service
- HashiCorp Nomad volume block reference: https://developer.hashicorp.com/nomad/docs/job-specification/volume
- HashiCorp Nomad Docker driver reference: https://developer.hashicorp.com/nomad/docs/deploy/task-driver/docker
- HashiCorp Nomad job validate command reference: https://developer.hashicorp.com/nomad/commands/job/validate
- HashiCorp Nomad node drain command reference: https://developer.hashicorp.com/nomad/commands/node/drain
- HashiCorp Nomad release list: https://releases.hashicorp.com/nomad/

## Issues Found
- Updated the manual binary install example from Nomad 1.7.3 to Nomad 2.0.3, the current release shown by HashiCorp on June 13, 2026.
- Added `lsb-release` and `unzip` package installation where the commands use `lsb_release` and `unzip`.
- Moved `region` and `datacenter` into the agent-level server and client configuration, and changed the client `meta` example to arbitrary scheduling metadata. Nomad treats region and datacenter as agent configuration, not regular client metadata.
- Updated the systemd `Documentation` URL to the current HashiCorp Developer documentation URL.
- Changed the Redis persistence example to use the configured static host volume through a `volume` block and `volume_mount`, instead of a Docker `local/data:/data` bind that would not use the declared Nomad host volume.
- Replaced the deprecated periodic job `cron` field with `crons = ["0 2 * * *"]`.
- Fixed the Vault-backed backup example to provide `PGPASSWORD`, which `pg_dump` recognizes, and kept database host/name as normal environment variables.
- Updated `nomad node drain <node-id>` to `nomad node drain -enable <node-id>` because the current CLI requires either `-enable` or `-disable`.
- Softened the Kubernetes comparison from "solely" to "primarily" focused on containerized workloads.

## Review Notes
The three Nomad jobspecs were validated with Nomad v2.0.3 through a local dev agent. Nomad reported service-group `shutdown_delay` warnings for the long-running service examples; these are operational best-practice warnings, not validation failures.
