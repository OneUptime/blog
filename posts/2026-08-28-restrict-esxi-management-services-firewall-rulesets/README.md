# How to Restrict ESXi Management Services with Firewall Rulesets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, Firewall, Management Network, Access Control, Hardening, Security

Description: Restrict configurable ESXi management rulesets to approved IPs and CIDRs without disconnecting vCenter, vSAN, automation, or emergency administration.

---

The ESXi firewall can restrict a service ruleset to specific source or destination addresses. This is useful for keeping the Host Client, API, SSH, monitoring, and other management endpoints reachable only from trusted networks.

The dangerous part is not the syntax. A ruleset name can cover traffic used by more systems than its label suggests. Broadcom documents that restricting the **vSphereClient** ruleset without including vCenter can disconnect the host because that ruleset covers traffic on ports 443 and 902. On newer vSAN releases, peer management traffic can also depend on port 443.

Make the change as a controlled allow-list migration: inventory every legitimate consumer and submit the complete list together with the restriction in the vSphere Client. If command-line sequencing is required, work from the local or out-of-band console because a temporarily empty list can cut off the remote session.

## Understand What the ESXi Firewall Does

The ESXi firewall is ruleset-based. A service can have:

- a ruleset that is enabled or disabled;
- protocol, port, and direction rules;
- an **Allowed IP Addresses** list; and
- an **allowed-all** state that either permits every address or enforces the list.

An enabled firewall ruleset does not necessarily start the associated daemon, and stopping a daemon does not replace firewall policy. For an unnecessary management service, keep the service stopped and its ruleset disabled where the ruleset is administrator-configurable.

Do not edit built-in firewall XML files or create a custom rule by hand. Broadcom does not support administrator-created custom firewall rules. Use built-in rulesets, a supported partner VIB where explicitly required, or an upstream network firewall.

## Build the Consumer Inventory

For each host, identify every system that legitimately talks to a management endpoint:

- vCenter Server appliances and any address they actually source from;
- administrator jump hosts, VPN pools, and break-glass workstations;
- backup, monitoring, vulnerability, hardware-management, and automation systems;
- lifecycle, image-depot, and support tools;
- syslog, DNS, NTP, SNMP, and directory services where their rulesets are restricted;
- vSAN peer VMkernel addresses when the release and service use management HTTPS; and
- disaster-recovery systems that must manage the host when the primary site is unavailable.

Do not use a broad office subnet merely because the consumers are not yet known. Resolve source addresses from firewall logs, connection tables, application configuration, and service owners.

Choose CIDRs carefully. A host address can be represented as a single IP or an address range such as **192.0.2.0/24**. Include only routed, controlled networks; ESXi firewall allow lists do not authenticate the device behind an allowed address.

## Capture the Current State

Before changing anything:

~~~bash
vmware -vl
esxcli network firewall get
esxcli network firewall ruleset list
esxcli network firewall ruleset allowedip list
esxcli network firewall ruleset rule list
esxcli network ip connection list
~~~

Save the output outside the host. The **ruleset list** output on current ESXi builds includes whether enable/disable and allowed-IP settings are configurable. Starting with ESXi 8.0 Update 2, the firewall management plane classifies rulesets as user-owned or system-owned. If **Allowed IP configurable** is false, do not change **allowed-all** or the allowed-IP list.

Inspect individual candidate rules:

~~~bash
esxcli network firewall ruleset list --ruleset-id=vSphereClient
esxcli network firewall ruleset allowedip list --ruleset-id=vSphereClient
esxcli network firewall ruleset list --ruleset-id=sshServer
esxcli network firewall ruleset allowedip list --ruleset-id=sshServer
~~~

Use the names reported by the host. Do not assume every ESXi build or OEM image exposes the same set.

## Prepare a Recovery Path

Before enforcing any list:

- confirm the hardware remote console works;
- know how to enable ESXi Shell from the DCUI;
- keep the current management session open;
- have a second administrator test from another approved source;
- place the host in maintenance mode when cluster policy requires it; and
- change one host and one ruleset at a time.

For **vSphereClient**, include vCenter before restricting anything. Broadcom explicitly warns that its ports 443 and 902 are not only for a human web browser. Include backup and automation endpoints that call the ESXi HTTPS API, and assess vSAN peer addresses for the exact vSAN release.

