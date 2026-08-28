# How to Configure ESXi NTP and Diagnose Hosts That Refuse to Synchronize

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, NTP, Time Synchronization, Networking, Firewall, Troubleshooting

Description: Configure persistent NTP settings on ESXi, interpret peer state and reachability, and isolate service, firewall, DNS, VLAN, upstream, or hardware clock failures.

---

Correct time is a dependency for certificates, authentication, distributed storage, event correlation, and incident response. An ESXi host can show the NTP service as enabled while still running unsynchronized, so checking that **ntpd** has a PID is not a sufficient health test.

For ESXi 7.0 Update 3 and later, including ESXi 8.x, NTP configuration lives in ConfigStore. Use the vSphere Client or **esxcli system ntp**. Direct edits to **/etc/ntp.conf** are no longer the persistent source of truth on those releases.

The reliable workflow is:

1. configure at least two approved upstream servers;
2. ensure UDP 123 requests and responses can traverse the correct VMkernel path;
3. verify **Time Synchronized: true**; and
4. interpret **ntpq -pn** over several poll intervals.

## Establish a Known Time Design

Choose upstream sources that the organization operates or explicitly approves. They should be reachable from every ESXi management network and themselves synchronized to reliable sources.

Record:

- the FQDN and current IP addresses of each NTP server;
- whether the servers support the NTP version used by the host;
- the ESXi management VMkernel interface, VLAN, gateway, and DNS path;
- firewalls between that network and UDP port 123;
- whether the host is joined to Active Directory; and
- whether PTP or another service is already providing kernel time.

Use one deliberate time service. Broadcom recommends avoiding competing sources. If Active Directory time is required, correct the source at the domain hierarchy and make ESXi use the domain source or the same reliable upstream rather than letting two services fight over the host clock.

If the host clock is wrong by a large amount, treat correction as a maintenance change. A clock step can affect logs, certificate checks, authentication, scheduled work, and distributed applications. Preserve an incident timeline before adjusting it.

## Audit Current Configuration

Run:

~~~bash
vmware -vl
date
esxcli system ntp get
esxcli system ntp config get
esxcli network firewall ruleset list --ruleset-id=ntpClient
esxcli network firewall ruleset allowedip list --ruleset-id=ntpClient
esxcli network ip route ipv4 list
esxcli network ip dns server list
~~~

In **esxcli system ntp get**, distinguish these fields:

- **Enabled** and **Time Service Enabled** show configuration and service state.
- **PID** and **Runtime Seconds** show whether the daemon is running.
- **Servers** shows the configured sources.
- **Service Providing Kernel Time** identifies which service currently owns time.
- **Time Synchronized** is the actual synchronization result.

Record the complete output of **esxcli system ntp config get** before replacing the server list. The summary from **esxcli system ntp get** can omit global directives that are required for a complete rollback.

## Configure NTP in the vSphere Client

For a single host:

1. Select the host.
2. Open **Configure > System > Time Configuration**.
3. Click **Edit**.
4. Choose **Network Time Protocol**.
5. Enter the approved NTP servers.
6. Enable the NTP service and its host startup behavior.
7. Save the change.
8. Use **Test Services** if that control is available, but verify from the host CLI as well because the UI is not a real-time peer monitor.

For a fleet, use a Host Profile or the release-appropriate vSphere Configuration Profile after validating one canary. A manual host change can later be overwritten by the assigned policy.

## Configure NTP with ESXCLI

On ESXi 7.0 Update 3 and later, Broadcom documents this persistent configuration for two servers:

~~~bash
esxcli system ntp set -s ntp1.example.com -s ntp2.example.com -e 1
esxcli system ntp get
~~~

The supplied server arguments define the intended list. Include every approved source in the command instead of assuming a new argument will append to the prior list.

Use this server-only form only when the full configuration audit shows no required custom directives. If it does, build a complete configuration file containing every required source and directive, load it with **esxcli system ntp set -f /scratch/ntpconfig.txt**, and restart NTP using the version-specific Broadcom procedure.

Do not copy extra options from another ESXi version. Inspect the exact host's interface first:

~~~bash
esxcli system ntp set --help
~~~

If a source is NTPv3-only or requires unusual options, use the version-specific Broadcom procedure. Do not make an ad hoc persistent edit to **/etc/ntp.conf** on ESXi 7.0 Update 3 or later because ConfigStore is authoritative.

