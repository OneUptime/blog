# Validation Summary: How to Install Chef Infra Client on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- DNF
- Chef Infra Client
- Chef Infra Client configuration

## Sources Consulted
- Chef Software install script: https://docs.chef.io/chef_install_script/
- Install Chef Infra Client 19: https://docs.chef.io/client/19/install/
- Chef Infra Client native installer: https://docs.chef.io/client/19.1/install/installer/
- Chef Infra Client client.rb configuration: https://docs.chef.io/config_rb_client/
- Chef Infra Client executable reference: https://docs.chef.io/client/18/reference/ctl_chef_client/
- Red Hat Enterprise Linux 9 DNF package installation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool

## Issues Found
- The installation command used a placeholder `dnf install -y <package-name>`, which would not install Chef Infra Client. Replaced it with the current Chef install script command for Chef Infra Client 19 or later using the `chef-ice` project and a Chef license ID.
- The configuration path `/etc/<service>/config.conf` was a generic placeholder and not valid for Chef Infra Client. Replaced it with `/etc/chef/client.rb`, which is the default Chef Infra Client configuration path on Linux.
- The configuration guidance referred to service listening addresses, which are not applicable to Chef Infra Client node configuration. Replaced it with Chef-specific settings: `chef_server_url`, `node_name`, `client_key`, and `log_location`.
- The service management commands used placeholder `systemctl` units that are not created by the Chef Infra Client installation. Replaced them with `chef-client --version` and `sudo chef-client` commands.
- The verification and troubleshooting sections used placeholder service status, journal, and package checks. Replaced them with Chef Infra Client version checks, direct client runs, and configuration troubleshooting steps.

## Review Notes
Chef Infra Client 19 and later downloads require a Chef license ID when using Chef's download APIs. A production node also needs valid Chef Infra Server credentials, commonly provisioned during bootstrap.
