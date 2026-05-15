# Validation Summary: How to Install and Configure HashiCorp Nomad on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- DNF
- HashiCorp Nomad
- systemd
- HCL

## Sources Consulted
- HashiCorp Nomad installation documentation: https://developer.hashicorp.com/nomad/docs/install
- HashiCorp Nomad deployment installation documentation: https://developer.hashicorp.com/nomad/docs/deploy
- HashiCorp Nomad agent configuration documentation: https://developer.hashicorp.com/nomad/docs/configuration
- HashiCorp Nomad production deployment guide: https://developer.hashicorp.com/nomad/tutorials/enterprise/production-deployment-guide-vm-with-consul
- Red Hat Enterprise Linux 9 DNF repository documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_managing-custom-software-repositories_managing-software-with-the-dnf-tool

## Issues Found
- The install instructions used `dnf config-manager` without first installing the package that provides it. Added `sudo dnf install -y dnf-plugins-core`, which is the expected RHEL 9 package for DNF repository management commands.
- The configuration path used the placeholder `/etc/<service>/config.conf`. Replaced it with `/etc/nomad.d/nomad.hcl`, matching Nomad's documented HCL configuration directory pattern.
- The post did not include a valid Nomad configuration example. Added a minimal single-node test configuration with `datacenter`, `data_dir`, `bind_addr`, `server`, and `client` settings based on Nomad's documented agent configuration fields.
- The systemd commands used `<service-name>` placeholders. Replaced them with the actual Nomad service name, `nomad`.
- The verification and troubleshooting commands used placeholders for the service and package names. Replaced them with `nomad` so the commands can be run directly.

## Review Notes
The single-node configuration is suitable for a test or learning environment. Production Nomad deployments should use separate server and client nodes, secure inter-agent communication with mTLS, and configure ACLs according to HashiCorp's production guidance.
