# Validation Summary: How to Monitor IPsec IPv6 Tunnel Status

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- strongSwan (`swanctl`, VICI socket)
- Linux kernel XFRM (`ip xfrm`)
- Prometheus (alert rules, IPsec exporters)
- Bash shell scripting
- SNMP (net-snmp)
- Nagios/Icinga plugin protocol
- IPv6 / IPsec (IKEv2, ESP, CHILD SA)

## Sources Consulted
- [swanctl --initiate :: strongSwan Documentation](https://docs.strongswan.org/docs/latest/swanctl/swanctlInitiate.html)
- [swanctl Tool :: strongSwan Documentation](https://docs.strongswan.org/docs/latest/swanctl/swanctl.html)
- [vici Plugin :: strongSwan Documentation](https://docs.strongswan.org/docs/latest/plugins/vici.html)
- [strongSwan Plugin List](https://docs.strongswan.org/docs/latest/plugins/plugins.html)
- [strongswan-plugin-ipseckey package (Ubuntu)](https://launchpad.net/ubuntu/xenial/+package/strongswan-plugin-ipseckey)
- [strongSwan mailing list: SNMP feature](https://dev.strongswan.narkive.com/EUWo9Vdk/strongswan-snmp-feature) — confirms strongSwan has no plans for native SNMP support
- [sergeymakinen/ipsec_exporter](https://github.com/sergeymakinen/ipsec_exporter) — Prometheus exporter, source of metric names used
- [torilabs/ipsec-prometheus-exporter](https://github.com/torilabs/ipsec-prometheus-exporter) — recommended replacement for the deprecated `dennisstritzke/ipsec_exporter`
- [dennisstritzke/ipsec_exporter](https://github.com/dennisstritzke/ipsec_exporter) — confirmed deprecated
- net-snmp `extend` directive (snmpd.conf) for the corrected SNMP example

## Issues Found

1. **Overview claimed strongSwan provides a built-in REST API.** It does not — the daemon's IPC is the binary VICI protocol on a Unix socket. Replaced "and a REST API" with a reference to the VICI socket.

2. **`swanctl --initiate child:$TUNNEL_NAME` used wrong argument syntax.** The correct invocation is `swanctl --initiate --child <name>`; the `child:` prefix is not a flag form supported by `swanctl`. Fixed to `swanctl --initiate --child "$TUNNEL_NAME"`.

3. **Prometheus exporter section was wrong on multiple counts:**
   - `pip install prometheus-ipsec-exporter` — no such Python package on PyPI.
   - The Docker image `ghcr.io/dennisstritzke/ipsec-exporter` belongs to a project the maintainer has explicitly marked as deprecated (and the project only exposes a single `ipsec_status` metric, not the list shown).
   - The metric names listed (`ipsec_ikesa_established`, `ipsec_childsa_installed`, `ipsec_bytes_in_total`, etc.) do not match any of the real exporters.
   
   Replaced with `sergeymakinen/ipsec_exporter` (actively maintained, VICI-based) and updated the metric list to match the names that exporter actually exposes (`ipsec_up`, `ipsec_ike_sas`, `ipsec_ike_sa_state`, `ipsec_child_sa_bytes_in/out`, etc.).

4. **Prometheus alert rules referenced non-existent metrics.** Updated `ipsec_ikesa_established == 0` to `ipsec_ike_sas == 0`, and `ipsec_bytes_out_total` to `ipsec_child_sa_bytes_out`, matching the corrected exporter.

5. **SNMP section was fundamentally incorrect:**
   - Claim "strongSwan supports SNMP via the ipsec-snmp plugin" is false; no such plugin exists in strongSwan and the project has stated it has no plans to add native SNMP support.
   - The install command `apt install strongswan-plugin-ipseckey` installs the IPSECKEY plugin, which performs **DNSSEC-based IPSECKEY RR authentication** — completely unrelated to SNMP.
   - The configuration block `ipsec-snmp { ... }` does not correspond to any real strongSwan plugin file format.
   - The OID `.1.3.6.1.4.1.3317.1.2.7` and `IPSEC-MIB::ikeSaState.1` are not part of any MIB strongSwan implements (there is no standardized IKEv2 SNMP MIB).
   
   Rewrote the section to use the standard net-snmp `extend` directive to expose `swanctl --list-sas` output through SNMP, which is the actual common pattern for SNMP-based strongSwan monitoring.

6. **Summary** was updated to reference the corrected exporter name and metric (`ipsec_ike_sas == 0`).

## Review Notes
- `ping6` is being phased out on modern distributions in favor of `ping -6` (or plain `ping` with an IPv6 target). It still works on virtually every current Linux distro because it is typically a symlink to `ping`, so the script remains correct, but readers on minimal images (Alpine BusyBox, some container distros) may need to substitute `ping -6`.
- The bash script uses `swanctl --list-sas | grep -c ESTABLISHED`, which counts all established IKE SAs across all tunnels rather than checking a specific tunnel. For a host running a single tunnel this is fine, but for multi-tunnel gateways the check should filter by `$TUNNEL_NAME`. Left as-is — it matches the author's stated intent of a basic up/down check, and tightening the grep would be a stylistic change rather than a correctness fix.
- `swanctl --initiate` is asynchronous; the script does not wait for the new SA to come up before exiting. Acceptable for an alerting cron, just worth noting for readers who expect synchronous behavior.
- The example sample output for `swanctl --list-sas` shows `rekeying in 1s, expires in 2s` — these are illustrative timer values for an example, not a problem.
