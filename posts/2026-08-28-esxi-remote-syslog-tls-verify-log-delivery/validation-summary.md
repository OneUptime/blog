# Validation Summary: How to Configure ESXi Remote Syslog over TLS and Verify Log Delivery

## Status

validated

## Post Type

Tutorial / Operational Guide

## Technologies Covered

- VMware ESXi 7.x and 8.x
- VMware vSphere and vCenter Server
- ESXi `vmsyslogd` and ESXCLI
- Syslog over TLS
- X.509 certificates, PKI trust chains, and OpenSSL
- ESXi firewall rulesets, DNS, and VMkernel networking
- VMware Aria Operations for Logs

## Sources Consulted

- Broadcom KB 324268, How To Configure syslog over SSL on ESXi: https://knowledge.broadcom.com/external/article/324268
- Broadcom KB 318939, Configuring syslog on ESXi: https://knowledge.broadcom.com/external/article/318939
- Broadcom KB 384293, How to Configure a Custom Syslog Port on ESXi: https://knowledge.broadcom.com/external/article/384293
- Broadcom KB 432290, Configuring ESXi syslog over SSL fails with an IP-address certificate mismatch: https://knowledge.broadcom.com/external/article/432290
- Broadcom KB 315227, adding the Aria Operations for Logs CA to the ESXi trust store: https://knowledge.broadcom.com/external/article/315227
- Broadcom KB 317482, Guidelines for Custom Firewall Rules in VMware ESXi: https://knowledge.broadcom.com/external/article/317482
- Broadcom KB 302451, Determining whether an ESXi host has persistent logging: https://knowledge.broadcom.com/external/article/302451
- Broadcom KB 312032, Opening the firewall for syslog emission to remote hosts: https://knowledge.broadcom.com/external/article/312032
- Broadcom ESXCLI 8.0.3 system command reference: https://developer.broadcom.com/xapis/esxcli-command-reference/8.0.3/namespace/esxcli_system.html
- Broadcom ESXCLI 8.0.3 network command reference: https://developer.broadcom.com/xapis/esxcli-command-reference/8.0.3/namespace/esxcli_network.html
- Broadcom KB 415405, End of General Support for vSphere 7.0: https://knowledge.broadcom.com/external/article/415405/end-of-general-support-for-vsphere
- RFC 5425, Transport Layer Security (TLS) Transport Mapping for Syslog: https://www.rfc-editor.org/rfc/rfc5425.html

## Issues Found

1. **Certificate SAN wording was too literal.** The post said that the certificate must contain the configured FQDN in its Subject Alternative Name. A standards-valid wildcard DNS SAN can also match the configured FQDN. Changed the text to require a SAN that matches the FQDN.

2. **The syslog reload occurred before the standard-port firewall rule was enabled.** Broadcom documents cases in which forwarding does not resume after a failed connection until `vmsyslogd` is reloaded. Moved the final reload until after firewall handling so the procedure does not depend on retry behavior and so a dynamic custom-port rule can be inspected after reload.

3. **Restricted firewall destinations were recorded but not validated.** Enabling the `syslog` ruleset does not remove an existing allowed-IP restriction. Added a check that every address returned for the collector FQDN is permitted when **Allowed All** is false.

4. **Global certificate checking could affect retained TLS destinations.** `--check-ssl-certs` applies to the global syslog configuration, not to only the newly added destination. Added a warning that every retained `ssl://` destination must present a name-matching chain trusted by the host.

5. **Rollback did not restore all changed state and reloaded too early.** The original rollback restored only `loghost`, left the prior **Check SSL Certs** and firewall ruleset states unrestored, and reloaded syslog before an optional trust-store restoration. Changed the rollback to restore the captured values and firewall state, perform any approved trust-store restoration, and reload only after all selected rollback actions are complete.

## Review Notes

- All shown ESXCLI commands and options are present in the official ESXi 8.0.3 command reference. The `vmware -vl`, `nc -z`, OpenSSL, firewall, marker, and `--reset=loghost` examples match Broadcom guidance.
- All seven links in the post's **Official Documentation** section resolve to the intended Broadcom articles.
- Port 1514 is ESXi's default for `ssl://`; TCP port 6514 is the IANA-assigned default for the RFC 5425 TLS transport and is a custom port from ESXi's perspective.
- Broadcom KB 312032 says ESXi 8.0 U3 and later automatically handle standard and non-standard syslog firewall ports. Explicitly enabling the built-in standard-port ruleset on those releases is redundant but remains valid.
- Broadcom KB 324268 additionally lists `/sbin/services.sh start`, while KB 315227 and KB 318939 use the targeted syslog reload for trust/configuration application. The post retains the targeted reload and does not add the broader service command.
- ESXi 7.x reached End of General Support on October 2, 2025. The post is scoped to ESXi 8.x and mentions 7.x only for command/version behavior, which is accurate.
