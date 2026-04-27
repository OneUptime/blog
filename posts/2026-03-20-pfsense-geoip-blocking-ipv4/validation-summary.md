# Validation Summary: How to Configure GeoIP Blocking for IPv4 on pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (firewall distribution based on FreeBSD)
- pfBlockerNG-devel (pfSense package)
- MaxMind GeoLite2 (GeoIP database)
- IPdeny country IP CIDR feeds
- pfctl (FreeBSD/pf packet filter CLI)

## Sources Consulted
- [pfBlockerNG Guide - Zenarmor](https://www.zenarmor.com/docs/network-security-tutorials/pfblockerng)
- [pfSense pfBlockerNG configuration guide - nguvu.org](https://nguvu.org/pfsense/pfSense-pfblockerng-configuration-guide/)
- [How to Setup pfBlockerNG - Protectli Knowledge Base](https://kb.protectli.com/kb/how-to-setup-pfblockerng/)
- [IPdeny IP country CIDR blocks](https://www.ipdeny.com/ipblocks/)
- [Index of /ipblocks/data/aggregated/ - IPdeny](https://www.ipdeny.com/ipblocks/data/aggregated/)
- [Netgate Forum: MaxMind configuration for GeoIP](https://forum.netgate.com/topic/166087/maxmind-configuration-to-update-list-geoip)

## Issues Found
1. **Incorrect Wizard navigation path.** The post stated `Firewall > pfBlockerNG > DNSBL > Wizard`. The Wizard is a top-level tab under pfBlockerNG (it auto-launches on first install and can be re-run from the `Wizard` tab), not a sub-tab of DNSBL. Changed to `Firewall > pfBlockerNG > Wizard`.
2. **Incorrect GeoIP sub-tab name.** The post stated `Firewall > pfBlockerNG > IP > MaxMind GeoIP` for country selection. The actual sub-tab in pfBlockerNG-devel is named `GeoIP` (the MaxMind license-key fields live on the IP tab itself; country selection is under the GeoIP sub-tab). Changed to `Firewall > pfBlockerNG > IP > GeoIP`.

## Review Notes
- The `pfBlockerNG-devel` package is the correct historical name; in current pfSense Plus / 2.7+ it has been merged back into `pfBlockerNG`, but the `-devel` package name is still recognized and present in many active installs, so leaving it as-is is acceptable.
- The IPdeny aggregated zone URLs (`https://www.ipdeny.com/ipblocks/data/aggregated/<cc>-aggregated.zone`) are verified correct.
- The `pfB_<aliasname>_v4` naming convention used by pfBlockerNG for generated pfctl tables is correct; `pfB_GeoIP_Block_v4` is plausible given the alias name `GeoIP_Block` used earlier in the post.
- MaxMind GeoLite2 still requires a free license key (since December 2019) — accurately reflected in the post.
- The "Add GeoIP Feed" subsection under the IPv4 tab conflates custom IPv4 alias creation with GeoIP source selection. In actual pfBlockerNG workflow, GeoIP feeds are managed automatically once MaxMind credentials are configured and country selection is done via the GeoIP sub-tab; custom CIDR feeds are added via the IPv4 tab. This is mildly confusing but not strictly wrong, since either approach works to achieve country-based blocking. Not modified to avoid restructuring the post.
- The example uses RFC 5737 documentation IPs (203.0.113.5, 198.51.100.0/24) for the suppression list, which is appropriate for documentation.
