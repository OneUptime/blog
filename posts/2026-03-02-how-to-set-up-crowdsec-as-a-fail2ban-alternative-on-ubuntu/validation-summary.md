# Validation Summary: How to Set Up CrowdSec as a Fail2Ban Alternative on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CrowdSec (agent, LAPI, cscli)
- CrowdSec firewall bouncer (iptables/nftables, ipset)
- CrowdSec nginx bouncer (Lua)
- CrowdSec Console / CAPI (community threat intelligence)
- Collections, parsers, scenarios (leaky buckets)
- Ubuntu / apt / systemd
- Prometheus metrics

## Sources Consulted
- CrowdSec documentation: https://doc.crowdsec.net
- cscli reference: https://docs.crowdsec.net/docs/cscli/
- cscli dashboard deprecation notice: https://docs.crowdsec.net/blog/cscli_dashboard_deprecation/
- Firewall bouncer docs: https://docs.crowdsec.net/u/bouncers/firewall/
- cs-firewall-bouncer default config: https://github.com/crowdsecurity/cs-firewall-bouncer/blob/main/config/crowdsec-firewall-bouncer.yaml
- Nginx bouncer docs: https://docs.crowdsec.net/u/bouncers/nginx/
- Whitelists guide: https://docs.crowdsec.net/u/getting_started/post_installation/whitelists/
- cscli explain: https://docs.crowdsec.net/u/user_guides/cscli_explain/
- Packagecloud repo: https://packagecloud.io/crowdsec/crowdsec

## Issues Found

1. **Dashboard section referenced a nonexistent package and command.**
   The post recommended `sudo apt-get install -y crowdsec-dashboard` and `sudo crowdsec-setup-metabase`. Neither the `crowdsec-dashboard` package nor the `crowdsec-setup-metabase` command exists. The built-in Metabase integration was previously surfaced via `cscli dashboard setup` (Docker-based), which was deprecated in CrowdSec 1.6 and removed in 1.7.0. Replaced the snippet with the correct enrollment command for the hosted Console and a note pointing users to Prometheus + Grafana for self-hosted dashboards.

2. **Firewall bouncer troubleshooting used the ipset name as if it were an iptables chain.**
   The post showed `sudo iptables -L crowdsec-blacklists -n | head -20`, but `crowdsec-blacklists` is the default *ipset* created by `crowdsec-firewall-bouncer-iptables`, not an iptables chain. The bouncer adds rules to existing chains (INPUT/FORWARD) that reference the ipset via `match-set`. Replaced with `sudo ipset list crowdsec-blacklists | head -20` plus a follow-up `sudo iptables -L INPUT -n | grep crowdsec` to verify the rules reference the ipset.

## Review Notes
- The packagecloud install URL is still valid; CrowdSec also publishes a shorter `curl -s https://install.crowdsec.net | sudo sh` redirect for the same script.
- The whitelist path `/etc/crowdsec/parsers/s02-enrich/` and the nginx bouncer Lua path `/usr/lib/x86_64-linux-gnu/crowdsec/lua/` are correct on Debian/Ubuntu x86_64.
- The CAPI origin filter (`--origin CAPI`) is correct for community-sourced decisions. Decisions sourced from third-party blocklists distributed through the Console may appear with `lists:<name>` origins instead — worth being aware of when triaging.
- The custom scenario example uses expr-lang infix `startsWith` and `in` operators, which are valid in CrowdSec's filter expressions.
- The acquisition YAML uses multi-document `---` separators appended to `acquis.yaml`; correct, but readers should ensure the existing file ends with a newline so the first `---` is recognized as a document boundary.
- For new installs in 2026, recommend Console enrollment over local Metabase regardless — the latter is fully gone in 1.7+.
