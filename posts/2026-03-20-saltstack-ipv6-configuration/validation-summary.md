# Validation Summary: How to Configure IPv6 with SaltStack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SaltStack / Salt states
- Salt pillar data
- Salt grains and targeting
- Linux IPv6 sysctl settings
- ip6tables / iptables
- iproute2 `ip` commands

## Sources Consulted
- Salt Project docs: Include and Exclude - https://docs.saltproject.io/en/master/ref/states/include.html
- Salt Project docs: Pillar Walkthrough - https://docs.saltproject.io/en/3007/topics/tutorials/pillar.html
- Salt Project docs: State Testing - https://docs.saltproject.io/en/master/ref/states/testing.html
- Salt Project docs: `salt` CLI target selection - https://docs.saltproject.io/en/latest/ref/cli/salt.html
- Salt Project docs: Targeting using Grains - https://docs.saltproject.io/en/latest/topics/targeting/grains.html
- Salt Project docs: Core grains - https://docs.saltproject.io/en/latest/ref/grains/all/salt.grains.core.html
- Salt Project docs: `cmd.run` state - https://docs.saltproject.io/en/master/ref/states/all/salt.states.cmd.html
- Salt Project docs: State requisites - https://docs.saltproject.io/en/3007/ref/states/requisites.html
- Salt Project docs: `file.managed` state - https://docs.saltproject.io/en/latest/ref/states/all/salt.states.file.html
- Linux kernel docs: IP sysctl - https://docs.kernel.org/6.18/networking/ip-sysctl.html
- iptables man pages: `iptables`, `ip6tables`, `iptables-save`, and extensions - https://man7.org/linux/man-pages/man8/iptables.8.html, https://man7.org/linux/man-pages/man8/iptables-save.8.html, https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- iproute2 man pages: `ip-address` and `ip-route` - https://manpages.debian.org/testing/iproute2/ip-address.8.en.html, https://manpages.opensuse.org/Leap-16.0/iproute2/ip-route.8.en.html

## Issues Found
- The file tree showed pillar data under `/srv/salt/pillar`, but the example path and Salt defaults use `/srv/pillar`. Updated the tree to show separate `/srv/salt` and `/srv/pillar` roots.
- The pillar example omitted `/srv/pillar/top.sls`, which is needed for Salt to include `/srv/pillar/ipv6.sls` in normal pillar compilation. Added the minimal top file mapping.
- The main `init.sls` included `ipv6.privacy`, but no `privacy.sls` state was defined and privacy sysctls were already handled in `sysctl.sls`. Removed the undefined include.
- The main `init.sls` did not include `ipv6.interfaces`, so `state.apply ipv6` would not apply the interface state shown later in the post. Added `ipv6.interfaces` to the include list.
- The firewall commands could run without an explicit dependency on the `iptables` package state, and the save step only required the ICMPv6 rule. Added requisites so the package is installed before rule commands and `ip6tables-save` waits on all rule states.
- The grain target `salt -G 'ipv6:true' state.apply ipv6` treated the `ipv6` grain as a boolean. Salt's core `ipv6` grain is a list of IPv6 addresses, so the target was changed to `salt -G 'ipv6:*' state.apply ipv6`.

## Review Notes
- The sysctl keys, `sysctl --system`, `state.apply ... test=True`, command-line pillar override syntax, `ip6tables` rule syntax, `ip6tables-save`, and `ip -6 addr` / `ip -6 route` examples were checked and are technically valid.
- The `ip -6 addr add` and `ip -6 route add` examples configure runtime kernel state. A production formula may need distro-specific persistent network configuration if those settings must survive reboot.
