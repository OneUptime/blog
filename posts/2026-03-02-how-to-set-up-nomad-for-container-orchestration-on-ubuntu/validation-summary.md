# Validation Summary: How to Set Up Nomad for Container Orchestration on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Nomad (workload orchestrator)
- Ubuntu (APT package management)
- Docker (task driver)
- HCL (HashiCorp Configuration Language)
- systemd (service management)
- Nginx (used as example workload)

## Sources Consulted
- Nomad install documentation: https://developer.hashicorp.com/nomad/install
- Nomad agent configuration: https://developer.hashicorp.com/nomad/docs/configuration
- Nomad server stanza: https://developer.hashicorp.com/nomad/docs/configuration/server
- Nomad client stanza: https://developer.hashicorp.com/nomad/docs/configuration/client
- Nomad server_join block: https://developer.hashicorp.com/nomad/docs/configuration/server_join
- Docker task driver: https://developer.hashicorp.com/nomad/docs/deploy/task-driver/docker
- Nomad job specification network block: https://developer.hashicorp.com/nomad/docs/job-specification/network
- `nomad job scale` reference: https://developer.hashicorp.com/nomad/commands/job/scale
- `nomad alloc logs` reference: https://developer.hashicorp.com/nomad/commands/alloc/logs
- Nomad Agent HTTP API: https://developer.hashicorp.com/nomad/api-docs/agent
- GNU Privacy Guard (`gpg`) manual for `--dearmor` flag
- HashiCorp APT repository setup instructions

## Issues Found
- **GPG flag typo**: The original post used `sudo gpg --dearmit -o ...` when adding the HashiCorp APT GPG key. `--dearmit` is not a valid GPG option; the correct flag is `--dearmor`, which converts ASCII-armored key files to binary form. Without this fix, the install pipeline would fail and the APT key would not be added. Changed `--dearmit` to `--dearmor` in the install block.

## Review Notes
- HCL meta keys with dots (e.g., `"node.type"`, `"node.region"`) are technically valid as quoted string keys, but using dotted names for metadata can be confusing since interpolation in Nomad uses `${meta.X}` and `${attr.X}`. Functionally correct, but plain identifiers (e.g., `node_type`, `region_tag`) tend to read more cleanly.
- The systemd unit omits a `User=`/`Group=` directive, so the agent runs as root. The post notes this is intentional (cgroup/process management for clients), which matches HashiCorp's recommendation for client nodes. For server-only nodes, running as a dedicated `nomad` user is generally preferred but is outside the scope of this guide.
- `LimitNOFILE=65536` is fine; HashiCorp's reference unit file often uses `infinity` instead, which would lift the open-file limit further on busy clients.
- The Docker driver example sets `allow_privileged = false`, which is a sensible default; readers running privileged workloads should set this to `true` deliberately.
- The Nginx job's `service` stanza relies on Consul for health checks but the post does not install or configure Consul. The check will simply be unused unless Consul is added — worth noting for readers who follow only the Nomad steps.
- The nginx image tag `nginx:1.25-alpine` is pinned to a specific minor line; readers may want to update to a newer current tag (e.g., `nginx:1.27-alpine` or `nginx:alpine`) over time.
