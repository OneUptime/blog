# How to Configure ESXi Remote Syslog over TLS and Verify Log Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, Syslog, TLS, Logging, Security, Troubleshooting

Description: Configure authenticated TLS transport from ESXi to a remote syslog collector, then prove certificate validation, network reachability, and end-to-end log ingestion.

---

Remote syslog keeps host evidence away from the ESXi boot device and makes security and outage timelines much easier to reconstruct. Sending that traffic with UDP does not provide transport encryption or delivery feedback. ESXi supports an encrypted TCP connection by using an **ssl://** log-host URI; Broadcom documentation calls the feature syslog over SSL, although current deployments negotiate TLS.

Encryption alone is not enough. The host should validate the collector certificate, the name in the URI must match the certificate, the ESXi firewall must permit the destination port, and a test event must be found on the collector. A configured URI in vCenter proves none of those things.

This procedure is written for ESXi 8.x, matching Broadcom's current generic TLS procedure. The basic syslog commands also exist in ESXi 7.x, but certificate-store and custom-port behavior must be checked against the exact release before a fleet rollout.

## Define the End-to-End Design

Decide these values before changing a host:

- the collector FQDN, not just its IP address;
- the TLS listener port;
- the certificate authority chain that signs the collector certificate;
- the ESXi management VMkernel route and DNS servers used to reach it;
- the retention and access policy on the collector; and
- a persistent local log location for periods when the collector is unavailable.

Broadcom documents **1514** as the default ESXi SSL syslog port. A collector may instead use another port, such as 6514. ESXi 7.0 Update 3q and ESXi 8.0 Update 2b or later can create persistent dynamic firewall rules for non-default log-host ports. Earlier releases do not support an administrator-created custom firewall XML file; Broadcom says a partner-created VIB is required for a custom port. Use port 1514 when you need a design that works with the built-in syslog ruleset across older supported releases.

The collector certificate should be valid for server authentication, within its validity dates, and contain a Subject Alternative Name that matches the configured FQDN. If the certificate has only a DNS name, configuring **ssl://192.0.2.40:1514** produces an identity mismatch even when that IP reaches the correct server. Accurate ESXi time and working DNS are therefore prerequisites for certificate validation.

## Prepare a Safe Change

Use one canary host before applying a Host Profile or configuration policy to a cluster. Evacuate it and place it in maintenance mode because the current Broadcom certificate procedure requires maintenance mode. Keep out-of-band console access available.

Record the existing state:

~~~bash
vmware -vl
esxcli system syslog config get
esxcli network firewall ruleset list
esxcli network firewall ruleset allowedip list --ruleset-id=syslog
esxcli network ip route ipv4 list
esxcli network ip dns server list
~~~

Also record the exact old **Remote Host** value. A log-host setting can contain a comma-delimited list, so replacing it without recording the value can silently remove an existing collector.

Do not disable local persistent logging when enabling a remote destination. A TLS connection can fail during DNS, network, certificate, or collector maintenance, and the remote system controls its own rotation and retention.

## Validate the Collector Before Trusting It

From an administrative system, verify that the intended TLS listener is active and that it presents the complete expected chain. Obtain the CA chain through the organization's certificate-management process rather than trusting a certificate downloaded over an unverified connection.

On the ESXi host, a read-only handshake is useful for confirming the route and seeing what the listener presents:

~~~bash
openssl s_client -connect logs.example.com:1514 -showcerts </dev/null
~~~

This output is diagnostic. A successful TCP connection does not mean ESXi trusts the chain, and blindly importing the leaf certificate makes renewal harder. Verify the certificate fingerprint and chain out of band with the PKI or collector owner.

Prepare a PEM Base64 chain file named **syslog_chain.cer**. Broadcom's generic ESXi 8.0 procedure shows the server certificate followed by any intermediate certificate and then the root certificate. Have the PKI owner verify this file before copying it to the host.

## Add the Required Trust on ESXi

Copy the approved chain file to **/tmp/syslog_chain.cer** on the canary host. Then verify and back up the existing CA store:

~~~bash
openssl verify -CAfile /etc/vmware/ssl/castore.pem -verbose /etc/vmware/ssl/castore.pem
cp -p /etc/vmware/ssl/castore.pem /etc/vmware/ssl/castore.pem.bak
~~~

Do not continue if the first verification reports a malformed store. Preserve the output and investigate it before modifying trust.

Append the approved chain and verify the resulting store:

~~~bash
cat /tmp/syslog_chain.cer >> /etc/vmware/ssl/castore.pem
openssl verify -CAfile /etc/vmware/ssl/castore.pem -verbose /etc/vmware/ssl/castore.pem
~~~

Broadcom also documents importing a CA certificate with **esxcli system security certificatestore add -f** for Aria Operations for Logs and publishing a CA to vCenter **TRUSTED_ROOTS** followed by **Refresh CA Certificates** on the host. Choose one documented trust workflow for the exact product and release; do not mix them or repeatedly append the same chain.

## Configure TLS Remote Logging

Enable certificate checking and set the FQDN-based TLS destination:

~~~bash
esxcli system syslog config set --check-ssl-certs=true
esxcli system syslog config set --loghost="ssl://logs.example.com:1514"
~~~

If the host already had one or more log hosts, supply the complete intended comma-delimited list in the second command. Do not replace an existing destination accidentally. Because certificate checking is global, every retained **ssl://** destination must present a name-matching chain that the host trusts.

For the built-in SSL port, enable the outbound syslog ruleset and refresh the firewall:

~~~bash
esxcli network firewall ruleset set --ruleset-id=syslog --enabled=true
esxcli network firewall refresh
~~~

