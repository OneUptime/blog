# Validation Summary: How to Validate IPv6 Configuration Drift with Configuration Management

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6 sysctl parameters (use_tempaddr, forwarding, disable_ipv6)
- Puppet (agent, PuppetDB PQL queries)
- Chef / Chef InSpec (kernel_parameter resource, compliance controls)
- SaltStack (sysctl.get, state.apply, reactor system)
- ip6tables
- Prometheus / PromQL

## Sources Consulted
- Linux kernel IPv6 documentation (ip-sysctl.txt) for `use_tempaddr`, `forwarding`, `disable_ipv6` semantics
- Puppet agent documentation for `--test` and `--noop` flag behavior
- PuppetDB / PQL documentation for `resources` and `events` query syntax
- Chef InSpec documentation for `kernel_parameter`, `command`, `describe`/`its` DSL and reporter syntax
- Chef client documentation (`chef-client --once`) and knife ssh reference
- SaltStack documentation for `sysctl.get`, `state.apply`, `test=True`, `--async`, and reactor system (`local.state.apply` + `tgt`/`arg`)
- Prometheus PromQL reference for `sum()` / `count()` aggregation

## Issues Found
No technical issues found. All commands, flags, resource names, and configuration snippets match current documentation:

- `use_tempaddr = 2` correctly denotes "prefer temporary (privacy) addresses"
- `puppet agent --test --noop` is the standard drift-detection invocation
- PuppetDB PQL syntax (`resources[certname, title] { ... }` and `events[...]`) is valid
- InSpec `kernel_parameter('...')` with `its('value') { should eq N }` is the canonical pattern
- `inspec exec <profile> --target ssh://user@host --reporter json:path html:path` is correct multi-reporter syntax
- `chef-client --once` is a valid flag (run once, don't daemonize)
- `knife ssh 'name:*' 'sudo chef-client'` uses valid search-based targeting
- Salt reactor `local.state.apply` with `tgt` and `arg` keys is correct
- `salt '*' state.apply ipv6 test=True` and `--async` are both valid

## Review Notes
- The Prometheus metric names `inspec_control_pass` / `inspec_control_fail` are illustrative and would require a custom InSpec-to-Prometheus exporter; the PromQL itself is syntactically correct.
- The `grep ' 0$'` filter for drifted minions relies on Salt's default YAML-like output formatting (value indented on its own line), which holds for the default outputter.
- Puppet's default 30-minute agent run interval is configurable via `runinterval`; the default is accurate at the time of writing.
- The ICMPv6 regex `/ACCEPT.*ipv6-icmp/` depends on `ip6tables -L` output formatting and may need adjustment if nftables or a different output format is in use.
