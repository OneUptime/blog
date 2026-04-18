# Validation Summary: How to Configure Wazuh for IPv6 Security Monitoring

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Wazuh Manager 4.x (SIEM / HIDS / XDR)
- Wazuh Agent and `agent-auth` enrollment
- Wazuh decoders (XML) and rules (XML)
- IPv6 addressing (RFC 3849 documentation prefix `2001:db8::/32`)
- ip6tables / Linux kernel firewall logs
- OpenSSH log patterns
- nginx access log patterns
- systemd service management (`systemctl`)
- MITRE ATT&CK reference (T1110)

## Sources Consulted
- Wazuh `remote` block reference: https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/remote.html
- Wazuh `client` block reference: https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/client.html
- `verify-agent-conf` tool reference: https://documentation.wazuh.com/current/user-manual/reference/tools/verify-agent-conf.html
- `agent-auth` tool reference: https://documentation.wazuh.com/current/user-manual/reference/tools/agent-auth.html
- Wazuh ruleset (SSH rules `0095-sshd_rules.xml`, PAM rules `0085-pam_rules.xml`) in the `wazuh/wazuh` GitHub repository
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation)
- RFC 5952 (A Recommendation for IPv6 Address Text Representation)

## Issues Found

1. **Missing `<ipv6>yes</ipv6>` in `<remote>` blocks.** Wazuh's manager does NOT listen on IPv6 by default even when `local_ip` is unset — the `<ipv6>` option must be explicitly set to `yes` inside each `<remote>` block to enable IPv6 listening (default is `no`). Added `<ipv6>yes</ipv6>` to both the secure-agent and syslog `<remote>` blocks, and removed the misleading comment stating that leaving `ip` empty is sufficient.

2. **Invalid IPv6 address literal `2001:db8::wazuh-manager`.** The string `wazuh-manager` is not valid hexadecimal, so this is not a syntactically valid IPv6 address. An address-literal must consist of hex groups separated by `:`. Replaced all occurrences (agent `<address>` example and `agent-auth -m` argument) with `2001:db8::10`, a valid RFC 3849 documentation address.

3. **Invalid `-a` flag on `verify-agent-conf`.** Per the official tool reference, `verify-agent-conf` only accepts `[-f <agent.conf file>]`; there is no `-a` flag, and the command verifies XML syntax of shared `agent.conf` files — it does not check agent connectivity. Removed the invalid flag and updated the comment to accurately describe what the command does.

## Review Notes
- Rule IDs used (`5760` for sshd auth failed, `5501` for PAM login session opened) were verified against the upstream Wazuh ruleset and are correct.
- The `agent-auth -m` flag for manager address is correct. For link-local IPv6 addresses (e.g. `fe80::/10`), the agent also requires `<interface_index>` in the `<server>` block and `agent-auth -n <iface>`, but this is out of scope for the global-address example used here.
- The Wazuh `<client>` block does not have an `<ipv6>` option — IPv6 is activated simply by placing an IPv6 literal in `<address>`, which the post does correctly.
- The `2001:db8::/32` prefix used in `allowed-ips` and rule examples is the correct IANA-reserved documentation prefix.
- The nginx IPv6 decoder regex `^([0-9a-fA-F:]{3,39})` covers the full IPv6 textual length range (minimum `::` plus potential port-less formats, up to the 39-char maximum), which is appropriate.
- The `ip6tables` and sshd decoder regexes match the canonical kernel and OpenSSH log line formats.
- The post mentions Wazuh 4.x repositories; as of the review date, Wazuh 4.x is current and the repo URL and package name (`wazuh-manager`) are accurate.
