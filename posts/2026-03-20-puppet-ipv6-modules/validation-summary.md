# Validation Summary: How to Deploy IPv6 Configuration with Puppet Modules

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Puppet Core / Puppet language
- Puppet Forge
- `puppetlabs/firewall`
- `puppet/augeasproviders_sysctl`
- `puppet/network`
- `saz/sysctl`
- Linux IPv6 sysctl settings
- Debian/Ubuntu `ifupdown`
- iptables / ip6tables
- Puppet Development Kit (PDK)

## Sources Consulted
- Puppet Core module command reference: https://help.puppet.com/core/current/Content/PuppetCore/modules_command_reference.htm
- Puppet Core resource syntax reference: https://help.puppet.com/core/current/Content/PuppetCore/lang_resource_syntax.htm
- PDK validating and testing modules: https://help.puppet.com/pdk/current/topics/pdk_testing.htm
- `puppetlabs/firewall` module documentation: https://github.com/puppetlabs/puppetlabs-firewall
- Puppet Forge page for `puppetlabs/firewall`: https://forge.puppet.com/modules/puppetlabs/firewall
- `puppet-augeasproviders_sysctl` documentation: https://github.com/voxpupuli/puppet-augeasproviders_sysctl
- Puppet Forge page for `puppet/augeasproviders_sysctl`: https://forge.puppet.com/modules/puppet/augeasproviders_sysctl
- Puppet Forge API entry for deprecated `herculesteam/augeasproviders_sysctl`: https://forgeapi.puppet.com/v3/modules/herculesteam-augeasproviders_sysctl
- `puppet-network` documentation: https://github.com/voxpupuli/puppet-network
- Puppet Forge page for `puppet/network`: https://forge.puppet.com/modules/puppet/network
- Debian `interfaces(5)` man page: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html

## Issues Found
1. The post referenced the deprecated Forge slug `herculesteam/augeasproviders_sysctl`. I updated the module table and install command to the current `puppet/augeasproviders_sysctl` module, which supersedes the old one.
2. The `augeasproviders_sysctl` example mixed in `include sysctl::base`, which belongs to `saz/sysctl`, not `augeasproviders_sysctl`. I removed that include so the example matches the module actually discussed.
3. The `puppetlabs/firewall` example used the older `provider` and `action` attributes. Current module documentation uses `protocol` and `jump`, so I updated every firewall rule accordingly and replaced the non-portable `ip6tables` service example with `class { 'firewall': }`, which is what the module docs recommend for package setup.
4. The `puppet/network` example used `network::interface`, but the module's current custom type is `network_config`. I replaced the example with a valid `network_config` IPv6 stanza using `family => 'inet6'` and a gateway option.
5. The router profile redeclared `sysctl { 'net.ipv6.conf.all.forwarding': ... }`, which would create a duplicate resource declaration. I parameterized the `profile::ipv6::sysctl` and `profile::ipv6::base` classes instead so forwarding can be set cleanly for router nodes.
6. The command comments at the end were imprecise. `puppet agent --test --verbose` runs on the node where it is invoked, so I changed that comment, and I updated the `puppet module upgrade` comment to reflect that it upgrades the module rather than merely checking its version.

## Review Notes
- `puppet/network` uses custom types (`network_config` and `network_route`). Depending on your Puppet version and deployment model, you may need pluginsync or generated types enabled for those resources to load correctly.
- For Debian/Ubuntu `ifupdown`, the static IPv6 example using `address`, `netmask 64`, and `gateway` is consistent with `interfaces(5)`.
- `puppetlabs/firewall` still documents `protocol => 'ip6tables'` as valid input even though newer releases also accept `IPv6`.
- `puppet` and `pdk` were not installed in this workspace, so validation was performed against official documentation, Forge metadata, and module source rather than local command execution.
