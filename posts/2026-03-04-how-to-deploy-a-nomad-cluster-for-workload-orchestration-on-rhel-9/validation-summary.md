# Validation Summary: How to Deploy a Nomad Cluster for Workload Orchestration on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- HashiCorp Nomad
- Nomad agent configuration
- Nomad job specifications
- Docker task driver
- systemd

## Sources Consulted
- HashiCorp Nomad installation documentation: https://developer.hashicorp.com/nomad/docs/deploy
- HashiCorp Nomad agent configuration documentation: https://developer.hashicorp.com/nomad/docs/configuration
- HashiCorp Nomad server cluster joining documentation: https://developer.hashicorp.com/nomad/docs/deploy/clusters/connect-nodes
- HashiCorp Nomad client configuration documentation: https://developer.hashicorp.com/nomad/docs/configuration/client
- HashiCorp Nomad network job specification documentation: https://developer.hashicorp.com/nomad/docs/job-specification/network
- HashiCorp Nomad Docker task driver documentation: https://developer.hashicorp.com/nomad/docs/deploy/task-driver/docker
- HashiCorp Nomad Docker job declaration documentation: https://developer.hashicorp.com/nomad/docs/job-declare/task-driver/docker
- Docker Engine installation documentation for RHEL: https://docs.docker.com/engine/install/rhel/
- Red Hat Enterprise Linux 9 DNF repository management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/

## Issues Found
- The client configuration used the Docker task driver, and the sample job used `driver = "docker"`, but the installation steps did not install or start Docker on Nomad client nodes. Added Docker Engine repository, package installation, and service startup commands for client nodes because Nomad's Docker task driver requires Docker to be installed and running on the host.
- The server configuration set `bootstrap_expect = 3` but did not provide a way for server nodes to discover and join each other. Added a `server_join` block with `retry_join` addresses so the three servers can form a cluster automatically.
- The sample Docker job used `to = 80` port mapping without setting the group network mode. Added `mode = "bridge"` to the `network` block because Nomad's Docker port mapping with `to` is documented for bridged networking by default.

## Review Notes
The sample IP addresses are still placeholders and should be replaced with the real private addresses or DNS names of the Nomad server nodes. Production deployments should also add TLS, ACLs, firewall rules for Nomad ports, and a supported service discovery strategy, but those are outside the scope of the original post.
