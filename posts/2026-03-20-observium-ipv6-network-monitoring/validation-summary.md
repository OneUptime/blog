# Validation Summary: How to Configure Observium for IPv6 Network Monitoring

## Status
validated

## Post Type
Tutorial / Step-by-step configuration guide

## Technologies Covered
- Observium (network monitoring platform)
- IPv6
- SNMP (v2c and v3)
- net-snmp CLI tools (`snmpget`)
- BGP monitoring
- CDP / LLDP (xDP) auto-discovery
- PHP configuration files

## Sources Consulted
- Observium "Add Device" documentation: https://docs.observium.org/add_device/
- Observium Autodiscovery documentation: https://docs.observium.org/autodiscovery/
- Observium Discovery documentation: https://docs.observium.org/discovery/
- Observium Poller documentation: https://docs.observium.org/poller/
- Observium Configuration Options: https://docs.observium.org/config_options/
- Observium Alert Checker documentation: https://docs.observium.org/alert_checker/
- Net-SNMP `snmpcmd` man page: http://www.net-snmp.org/docs/man/snmpcmd.html

## Issues Found
Several technical inaccuracies were corrected:

1. **`$config['ipv6'] = true;` (Step 1) - Removed.** No such top-level setting exists in Observium. IPv6 support is provided out of the box via `$config['snmp']['transports']`, which already includes `udp6`/`tcp6`. Replaced with a clarifying comment.

2. **`addhost.php` script name and argument order (Step 2) - Fixed.** The script is `add_device.php`, not `addhost.php`, in current Observium versions. The documented argument order is `<hostname> [community] [v1|v2c] [port] [transport]`, not `hostname version community port transport`. The example also used `udp` for an IPv6 host - corrected to `udp6`. New command: `./add_device.php 2001:db8::router1 public v2c 161 udp6`.

3. **Autodiscovery config key (Step 3) - Fixed.** The correct key is `$config['autodiscovery']['ip_nets'][]`, not `$config['autodiscovery']['networks'][]`.

4. **`discovery.php -n <network>` (Step 3) - Fixed.** The `-n` flag in `discovery.php` is the instance number for distributed discovery (paired with `-i`), not a CIDR range. CIDR scanning is driven by the `ip_nets` configuration plus `-h all`/`-h new`. Replaced the incorrect example with `./discovery.php -h new`.

5. **`./poller.php -h ... -m routes` (Step 6) - Fixed.** There is no documented Observium poller module called `routes`. Routing-table data is collected during the normal polling cycle. Replaced the bash block with a UI-navigation reference.

6. **BGP module enablement (Step 7) - Fixed.** `$config['poller_modules']['bgp-peers']` is not the documented setting. The correct global toggle is `$config['enable_bgp'] = 1;`. The poller should then be re-run with the standard `./poller.php -h <host>` (no `-m bgp-peers` flag, which was also fabricated).

7. **`$config['alerts']['email_down']` (Step 8) - Fixed.** This config key does not exist. Email transport is enabled via `$config['email']['enable'] = 1` (added) plus the existing SMTP keys. Device-down alerts are configured in the web UI through the Alert Checker system, not a single PHP flag. Replaced with the correct flag plus a paragraph describing the Alert Checker workflow.

8. **`snmpget -v2c -c public "[2001:db8::router1]" sysDescr.0` (Verify section) - Fixed.** Net-SNMP's documented IPv6 syntax requires the transport prefix: `udp6:[<addr>]:<port>`. Updated the command to `snmpget -v2c -c public udp6:[2001:db8::router1]:161 sysDescr.0` and added a comment explaining the requirement.

## Review Notes
- The SNMPv3 configuration keys (`authlevel`, `authname`, `authpass`, `authalgo`, `cryptopass`, `cryptoalgo`) and the `$config['autodiscovery']['xdp']` key are documented and correct.
- The `2001:db8::/32` and `fd00::/8` ranges used as examples are appropriate (RFC 3849 documentation prefix and RFC 4193 ULA prefix respectively).
- Observium's open Community Edition does not currently receive new feature releases; readers running the Professional edition will see UI menu paths most closely matching what is described. Menu names ("Routing → BGP", "Devices → [Device] → Routing") may differ slightly across UI themes/versions.
- The post does not pin to a specific Observium version. The corrected commands and config keys reflect the current published documentation as of the review date.
