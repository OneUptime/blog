# Validate Forward-Confirmed Reverse DNS Before Sending Mail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Email, Email Delivery

Description: Check the actual outbound mail IP, follow its PTR record back through A or AAAA records, and identify reverse-DNS ownership and IPv6 mismatches before a rollout.

Your mail server has a hostname and an A record, yet recipients reject its messages for a reverse-DNS problem. The missing check may be the other direction: does the public IP used to send the message point to a hostname that resolves back to that same IP?

That round trip is forward-confirmed reverse DNS, often shortened to FCrDNS. It is an infrastructure identity check. Passing it does not guarantee inbox placement or replace mail authentication, but failing it can prevent an otherwise working Simple Mail Transfer Protocol (SMTP) server from delivering reliably.

Google's [sender guidelines](https://support.google.com/mail/answer/81126?hl=en) require valid forward and reverse DNS for sending infrastructure and describe a PTR hostname whose A or AAAA record resolves to the sending public IP. Check the requirements of your actual recipients as well.

## Start with the address the recipient sees

Do not begin with the server's private interface address or the IP returned for your organization's website. Begin with the source address of the outbound SMTP connection as observed beyond any gateway or relay.

Inventory how mail leaves the system. A server may send directly through a public address, use network address translation, or submit messages to a hosted relay. In the relay case, the final receiving mail server sees the relay's sending IP. Fixing the application server's private PTR record does not repair that public identity.

Obtain the outbound address from the mail-platform configuration and corroborate it with appropriate delivery logs or a controlled recipient's trusted receiving trace. If there is a pool, list every sending IP. If IPv6 is enabled, include the IPv6 path rather than assuming a successful IPv4 check covers it.

For the walkthrough, use these documentation placeholders:

| Role | Example |
| --- | --- |
| Outbound IPv4 address | `203.0.113.25` |
| Outbound IPv6 address | `2001:db8::25` |
| Intended mail hostname | `mailout.example.com.` |
| Approved diagnostic resolver | `192.0.2.53` |

None is a live target. Replace them with your actual public sending addresses, hostname, and permitted resolver before running queries.

## Query the IPv4 address's reverse name

An IPv4 PTR query uses the octets in reverse order under `in-addr.arpa`. For the example sending address, run:

```bash
nslookup -type=PTR 25.113.0.203.in-addr.arpa. 192.0.2.53
```

The expected result is the intended hostname, `mailout.example.com.`. Keep the full response, including the selected DNS server and any error. The reverse naming convention is documented in [BIND's reverse-zone explanation](https://bind9.readthedocs.io/en/v9.18.33/chapter3.html), and the explicit record-type and server syntax follows the [Windows nslookup reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup).

A timeout means the lookup did not complete; it is not proof that the PTR is absent. NXDOMAIN means the reverse name was reported nonexistent. An answer containing an unexpected provider hostname needs comparison with the intended sending identity, not an automatic assumption that DNS is broken.

If several PTR names are returned, inspect every name and check your mail platform's policy. For an operationally simple design, prefer one documented, stable mail identity per sending IP when the provider supports it. Do not invent a universal rule that DNS permits only one PTR.

## Follow the returned hostname forward

Use the hostname actually returned by the PTR query, not the hostname you hoped it would return:

```bash
nslookup -type=A mailout.example.com. 192.0.2.53
```

For this IPv4 test, the returned address set must contain `203.0.113.25`. It need not be the first address printed. If the hostname resolves only to a different IP, the round trip does not confirm the sending address.

Keep this distinction clear: publishing a PTR and publishing an A record are two separate changes. A plausible-looking hostname in the reverse answer is only halfway through the check.

For example, a PTR pointing to `mailout.example.com.` and an A answer containing only `203.0.113.26` is a mismatch. If the A set contains both `.25` and `.26`, the `.25` address is represented; separately validate `.26` if it also sends mail. Do not treat a DNS success code alone as a successful identity comparison.

## Repeat the check for IPv6

IPv6 reverse names use reversed hexadecimal digits beneath `ip6.arpa`, which is easy to transcribe incorrectly. Oracle documents the [IPv4 and IPv6 reverse namespaces](https://docs.oracle.com/en/operating-systems/oracle-linux/10/bind/bind-ResourceRecordsforReverseNameResolution.html).

On a Bash host with Python 3 and `nslookup`, generate the reverse name instead of typing it manually:

```bash
reverse_name=$(python3 -c 'from ipaddress import ip_address; print(ip_address("2001:db8::25").reverse_pointer)')
nslookup -type=PTR "${reverse_name}." 192.0.2.53
```

Replace the IPv6 address and resolver. Python's [ipaddress reference](https://docs.python.org/3.13/library/ipaddress.html) documents `reverse_pointer`. The first command only constructs a name locally; the second performs the DNS query. Its expected answer is the approved outbound mail hostname.

Then query that returned name's IPv6-address record:

```bash
nslookup -type=AAAA mailout.example.com. 192.0.2.53
```

The AAAA set must include the original sending IPv6 address. Compressed and expanded IPv6 strings can denote the same address, so compare address values rather than raw text. `2001:db8::25` and `2001:0db8:0:0:0:0:0:25` are equivalent.

If only IPv4 passes, the rollout is not ready for an enabled IPv6 sending path. Repair that path's public identity or deliberately constrain sending through the platform's approved configuration while the repair is completed.

## Send the repair to the right DNS owner

The owner of `example.com` can usually manage `mailout.example.com`'s forward records. Control of the sending IP's reverse zone normally belongs to the address provider or an explicitly delegated reverse-DNS operator. Creating a PTR-shaped record inside your forward zone does not establish that delegation.

For an Amazon EC2 Elastic IP, AWS documents the reverse-DNS operation on the Elastic IP itself and requires the corresponding forward A record first. See [Create a reverse DNS record for email on Amazon EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Elastic_Addressing_Reverse_DNS.html). Other hosting providers have their own process. Identify that owner before changing records.

Provide a concrete change request: sending IP, intended PTR hostname, current forward address set, and the observed mismatch. After the update, query from an approved external resolver or test host as well as internally. A private DNS view can make an internal check pass while recipients still see different public data.

Allow for the previous positive or negative cache lifetime. Save timestamps and repeat the same queries; repeatedly recreating records does not invalidate remote caches.

## Keep mail acceptance checks separate

A mail exchanger, or MX, record tells senders where to deliver incoming mail for a domain. It is not a list of every host allowed to send outbound mail. SMTP's [mail-routing specification](https://www.rfc-editor.org/rfc/rfc5321.html#section-5) describes that recipient-side role. Do not substitute an MX lookup for the sending-IP round trip.

Similarly, FCrDNS does not prove Sender Policy Framework (SPF) authorization, DomainKeys Identified Mail (DKIM) signatures, or Domain-based Message Authentication, Reporting, and Conformance (DMARC) alignment. Those checks establish sender authorization, message-signature validity, and alignment with the visible sending domain. A receiver can reject a message for authentication, reputation, or transport problems even when reverse DNS is correct. Google's [sender guidelines](https://support.google.com/mail/answer/81126?hl=en) list requirements beyond DNS.

Record a pass for each actual egress IP only after its public PTR name resolves back to that address in the appropriate family. Then perform the mail platform's controlled delivery test and examine the receiving result. Keep the DNS evidence with the sending-IP inventory so that a future relay change, address replacement, or IPv6 rollout cannot silently invalidate the check.