If the ruleset's **Allowed All** value is false, also confirm that its allowed-IP list permits every address to which the collector FQDN resolves. Enabling the ruleset does not remove an existing destination restriction.

On ESXi 7.0 Update 3q and ESXi 8.0 Update 2b or later, a non-default port configured in the log-host URI should create a dynamic rule when vmsyslogd reloads. Reload after the firewall handling above, if applicable, and then inspect rather than assume:

~~~bash
esxcli system syslog reload
esxcli network firewall ruleset rule list
~~~

Do not create or edit firewall XML files to force a custom port. Broadcom explicitly does not support administrator-created custom ESXi firewall rules.

## Verify Configuration and Transport

First confirm that the running configuration contains the expected FQDN, port, and certificate-check setting:

~~~bash
esxcli system syslog config get
nc -z logs.example.com 1514
~~~

The netcat check tests TCP reachability only. It does not prove a valid TLS handshake or collector ingestion.

Review the syslog daemon's own error file after the reload:

~~~bash
tail -n 100 /var/log/.vmsyslogd.err
~~~

Look for certificate verification failures, identity mismatch, connection timeout, connection refusal, or **failed to establish connection**. If the host was configured with an IP while the certificate contains only a DNS SAN, change the URI to the matching FQDN and reload syslog.

Now generate a unique marker:

~~~bash
esxcli system syslog mark --message="ESXI-TLS-VERIFY-esxi01-20260828T120000Z"
~~~

Search the collector for the complete marker and confirm:

- it came through the TLS listener, not a remaining UDP input;
- the source resolves to the expected ESXi host;
- the event timestamp and collector receipt time are reasonable;
- the full marker was not truncated; and
- a second ordinary host event arrives after the marker.

The marker on the ESXi side is not proof of delivery. End-to-end success requires finding it in the collector's stored events or ingestion logs.

## Diagnose a Connection That Still Fails

Use the failure stage to narrow the problem:

- **DNS failure:** verify the host resolves the same FQDN used in the URI and that the returned address is reachable from the management VMkernel network.
- **TCP timeout or refusal:** verify the collector listener, routing, any intermediate firewall, and the ESXi syslog ruleset. A TCP test cannot validate TLS.
- **Unknown CA or incomplete chain:** verify the collector sends its intermediate certificates and that the required issuer is in the ESXi trust store.
- **Name mismatch:** configure the FQDN present in the certificate SAN, or issue a certificate containing the identity that ESXi uses.
- **Not yet valid or expired:** correct the certificate or host time; do not bypass certificate checking.
- **Collector receives a handshake but no events:** inspect collector input framing and ingestion logs, then issue another unique marker.

Broadcom notes that after communication to a remote syslog server is lost, forwarding can remain stopped until the syslog service is reloaded. After correcting the underlying fault, run:

~~~bash
esxcli system syslog reload
esxcli system syslog mark --message="ESXI-TLS-RECOVERY-esxi01-20260828T121500Z"
~~~

Confirm the recovery marker on the collector.

## Roll Back Safely

If the change must be abandoned, restore the exact previous **Remote Host** and **Check SSL Certs** values. If there was no previous remote host, use Broadcom's reset option:

~~~bash
esxcli system syslog config set --reset=loghost
~~~

If the built-in syslog ruleset was enabled solely for this change, restore its recorded enabled state as well. Restore **castore.pem.bak** only if the certificate-store change is being rolled back, no other trust change occurred after the backup, and the approved change plan calls for it. Replacing a trust store with a stale backup can remove unrelated trusted roots. Re-verify the store after restoration.

After completing all selected rollback actions, reload syslog so that it uses the restored configuration and trust state:

~~~bash
esxcli system syslog reload
~~~

Do not make **--check-ssl-certs=false** the steady-state workaround. That retains encryption but removes server authentication, allowing ESXi to send logs to a collector it cannot authenticate.

After the canary remains healthy through a reconnect or planned collector restart, roll the same settings to other hosts through a controlled Host Profile or configuration-management workflow. Generate a distinct marker per host and verify each one.

## Limitations and Version Scope

- The current generic certificate-chain procedure cited here is scoped by Broadcom to vSphere 8.0.
- Syslog configuration syntax is documented for ESXi 7.x, ESXi 8.x, and ESX 9.x, but port and trust-store behavior can differ.
- Dynamic rules for a non-default remote syslog port require ESXi 7.0 Update 3q, ESXi 8.0 Update 2b, or a later release.
- ESXi controls only its local log rotation. Retention, parsing, indexing, and alerting on the collector are separate controls.
- Remote TLS logging does not replace persistent local logs, coredumps, or a tested support-bundle workflow.

## Official Documentation

- [How to configure syslog over SSL on ESXi](https://knowledge.broadcom.com/external/article/324268)
- [Configuring syslog on ESXi](https://knowledge.broadcom.com/external/article/318939)
- [Configuring a custom syslog port on ESXi](https://knowledge.broadcom.com/external/article/384293)
- [Certificate identity mismatch when configuring ESXi syslog over SSL](https://knowledge.broadcom.com/external/article/432290)
- [Adding the Aria Operations for Logs CA to the ESXi trust store](https://knowledge.broadcom.com/external/article/315227)
- [Custom firewall rules in VMware ESXi are not supported](https://knowledge.broadcom.com/external/article/317482)
- [Determining whether an ESXi host has persistent logging](https://knowledge.broadcom.com/external/article/302451)

## Conclusion

A reliable TLS syslog configuration has four independently verified parts: a trusted certificate chain, a name-matching FQDN, permitted TCP transport, and a marker found on the collector. Preserve local logging, stage the change on one host, and treat the collector-side search as the final acceptance test.
