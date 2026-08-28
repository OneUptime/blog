# Validation Summary: How to Restrict ESXi Management Services with Firewall Rulesets

## Status

validated

## Post Type

Technical hardening guide

## Technologies Covered

- VMware ESXi and the ESXi host firewall
- VMware vSphere Client and VMware Host Client
- ESXCLI firewall and network commands
- vCenter Server management connectivity
- VMware vSAN 8.0 Update 2 and later
- ESXi Host Profiles and vSphere Configuration Profiles

## Sources Consulted

- [Broadcom ESXCLI Command Reference: esxcli network commands](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html)
- [Broadcom Virtual Infrastructure API: HostFirewallRuleset](https://developer.broadcom.com/xapis/virtual-infrastructure-json-api/latest/data-structures/HostFirewallRuleset/)
- [Allowing Host Client access only from specific IP addresses](https://knowledge.broadcom.com/external/article/418184)
- [ESXi host disconnects from vCenter Server after restricting vSphere Client access](https://knowledge.broadcom.com/external/article/432374)
- [How to recover firewall settings after losing SSH or Host Client access](https://knowledge.broadcom.com/external/article/424290)
- [Error: Can not enable/disable this ruleset](https://knowledge.broadcom.com/external/article/384384)
- [The allowed IP list configured for the CIMHttpServer firewall was lost after upgrading to ESXi 8.0 U2](https://knowledge.broadcom.com/external/article/420621)
- [Checking allIP firewall state during Host Profile remediation](https://knowledge.broadcom.com/external/article/399000)
- [Host Profiles do not save firewall rulesets for non-default firewall rules](https://knowledge.broadcom.com/external/article/342622)
- [ESX firewall rulesets showing non-compliant after upgrade](https://knowledge.broadcom.com/external/article/435620)
- [Unable to add IP addresses to an ESXi firewall incoming rule](https://knowledge.broadcom.com/external/article/438888)
- [Unable to add an IP address in a firewall ruleset via vCenter UI](https://knowledge.broadcom.com/external/article/425976)
- [vSAN Skyline health warning for hosts with connectivity or statistics issues](https://knowledge.broadcom.com/external/article/376822)
- [Creating custom firewall rules in VMware ESXi is not supported](https://knowledge.broadcom.com/external/article/317482)
- [Determining VMware software version and build number](https://knowledge.broadcom.com/external/article/320235)

## Issues Found

- The post originally dated the general user-owned/system-owned firewall classification to ESXi 8.0. Broadcom's more precise documentation identifies ESXi 8.0 Update 2 as the introduction point. All three version statements were corrected to ESXi 8.0 Update 2.
- The system-owned-ruleset guidance treated **Enable/Disable configurable** and **Allowed IP configurable** as if either false value made the whole ruleset immutable. These are independent properties. The text now prohibits only the operation whose corresponding property is false, including changes to **allowed-all** when allowed-IP configuration is protected.
- The `vSphereClient` command example added `192.0.2.10` and then `192.0.2.0/28`, which already contains that address. The subnet was changed to the non-overlapping documentation range `192.0.2.16/28`.
- The duplicate-entry warning also referred broadly to overlapping entries, while the cited Broadcom article specifically documents conflicts with entries already present in the same rule. The warning was narrowed to the documented duplicate-entry case.
- The ESXi 8.0 state-desynchronization paragraph suggested switching to the UI or console when the documented error occurs. The defect can occur through the UI, and Broadcom's documented workaround is a host reboot. The text now directs readers to stop retrying and perform that reboot under change control.
- The durability guidance could imply that every ruleset can be encoded in a Host Profile or vSphere Configuration Profile. Broadcom documents rulesets that Host Profiles intentionally ignore and version-dependent VCP support. The bullet now requires support for the exact ruleset and release.

## Review Notes

All ESXCLI command names, flags, Boolean values, ruleset identifiers, and IP/CIDR formats in the revised post match the current official command reference. The vSphere Client and direct Host Client navigation paths are also supported by Broadcom documentation, with the release-specific UI-label caveat already present in the post. The vCenter ports 443/902 warning, the vSAN 8.0 Update 2 port 443 dependency, DCUI recovery commands, duplicate-entry defect, ESXi 8.0 allowed-IP state-desynchronization defect, and unsupported status of hand-written custom firewall rules were confirmed. All linked documentation URLs resolve to relevant Broadcom articles. No deprecated commands were identified.