For **sshServer**, decide whether SSH should be running at all. If it is only a temporary troubleshooting service, a stopped service with a documented startup workflow is stronger than leaving it exposed indefinitely.

## Configure an Allow List in the vSphere Client

For current vSphere Client releases:

1. Select the ESXi host.
2. Open **Configure > System > Firewall**.
3. Choose the incoming or outgoing view that contains the service.
4. Click **Edit** and expand the target service.
5. Enter every approved IP address or CIDR.
6. Clear **Allow connections from any IP address**.
7. Save.

In the direct VMware Host Client, open **Networking > Firewall rules**, select the rule, and edit its allowed addresses.

The UI labels can differ slightly by vSphere release. Always match the displayed ports, direction, and ruleset name to the documented consumer flow before saving.

## Configure a Ruleset with ESXCLI

Use ESXCLI from the local ESXi Shell reached through the hardware or out-of-band console. The documented command sequence can enforce the list before all entries have been added, so it is unsafe from the same SSH connection being restricted.

The following example restricts SSH to an administrative subnet and one break-glass address:

~~~bash
esxcli network firewall ruleset allowedip list --ruleset-id=sshServer
esxcli network firewall ruleset set --ruleset-id=sshServer --allowed-all=false
esxcli network firewall ruleset allowedip add --ruleset-id=sshServer --ip-address=192.0.2.0/24
esxcli network firewall ruleset allowedip add --ruleset-id=sshServer --ip-address=198.51.100.25
esxcli network firewall ruleset allowedip list --ruleset-id=sshServer
~~~

For the Host Client and API, add vCenter and every other required consumer immediately after enforcing the list:

~~~bash
esxcli network firewall ruleset allowedip list --ruleset-id=vSphereClient
esxcli network firewall ruleset set --ruleset-id=vSphereClient --allowed-all=false
esxcli network firewall ruleset allowedip add --ruleset-id=vSphereClient --ip-address=192.0.2.10
esxcli network firewall ruleset allowedip add --ruleset-id=vSphereClient --ip-address=192.0.2.16/28
esxcli network firewall ruleset allowedip list --ruleset-id=vSphereClient
~~~

Expect vCenter or other remote access to be interrupted while the enforced list is empty. This is why the UI's single save is preferred and the CLI workflow belongs on a console.

Some installations permit an allowed list to be populated while **allowed-all** remains true, which would avoid that interruption. Do not assume this behavior. Broadcom documents an ESXi 8.0 state-desynchronization case that returns **Couldn't update allowed ip list when allowed-all flag is true**; that issue is fixed in ESXi 9.0. If this exact error occurs, stop instead of retrying through the UI or changing flags over SSH; Broadcom's documented workaround is to reboot the host under change control.

The examples use documentation address ranges. Replace them with the exact approved sources. Avoid adding an entry already present in the same rule; Broadcom documents duplicate-entry conflicts on current incoming rules.

Do not enable a disabled service merely to restrict it. If SSH is intentionally stopped, its existing allowed list can remain prepared while the service stays stopped.

## Validate Positive and Negative Access

Configuration output is only the first check:

~~~bash
esxcli network firewall ruleset allowedip list --ruleset-id=vSphereClient
esxcli network firewall ruleset allowedip list --ruleset-id=sshServer
~~~

From approved sources, verify the flows that the environment actually uses:

- vCenter still shows the host connected;
- recent performance data and tasks update;
- the Host Client or API works from the jump host;
- SSH works from its approved source only if the service is intended to run;
- backup, monitoring, lifecycle, and automation jobs complete;
- vSAN health and performance data remain healthy where applicable; and
- no new host communication alarms appear.

Then test from a controlled non-approved source. The connection should fail at the host firewall. Do not use an internet host or an uncontrolled network for this test.

Wait through normal polling intervals for monitoring and vSAN health. A host that remains connected for thirty seconds may still have lost a periodic integration.

## Restrict vSphereClient Without Disconnecting the Host

Treat **vSphereClient** as a shared management-plane ruleset, not just a browser rule. Broadcom's current KB states that its restriction affects ports 443 and 902 and can block vCenter when the appliance address is missing.

At minimum, evaluate:

- every vCenter Server address used to manage the host;
- direct Host Client and API administration sources;
- image, backup, monitoring, and automation consumers;
- other hosts or vSAN VMkernel addresses that use HTTPS peer management; and
- recovery-site management addresses.

