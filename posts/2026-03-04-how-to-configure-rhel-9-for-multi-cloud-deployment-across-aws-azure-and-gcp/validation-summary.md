# Validation Summary: How to Configure RHEL 9 for Multi-Cloud Deployment Across AWS, Azure, and GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kickstart
- cloud-init
- Red Hat subscription registration and rhc
- Terraform
- Ansible
- firewalld
- chrony
- Prometheus node_exporter
- systemd
- AWS, Azure, and Google Cloud

## Sources Consulted
- Red Hat Enterprise Linux 9: Automatically installing RHEL, Kickstart commands and options reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat Enterprise Linux 9: Configuring and managing cloud-init for RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_cloud-init_for_rhel_9/index
- Red Hat Subscription Central: Getting Started with RHEL System Registration: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/assembly-basic-reg-rhel-cli
- Ansible documentation for ansible.posix.firewalld: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Prometheus documentation for Node Exporter: https://prometheus.io/docs/guides/node-exporter/
- Prometheus node_exporter releases: https://github.com/prometheus/node_exporter/releases

## Issues Found
- The cloud-init example under `/etc/cloud/cloud.cfg.d/` did not include `#cloud-config`. Added the marker because Red Hat documents that cloud-init directive files in `cloud.cfg.d` should include it.
- The cloud-init `runcmd` example mixed `subscription-manager register`, `insights-client --register`, and an unauthenticated `rhc connect` command. Replaced it with the RHEL 9 `rhc connect --activation-key=... --organization=...` flow documented for RHEL 8.8 and later.
- The Ansible playbook notified `restart chronyd` but did not define that handler. Added the handler so the playbook is complete.
- The Ansible firewalld task only changed permanent rules. Added `immediate: true` so the SSH and HTTPS services are applied to the running firewalld configuration as well.
- The node_exporter systemd unit specified `User=node_exporter`, but the setup commands did not create that account. Added a system user creation command before enabling the service.
- The node_exporter download URL used the older v1.7.0 release. Updated the example to v1.11.1, the latest release available during validation.

## Review Notes
- The DNS Ansible example writes `/etc/resolv.conf` directly. This can be overwritten on systems where NetworkManager owns resolver configuration, so a future revision could use NetworkManager or RHEL system roles for production-grade DNS management.
- The Terraform module calls are intentionally skeletal and depend on matching module variable definitions in each provider-specific module.
