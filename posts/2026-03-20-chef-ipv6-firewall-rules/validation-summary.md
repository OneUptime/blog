# Validation Summary: How to Automate IPv6 Firewall Rules with Chef

## Status
validated

## Post Type
Guide

## Technologies Covered
- Chef Infra
- Chef `firewall` cookbook
- Berkshelf
- IPv6
- `ip6tables` / netfilter
- Chef InSpec

## Sources Consulted
- Chef Supermarket `firewall` cookbook v7.0.0: https://supermarket.chef.io/cookbooks/firewall/versions/7.0.0
- Chef custom resource guide: https://docs.chef.io/client/18/resources/custom/
- Chef custom resource glossary: https://docs.chef.io/client/19.1/resources/custom/custom_resource_glossary/
- Chef InSpec profile controls: https://docs.chef.io/inspec/6.8/profiles/controls/
- Chef Workstation Berkshelf docs: https://docs.chef.io/workstation/25/tools/berkshelf/
- `iptables-restore(8)` / `ip6tables-restore(8)`: https://man7.org/linux/man-pages/man8/iptables-restore.8.html
- `iptables-extensions(8)`: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `ip6tables(8)`: https://www.man7.org/linux/man-pages/man8/ip6tables.8.html
- Debian `netfilter-persistent(8)` manpage: https://manpages.debian.org/unstable/netfilter-persistent/netfilter-persistent.8.en.html
- Debian `iptables-persistent` packaging source: https://salsa.debian.org/debian/iptables-persistent
- RFC 4861: https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 4890: https://www.rfc-editor.org/rfc/rfc4890.html

## Issues Found
- The post pinned `firewall` cookbook `~> 2.7`, which is outdated relative to the current Supermarket release. Updated the example to `~> 7.0`.
- The base recipe used `firewall 'default'` with action `:save`, which is not a current `firewall` resource action. Reworked the example to use `include_recipe 'firewall'` and set the `iptables` solution explicitly.
- The original examples did not force the `iptables` provider, even though Debian/Ubuntu and RHEL-family systems default to `ufw` or `firewalld` in the cookbook. Added `node.default['firewall']['solution'] = 'iptables'`.
- The examples manually defined established and ICMP rules while also relying on cookbook defaults that already create related iptables/IPv6 rules. Disabled the cookbook's default established rule in the example so the explicit rules are not duplicated.
- `protocol :icmpv6` in `firewall_rule` did not match the cookbook's documented protocol values. Updated the example to use `protocol :icmp` for the cookbook resource.
- Several `position` values (`100`, `101`, `9999`) were outside the cookbook's documented valid range. Adjusted them to valid values below `100`.
- The database subnet `2001:db8:app::/48` was not a valid IPv6 prefix because `app` is not hexadecimal. Replaced it with a valid documentation prefix.
- The custom resource used deprecated `resource_name` syntax and overly narrow property types. Removed `resource_name`, widened `port` and `protocol` types to match current docs, and fixed the default `position`.
- The attribute-driven example forced `protocol` through `to_sym`, which would break integer protocol values even though the cookbook accepts protocol numbers. Normalized only string values.
- The direct `ip6tables` recipe used obsolete `-m state`, wrote to `/etc/ip6tables.rules`, and reloaded via shell redirection. Updated it to use `conntrack`, Debian's persistent `rules.v6` path, and `netfilter-persistent reload`.
- The direct recipe also hard-coded SSH and ignored rule source prefixes from attributes. Updated the generated rules to include configured sources and rely on the attribute-driven rule list.
- The InSpec example was not laid out as a valid InSpec profile control and tested a `netfilter-persistent` service as if `ip6tables` were a long-running daemon. Replaced it with a valid control under `controls/` that inspects the actual installed rules.

## Review Notes
- Berkshelf commands in the post remain valid, but Chef's current Workstation docs say Berkshelf is no longer under active development and recommend Policyfiles for new workflows.
- The direct `iptables-persistent` example is Debian/Ubuntu-specific. Systems that default to `firewalld`, `ufw`, or `nftables` will need different persistence and reload mechanisms.
- On modern Linux distributions, `ip6tables` may be backed by the nftables compatibility layer even when the CLI remains `ip6tables`.
- No live Chef converge or InSpec run was performed in this repository; the review was based on official documentation and authoritative upstream sources.
