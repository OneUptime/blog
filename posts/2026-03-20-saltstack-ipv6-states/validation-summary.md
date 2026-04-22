# Validation Summary: How to Deploy IPv6 Configuration with SaltStack States

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- SaltStack / Salt states
- Salt pillars and grains
- Jinja2 templating in Salt SLS files
- Linux IPv6 sysctl configuration
- ip6tables firewall rules
- Salt orchestration runners and execution modules

## Sources Consulted
- Salt Project grains documentation: https://docs.saltproject.io/en/latest/topics/grains/index.html
- Salt Project Jinja documentation: https://docs.saltproject.io/en/latest/topics/jinja/index.html
- Salt Project cmd state documentation: https://docs.saltproject.io/en/3007/ref/states/all/salt.states.cmd.html
- Salt Project saltmod/orchestration state documentation: https://docs.saltproject.io/en/3007/ref/states/all/salt.states.saltmod.html
- Salt Project network execution module documentation: https://docs.saltproject.io/en/3007/ref/modules/all/salt.modules.network.html
- Salt Project linux_sysctl execution module documentation: https://docs.saltproject.io/en/3007/ref/modules/all/salt.modules.linux_sysctl.html
- Salt Project jobs runner documentation: https://docs.saltproject.io/en/latest/ref/runners/all/salt.runners.jobs.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 3849, IPv6 documentation prefix: https://www.rfc-editor.org/rfc/rfc3849.html
- Local command help for `sysctl -h` and `ip6tables --help`

## Issues Found
- The top file referenced `ipv6.webserver` and `ipv6.router`, but the post only defined `ipv6.sysctl` and `ipv6.firewall`. Updated the top file to target the SLS files shown in the article.
- The pillar top file used `hostname:webserver01`, which is not a standard core grain key for ordinary minions. Changed it to `host:webserver01`.
- The example address `2001:db8::web01/64` was not a valid IPv6 address because `web01` is not hexadecimal. Changed it to `2001:db8::10/64`, retaining the RFC 3849 documentation prefix.
- The sysctl reload state used `cmd.wait` with `watch`; current Salt documentation recommends `cmd.run` with `onchanges`. Updated the state accordingly.
- The `ip6tables-save` state used `require`, which would run on every highstate and did not require the loopback/ICMPv6 states. Changed it to `onchanges` and included the relevant rule states.
- The orchestration examples targeted `sls: ipv6`, but no `ipv6/init.sls` was shown. Updated the orchestration to run `ipv6.sysctl` and `ipv6.firewall`.
- The job monitoring command searched for `state.apply`, while the orchestration `salt.state` examples with `sls` run SLS states. Updated it to search for `state.sls`.
- The IPv6 address verification command used `network.ip_addrs version=6`; Salt exposes IPv6 addresses through `network.ip_addrs6`. Updated the command.
- The IPv6 ping command passed `family=inet6`, which is not a supported keyword for Salt's `network.ping`. Removed it and used the documented `return_boolean=True` option with an IPv6 literal.

## Review Notes
The reviewed examples are Linux-oriented because they use Linux IPv6 sysctls and ip6tables. The firewall rules file path and restoration mechanism can vary by distribution, so a production rollout should pair `ip6tables-save` with the platform's persistent firewall service.
