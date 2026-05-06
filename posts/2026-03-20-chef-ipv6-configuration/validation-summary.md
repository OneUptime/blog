# Validation Summary: How to Configure IPv6 with Chef

## Status
validated

## Post Type
Guide

## Technologies Covered
- Chef Infra
- Chef cookbooks and recipes
- Chef templates and roles
- Chef `knife` CLI
- Linux IPv6 sysctl settings
- Netplan
- iptables/ip6tables via the Chef `firewall` cookbook

## Sources Consulted
- Chef Infra `sysctl` resource: https://docs.chef.io/client/19/resources/bundled/sysctl/
- Cookstyle `Chef/Modernize/SysctlParamResource`: https://docs.chef.io/workstation/cookstyle/cops/chef_modernize_sysctlparamresource/
- Chef templates documentation: https://docs.chef.io/templates/
- Chef `knife node` documentation: https://docs.chef.io/workstation/knife_node/
- Chef `knife cookbook` documentation: https://docs.chef.io/workstation/26/tools/knife/knife_cookbook/
- Chef `knife role` documentation: https://docs.chef.io/workstation/25/tools/knife/knife_role/
- Chef roles JSON format: https://docs.chef.io/client/19.1/policy/roles/
- Linux kernel IPv6 sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- Netplan YAML reference: https://canonical-netplan.readthedocs-hosted.com/en/stable/netplan-yaml/
- Chef Supermarket `firewall` cookbook docs: https://supermarket.chef.io/cookbooks/firewall/versions/7.0.2
- `firewall` cookbook source reviewed for current protocol handling: https://github.com/sous-chefs/firewall

## Issues Found
- The post used `sysctl_param`, which Chef documents as renamed to `sysctl` in Chef Infra Client 14+. I replaced the deprecated resource name with `sysctl`.
- The `sysctl` recipe mixed per-key `sysctl` management with a full templated `/etc/sysctl.d` file in the same example, which would duplicate the same settings. I made the recipe use the built-in `sysctl` resources consistently and kept the ERB file as an explicit alternative template example.
- The main recipe referenced `privacy` and `routing` recipes that were not defined anywhere else in the post. I removed those includes and made the shown `sysctl` recipe self-contained for forwarding and privacy-address settings.
- The cookbook structure showed template files in `templates/` directly, but Chef template resolution expects files under `templates/default/` for this usage. I corrected the structure and the template path comment.
- The post used the `firewall` cookbook but never told readers to declare the dependency. I added the required `depends 'firewall'` note for `metadata.rb`.
- The firewall example claimed an iptables-style IPv6 rule set without actually selecting the iptables provider, even though Ubuntu/Debian default to UFW in the current cookbook docs. I added `default['firewall']['solution'] = 'iptables'` so the recipe matches the documented provider behavior.
- The Chef role JSON example was incomplete for a role file intended for `knife role from file`. I added `json_class`, `chef_type`, and `override_attributes`, and removed the non-JSON comment line from the code block.
- The apply section uploaded the cookbook but not the role itself. I added `knife role from file roles/ipv6-web-server.json` before assigning the role to the node.
- The cookbook upload example did not account for cookbook dependencies. I changed it to `knife cookbook upload ipv6_config --include-dependencies`.
- The sysctl template used `node['chef_environment']`; Chef’s template examples document `node.chef_environment`. I updated that usage and aligned the template with the sysctl values shown elsewhere in the post.

## Review Notes
- `accept_ra = 1` is correct for a normal host, but Linux requires `accept_ra = 2` if IPv6 forwarding is enabled and the system must still accept Router Advertisements. The post now notes that caveat inline.
- The Netplan recipe references a template file but the article does not show the actual `netplan-ipv6.yaml.erb` contents. If that template is added later, modern Netplan guidance prefers `routes:` for default IPv6 routes over deprecated `gateway6`.
