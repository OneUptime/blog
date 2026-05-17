# Validation Summary: How to Use Puppet for Configuration Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Puppet 8 (Puppet Server and Puppet Agent)
- Ubuntu 22.04 (jammy)
- Puppet DSL (manifests, classes, defined types)
- EPP (Embedded Puppet) templates
- Hiera 5 (data lookup)
- Puppet Bolt (referenced)
- systemd (service management)
- nginx, chrony (used as example resources)

## Sources Consulted
- Puppet Core – Install agents: https://help.puppet.com/core/current/Content/PuppetCore/install_agents.htm
- Puppet EPP template documentation: https://www.puppet.com/docs/puppet/7/lang_template_epp.html
- Puppet 8 facts / legacy top-scope facts guidance
- Puppet Server CA CLI reference: https://help.puppet.com/core/current/Content/PuppetCore/puppet_server_ca_cli.htm
- Puppet 8 Configuration Reference: https://help.puppet.com/core/current/Content/PuppetCore/Markdown/configuration.htm
- Hiera 5 config YAML reference: https://www.puppet.com/docs/puppet/7/hiera_config_yaml_5
- puppet apply man page (Puppet 8): https://help.puppet.com/core/8/content/puppetcore/Markdown/apply.htm

## Issues Found
1. **`template()` used with a `.epp` file extension** — In the "Common Puppet Resources Reference" section, the code used `content => template('myapp/app.conf.epp')`. The `template()` function is for ERB (`.erb`) templates only; EPP (`.epp`) templates must be rendered with the `epp()` function. Changed to `content => epp('myapp/app.conf.epp')`.

2. **Legacy top-scope fact `${::fqdn}`** — In the `site.pp` example, the motd content referenced `${::fqdn}`. Puppet 8 with Facter 4 no longer exposes legacy top-scope facts by default, so this would not resolve as written. Replaced with the structured-fact form `${facts['networking']['fqdn']}`, which is the documented modern syntax.

## Review Notes
- The Puppet 8 jammy repo package URL (`apt.puppetlabs.com/puppet8-release-jammy.deb`), the `puppetserver ca` CLI commands, the `puppet`/`puppetserver` systemd unit names, the `runinterval = 30m` format, the Hiera 5 hierarchy schema, and `puppet apply -e` were all verified as correct.
- The `chrony::servers` Hiera key in the example presumes use of a community chrony module that exposes that parameter; this is a reasonable convention but worth noting if a reader expects it to work without installing such a module.
- The `puppet:///modules/nginx/nginx.conf` source URL syntax for files served from a module's `files/` directory is correct.
- Ubuntu 22.04 (jammy) is in standard support until April 2027, so the jammy-specific package reference is appropriate at the post's date but will need to be updated for newer LTS releases (24.04 noble) in the future.
