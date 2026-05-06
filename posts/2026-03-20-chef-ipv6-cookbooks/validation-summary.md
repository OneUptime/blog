# Validation Summary: How to Deploy IPv6 Configuration with Chef Cookbooks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Chef Infra Client
- Chef Supermarket cookbooks
- Chef Workstation
- Berkshelf
- Test Kitchen
- Chef InSpec
- `firewall` cookbook
- `network_interfaces_v2` cookbook
- `os-hardening` cookbook
- Linux IPv6 sysctl and iptables/ip6tables

## Sources Consulted
- Chef Infra `sysctl` resource docs: https://docs.chef.io/resources/sysctl/
- Cookstyle modernization note for `sysctl_param` -> `sysctl`: https://docs.chef.io/workstation/cookstyle/cops/chef_modernize_sysctlparamresource/
- Berkshelf docs: https://docs.chef.io/workstation/25/tools/berkshelf/
- Test Kitchen CLI docs: https://docs.chef.io/workstation/ctl_kitchen/
- Chef InSpec `kernel_parameter` resource docs: https://docs.chef.io/inspec/resources/kernel_parameter/
- Chef InSpec `ip6tables` resource docs: https://docs.chef.io/inspec/5.23/resources/core/ip6tables/
- `firewall` cookbook README and Supermarket entry: https://github.com/sous-chefs/firewall/blob/main/README.md
- `network_interfaces_v2` cookbook README and Supermarket entry: https://github.com/target/network_interfaces_v2-cookbook/blob/master/README.md
- `os-hardening` Supermarket entry: https://supermarket.chef.io/cookbooks/os-hardening/versions/4.0.0
- Linux kernel IPv6 sysctl reference: https://docs.kernel.org/6.1/networking/ip-sysctl.html

## Issues Found
- The post treated the deprecated `sysctl` cookbook and `sysctl_param` resource as current guidance. I updated the post to use Chef Infra's built-in `sysctl` resource, which replaced `sysctl_param` in Chef 14.
- The Berksfile pinned old cookbook versions. I updated the cookbook constraints to current maintained versions and added a note that current Chef docs prefer Policyfiles even though Berkshelf still works.
- The firewall example implied generic IPv6 support without selecting the iptables backend. I updated it to set `node['firewall']['solution'] = 'iptables'`, because current cookbook docs make IPv6 handling iptables-specific.
- The firewall snippet used rules that would not behave as intended with current defaults: loopback and established rules were missing `protocol :none`, the example redundantly installed the firewall twice, and it used an unnecessary catch-all deny rule. I corrected those behaviors to match the documented cookbook pattern and current iptables defaults.
- The `network_interfaces_v2` example used undocumented properties (`target_device`, `ipaddress`) and a shell-command workaround for IPv6. I replaced it with the documented `device`, `ipv6`, `address`, `netmask`, and `gateway` properties.
- The wrapper cookbook example referenced deprecated or unsupported settings (`node['sysctl']['conf_dir']`, `log_denied_packets`, `action [:install, :save]`). I removed those and aligned the wrapper example with the current built-in `sysctl` resource and current `firewall` cookbook behavior.
- The test snippet called an address-listing command a connectivity test. I corrected it to check for a global IPv6 address and updated the firewall assertion to inspect `ip6tables -S INPUT`, which maps better to actual rule syntax.

## Review Notes
- `network_interfaces_v2` is archived and documented for older platform targets, so the post is most accurate when read as guidance for legacy Ubuntu/RHEL-style interface management rather than modern NetworkManager or netplan-based systems.
- Berkshelf remains usable, but Chef's current documentation recommends Policyfiles for dependency resolution and promotion workflows.
- If a deployment enables IPv6 forwarding and still needs Router Advertisements, Linux requires `net.ipv6.conf.*.accept_ra = 2`; the post's example keeps the simpler host-oriented `accept_ra = 1` setting.
