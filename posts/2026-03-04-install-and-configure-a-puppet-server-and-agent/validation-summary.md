# Validation Summary: How to Install and Configure a Puppet Server and Agent on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Puppet Core
- Puppet Server
- Puppet Agent
- systemd
- firewalld

## Sources Consulted
- Puppet Core documentation: Set up Puppet, https://help.puppet.com/core/current/Content/PuppetCore/install_and_configure.htm
- Puppet Core documentation: Installing Puppet, https://help.puppet.com/core/current/Content/PuppetCore/install_puppet.htm
- Puppet Core documentation: Enable the Puppet Core repositories, https://help.puppet.com/core/current/Content/PuppetCore/enable_the_puppet_platform_repository.htm
- Puppet Core documentation: Install *nix agents, https://help.puppet.com/core/current/Content/PuppetCore/install_nix_agents.htm
- Puppet documentation: Installing Puppet Server, https://www.puppet.com/docs/puppet/7/server/install_from_packages
- Puppet documentation: puppet.conf main config file, https://www.puppet.com/docs/puppet/7/config_file_main
- Puppet documentation: Editing settings on the command line, https://www.puppet.com/docs/puppet/7/config_set
- Puppet documentation: Puppet agent on *nix systems, https://www.puppet.com/docs/puppet/7/services_agent_unix.html
- Puppet documentation: Puppet Server CA commands, https://www.puppet.com/docs/puppet/7/puppet_server_ca_cli

## Issues Found
- The installation steps used generic placeholders such as `<package-name>` instead of Puppet packages. Replaced them with `puppetserver` for the primary server and `puppet-agent` for agent nodes.
- The preparation step installed `epel-release` and "Development Tools", which are not required by the Puppet package installation flow. Replaced them with installation of `curl` and enabling the Puppet Core Yum repository package for the detected RHEL major version.
- The configuration path `/etc/<service>/config.conf` was not a valid Puppet configuration file. Replaced it with `/etc/puppetlabs/puppet/puppet.conf` and added the supported `puppet config set` command for the agent's primary server setting.
- The service management commands used `<service>`. Replaced them with `puppetserver` for the Puppet Server systemd unit and the Puppet-supported service resource command for the `puppet` agent service.
- The verification step used `sudo <service> --test`, which is not a valid Puppet command. Replaced it with `puppet agent --test` and the `puppetserver ca list` and `puppetserver ca sign` commands used to review and sign agent certificate requests.
- The firewall step used `--add-service=<service>`, which does not identify a valid firewalld service. Replaced it with TCP port 8140, which Puppet uses for HTTPS traffic.
- The performance and troubleshooting examples still referenced `<service>` and an unreliable `pidof` pattern. Replaced them with `puppetserver` systemd status checks and the RHEL Puppet Server sysconfig file used for JVM settings.

## Review Notes
The guide is now technically usable as a concise Puppet Server and Puppet Agent setup outline. It still uses example hostnames such as `puppet.example.com` and `agent.example.com`; readers must replace those with their real DNS names, and Puppet Core repository access may require credentials depending on how the packages are obtained.
