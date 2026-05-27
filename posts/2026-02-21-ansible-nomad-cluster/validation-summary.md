# Validation Summary: How to Use Ansible to Set Up a Nomad Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- HashiCorp Nomad
- HashiCorp Consul
- Docker Engine
- systemd
- HCL
- YAML

## Sources Consulted
- HashiCorp Nomad agent configuration reference: https://developer.hashicorp.com/nomad/docs/configuration
- HashiCorp Nomad server configuration reference: https://developer.hashicorp.com/nomad/docs/configuration/server
- HashiCorp Nomad client configuration reference: https://developer.hashicorp.com/nomad/docs/configuration/client
- HashiCorp Nomad server_join configuration reference: https://developer.hashicorp.com/nomad/docs/configuration/server_join
- HashiCorp Nomad Consul configuration reference: https://developer.hashicorp.com/nomad/docs/configuration/consul
- HashiCorp Nomad Docker task driver documentation: https://developer.hashicorp.com/nomad/docs/deploy/task-driver/docker
- HashiCorp Nomad raw_exec task driver documentation: https://developer.hashicorp.com/nomad/docs/deploy/task-driver/raw_exec
- HashiCorp Nomad job specification reference: https://developer.hashicorp.com/nomad/docs/job-specification
- HashiCorp Nomad service and check job specification references: https://developer.hashicorp.com/nomad/docs/job-specification/service and https://developer.hashicorp.com/nomad/docs/job-specification/check
- HashiCorp Nomad resources job specification reference: https://developer.hashicorp.com/nomad/docs/job-specification/resources
- HashiCorp Nomad job run command reference: https://developer.hashicorp.com/nomad/docs/commands/job/run
- HashiCorp Nomad 2.0.x release notes and support lifecycle: https://developer.hashicorp.com/nomad/docs/release-notes/v2-0-x
- HashiCorp Nomad release binaries: https://releases.hashicorp.com/nomad/
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/
- Ansible apt, apt_repository, user, copy, and systemd_service module documentation: https://docs.ansible.com/

## Issues Found
- The post pinned Nomad to `1.7.2`, which is outdated for a current setup. Updated the default to `2.0.2`, the current supported 2.0.x release available from HashiCorp releases as of this review.
- The Docker installation task installed `docker-ce` packages without configuring Docker's APT repository first, which would fail on a clean Ubuntu host. Added tasks to install prerequisites, create `/etc/apt/keyrings`, fetch Docker's signing key, add the Docker APT repository, and install `containerd.io` alongside `docker-ce` and `docker-ce-cli`.
- The Nomad service task referenced `nomad.service.j2` but the post did not provide that template. Replaced the reference with an inline `copy` task containing a minimal systemd unit that starts `nomad agent -config={{ nomad_config_dir }}`.
- The client driver allowlist included `raw_exec`, but Nomad documents `raw_exec` as disabled by default unless explicitly enabled in a plugin block. Removed `raw_exec` from the allowlist so the snippet only enables drivers it actually configures for use.
- The Nomad service user was not granted Docker daemon access. Added a task to append the `nomad` user to the `docker` group on Docker-enabled clients.

## Review Notes
- The corrected Docker repository task is Ubuntu/amd64-specific, matching the post's APT-based package installation and amd64 Nomad binary URL. A production-ready role should parameterize the OS family, distribution, architecture, and checksum verification.
- The Nomad, Consul, Docker driver, server join, telemetry, job, service, check, resource, and CLI snippets otherwise match the official documentation reviewed.