## Check the ESXi Firewall

The **ntpClient** ruleset governs the host's NTP traffic. Inspect both the ruleset and its allowed-address list:

~~~bash
esxcli network firewall ruleset list --ruleset-id=ntpClient
esxcli network firewall ruleset allowedip list --ruleset-id=ntpClient
~~~

If the allowed list is restricted, it must include every current NTP server IP. Broadcom documents this command to add a missing address:

~~~bash
esxcli network firewall ruleset allowedip add --ip-address=192.0.2.20 --ruleset-id=ntpClient
~~~

An enabled ruleset with an empty allowed list can drop all NTP traffic. Allowing every address is a diagnostic or policy choice, not a required fix:

~~~bash
esxcli network firewall ruleset set --allowed-all=true --ruleset-id=ntpClient
~~~

Prefer the organization's approved source IPs where address restriction is required. If DNS for an NTP FQDN changes later, update the allowed list as well.

Some ESXi 8 rulesets are system-owned and cannot be enabled or disabled manually. Review the configurable columns in **esxcli network firewall ruleset list** and let the time service manage system-owned state.

## Prove Synchronization with ntpq

Query the local daemon numerically:

~~~bash
watch ntpq -pn
~~~

Observe more than one instant. Broadcom notes that synchronization may take from one to fifteen minutes after correct packet exchange begins.

Key fields are:

- **remote**: the upstream address selected after name resolution;
- **refid**: the peer's source or a state such as **.INIT.**;
- **st**: stratum; 16 means the source is unsynchronized and unusable;
- **reach**: an octal eight-poll reach register;
- **delay**: round-trip time in milliseconds;
- **offset**: estimated host-to-peer time difference in milliseconds; and
- **jitter**: variation in offset.

A healthy selected peer normally has an asterisk before its address. The reach value grows **1, 3, 7** as replies arrive and can reach **377**, meaning the last eight polls succeeded. A peer can be reachable yet rejected because its time quality or root dispersion is unacceptable, so **reach 377** alone is not proof of selection.

Finish by checking:

~~~bash
esxcli system ntp get
~~~

Acceptance requires **Time Synchronized: true** and at least one credible selected peer.

## Diagnose Reach 0 or .INIT.

Together, **.INIT.**, stratum 16, and reach 0 indicate that the current association has not completed a valid exchange. Reach 0 by itself means no valid replies were received during the last eight polls; the peer could have worked earlier.

Check DNS and compare it with the actual address **ntpd** chose:

~~~bash
nslookup ntp1.example.com
ntpq -pn
~~~

If a dual-stack name resolves to IPv6 but the host has no route to that IPv6 address, Broadcom recommends fixing IPv6 routing or configuring the reachable IPv4 address.

Test basic path selection from the intended VMkernel interface:

~~~bash
vmkping -I vmk0 192.0.2.20
~~~

ICMP success does not prove UDP 123 works. Capture the NTP exchange:

~~~bash
pktcap-uw --ip 192.0.2.20 --port 123
~~~

Look for outbound requests and inbound responses. Stop the capture after a short controlled interval. If requests leave but no replies return, investigate the intermediate firewall, NTP server service, routing, and server-side allow list. If responses arrive with the wrong VLAN tag, correct the physical-switch or management-port-group VLAN configuration; an open-port test can miss that return-path mismatch.

Do not treat a UDP netcat success message as proof that an NTP reply was accepted. Packet capture plus **ntpq** provides stronger evidence.

## Diagnose a Running Service That Is Not Selected

If **ntpq** reports connection refused, verify that servers are configured and the service is enabled:

~~~bash
esxcli system ntp get
~~~

If peers reply but no source is selected:

- confirm the upstream server is synchronized and below stratum 16;
- compare its reported time to a known reference;
- check offset, jitter, and root-dispersion indicators;
- test the second approved server;
- review whether the server is rejecting the ESXi client;
- confirm NTP version compatibility; and
- check for another service changing the system time.

Review logs:

~~~bash
tail -n 200 /var/run/log/syslog.log
tail -n 200 /var/run/log/vmkwarning.log
~~~