In vSAN 8.0 Update 2 and later, Broadcom documents a case where the vSAN master retrieves remote-host statistics over port 443. A **vSphereClient** list missing vSAN VMkernel IPs can therefore break performance and health collection. Do not add every VMkernel subnet automatically; add the exact addresses required by the validated design.

## Handle System-Owned Rulesets

Starting with ESXi 8.0 Update 2, the firewall management plane classifies rulesets as user-owned or system-owned. Attempts to change a protected property can return:

~~~text
Can not change allowed ip list this ruleset, it is owned by system service.
~~~

This is expected protection, not a reason to edit configuration files. Run:

~~~bash
esxcli network firewall ruleset list
~~~

Treat the two configurability columns independently. If **Enable/Disable configurable** is false, do not toggle the ruleset directly; if **Allowed IP configurable** is false, do not change **allowed-all** or its allowed-IP list. Apply the protected operation through the owning supported service configuration or an external network firewall.

## Remove an Address Carefully

First confirm the exact entry and that no consumer still uses it:

~~~bash
esxcli network firewall ruleset allowedip list --ruleset-id=sshServer
~~~

Then remove only that entry:

~~~bash
esxcli network firewall ruleset allowedip remove --ruleset-id=sshServer --ip-address=198.51.100.25
~~~

Re-run both positive and negative tests. Removing a subnet can affect more clients than the one ticket that requested the change.

## Recover from an Accidental Lockout

Use the hardware console or DCUI, enable ESXi Shell if necessary, press **Alt+F1**, and sign in locally. Broadcom documents these targeted recovery commands:

~~~bash
esxcli network firewall ruleset set --allowed-all=true --ruleset-id=vSphereClient
esxcli network firewall ruleset set --allowed-all=true --ruleset-id=sshServer
~~~

Run only the command for the affected ruleset when possible. Restoring **allowed-all** is a temporary recovery action. Add the missing trusted source, verify access, and reapply the restricted list through change control.

Do not disable the ESXi firewall globally to repair one rule. That expands exposure for every service and obscures the original error.

## Make the Policy Durable

After the canary is stable:

- encode the approved lists in a Host Profile or vSphere Configuration Profile only where the exact ruleset and release are supported by that profile mechanism;
- document every allowed CIDR and its owner;
- monitor drift between policy and host state;
- test recovery-console access periodically;
- review addresses after vCenter, backup, monitoring, or network migrations; and
- retire temporary entries promptly.

A host profile can also overwrite a correct manual change. Inspect remediation previews, especially the **allIP** setting, before applying a profile to the cluster.

## Limitations and Version Scope

- Ruleset names, ports, direction, and configurability can differ by ESXi build and installed components.
- Starting with ESXi 8.0 Update 2, system-owned rulesets can have properties that administrators cannot modify directly.
- Restricting **vSphereClient** can affect vCenter, vSAN, backup, monitoring, and APIs, not only browser access.
- Address allow lists are network controls, not user authentication or authorization.
- Built-in rulesets cannot be extended with unsupported hand-edited firewall XML.

## Official Documentation

- [Allowing Host Client access only from specific IP addresses](https://knowledge.broadcom.com/external/article/418184)
- [vCenter disconnects after restricting the vSphere Client ruleset](https://knowledge.broadcom.com/external/article/432374)
- [Recovering ESXi access after an incorrect firewall change](https://knowledge.broadcom.com/external/article/424290)
- [System-owned firewall rulesets in ESXi 8.0](https://knowledge.broadcom.com/external/article/384384)
- [Checking allIP firewall state in ESXi Host Profiles](https://knowledge.broadcom.com/external/article/399000)
- [Duplicate addresses in an ESXi firewall incoming rule](https://knowledge.broadcom.com/external/article/438888)
- [ESXi 8 can reject an allowed-IP update while allowed-all is true](https://knowledge.broadcom.com/external/article/425976)
- [vSAN connectivity issues when vSphereClient omits peer IPs](https://knowledge.broadcom.com/external/article/376822)
- [Custom firewall rules in VMware ESXi are not supported](https://knowledge.broadcom.com/external/article/317482)

## Conclusion

Restricting ESXi management access is safest when it is staged as a tested allow-list migration. Inventory every management consumer, add its addresses before enforcing the list, validate both permitted and denied paths, and keep DCUI recovery ready. The result is a smaller management-plane exposure without sacrificing vCenter, vSAN, automation, monitoring, or emergency access.
