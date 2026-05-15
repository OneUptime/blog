# Validation Summary: How to Deploy a Nomad Cluster for Workload Orchestration on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- HashiCorp Nomad
- Nomad agent configuration
- Nomad job specifications
- Docker Engine
- firewalld
- systemd

## Sources Consulted
- HashiCorp Nomad installation documentation: https://developer.hashicorp.com/nomad/docs/deploy
- HashiCorp Nomad agent configuration documentation: https://developer.hashicorp.com/nomad/docs/configuration
- HashiCorp Nomad server configuration documentation: https://developer.hashicorp.com/nomad/docs/configuration/server
- HashiCorp Nomad client configuration documentation: https://developer.hashicorp.com/nomad/docs/configuration/client
- HashiCorp Nomad server join documentation: https://developer.hashicorp.com/nomad/docs/deploy/clusters/connect-nodes
- HashiCorp Nomad production requirements and ports: https://developer.hashicorp.com/nomad/docs/deploy/production/requirements
- HashiCorp Nomad Docker driver documentation: https://developer.hashicorp.com/nomad/docs/drivers/docker
- HashiCorp Nomad job specification documentation: https://developer.hashicorp.com/nomad/docs/job-specification
- HashiCorp Nomad network block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/network
- HashiCorp Nomad resources block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/resources
- HashiCorp Nomad job scale command reference: https://developer.hashicorp.com/nomad/commands/job/scale
- HashiCorp Nomad job deployments command reference: https://developer.hashicorp.com/nomad/commands/job/deployments
- Docker Engine installation documentation for RHEL: https://docs.docker.com/engine/install/rhel/

## Issues Found
- The Nomad installation steps used `dnf config-manager` without first installing the package that provides it. Added `sudo dnf install -y dnf-plugins-core` before adding the HashiCorp repository.
- The Docker installation command installed only `docker-ce`. Docker's official RHEL instructions install Docker Engine with `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, and `docker-compose-plugin`. Updated the command to use the full package list and added the `dnf-plugins-core` prerequisite before adding Docker's repository.
- The scaling example used `nomad job scale web web 5`. This is valid when specifying both job ID and group name, but the job has only one task group, and Nomad's command reference allows omitting the group in that case. Changed it to `nomad job scale web 5` to match the documented single-group form.

## Review Notes
The remaining Nomad server, client, firewall, Docker driver, job, and deployment commands match current Nomad documentation. The example uses fixed private IP addresses and unauthenticated HTTP UI access for simplicity; production deployments should also configure ACLs, TLS, host-specific advertise addresses, and appropriate network access controls.