A **Clock Unsynchronized** message immediately after **ntpd** starts is normal. Persistent unsynchronized state after the expected convergence window, **no peer for too long**, or an association rejection provides the next branch. Do not force acceptance of a poor source merely to make an alarm disappear; repair the upstream hierarchy.

## Handle DNS and Address Changes

Broadcom documents that ESXi 7.x and 8.x **ntpd** can continue using the address it resolved when the service started after an NTP server's A record changes. Confirm the stale address in **ntpq -pn**, then restart only NTP:

~~~bash
/etc/init.d/ntpd restart
watch ntpq -pn
~~~

Also update a restricted **ntpClient** allowed-IP list. A restart cannot make the firewall accept a new address that policy still excludes.

## Investigate Persistent Drift

If replies are consistent but offset grows continuously:

- compare several ESXi hosts using the same sources;
- compare the hardware model, BIOS, firmware, and power settings;
- check whether Active Directory or another time service is changing the clock;
- review VMkernel warnings for clock steps and loss of synchronization; and
- involve the hardware vendor when one platform drifts while another OS or server model does not.

Broadcom documents an HPE firmware case where the ACPI power-management timer frequency made ESXi's local clock error exceed what NTP could tolerate. The remedy was corrected server firmware or BIOS, not repeated daemon restarts. Do not generalize that vendor-specific cause without matching hardware evidence.

## Verify After a Reboot

After the host has remained synchronized, perform a controlled maintenance-mode reboot when required by the change plan. Then verify:

~~~bash
esxcli system ntp get
ntpq -pn
esxcli network firewall ruleset allowedip list --ruleset-id=ntpClient
~~~

Confirm the intended servers persisted, the service started, the current DNS results are allowed through the firewall, and synchronization returns within the expected polling window. Compare the host time with vCenter, management controllers, switches, storage arrays, and monitoring systems used in incident timelines.

## Roll Back Safely

To roll back a server-only change, restore the complete recorded server list with **esxcli system ntp set**, then verify peer selection. If the original configuration contained custom directives, put the complete recorded configuration in a file, restore it with **esxcli system ntp set -f /scratch/ntpconfig.txt**, and restart NTP before verification. If NTP must be temporarily disabled:

~~~bash
esxcli system ntp set -e 0
~~~

If no other time service is active, disabling NTP leaves the host free-running; that is not a steady-state correction. If another service provides kernel time, verify that service instead. Restore a reliable source promptly.

Remove a newly added firewall address only after the previous time sources are working and the exact rule is confirmed:

~~~bash
esxcli network firewall ruleset allowedip remove --ip-address=192.0.2.20 --ruleset-id=ntpClient
~~~

Keep console access when changing management-network routing, VLANs, DNS, or firewall rules. Those changes can affect more than NTP.

## Limitations and Version Scope

- ConfigStore is authoritative for NTP on ESXi 7.0 Update 3 and later.
- ESXCLI options can differ by build; check **esxcli system ntp set --help** locally.
- Synchronization can take one to fifteen minutes after correct packet exchange begins.
- Asterisk, reach, stratum, offset, and jitter are diagnostic signals; judge them together.
- Vendor-specific timer or firmware faults require matching hardware evidence and vendor remediation.

## Official Documentation

- [Troubleshooting NTP on ESX and ESXi](https://knowledge.broadcom.com/external/article/312204)
- [NTP and PTP configuration uses ConfigStore on ESXi 7.0 U3 and later](https://knowledge.broadcom.com/external/article/313808)
- [NTP synchronization warning caused by an empty firewall allowed-IP list](https://knowledge.broadcom.com/external/article/443386)
- [ESXi keeps using an old NTP address after a DNS A-record change](https://knowledge.broadcom.com/external/article/430864)
- [NTP failure caused by a management VLAN mismatch](https://knowledge.broadcom.com/external/article/429931)
- [ESXi fails NTP synchronization because of local hardware-clock drift](https://knowledge.broadcom.com/external/article/411423)
- [ESXi time drift while joined to Active Directory](https://knowledge.broadcom.com/external/article/441692)

## Conclusion

NTP is healthy only when ESXi selects a credible peer and reports synchronized time. Configure sources through ConfigStore-aware tools, inspect the NTP firewall list, watch the peer reach register, and capture UDP 123 when replies are uncertain. That sequence separates an ESXi setting problem from DNS, VLAN, network, upstream-server, competing-service, and hardware-clock causes.
