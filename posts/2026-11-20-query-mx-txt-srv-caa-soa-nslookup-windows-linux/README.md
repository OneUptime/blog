# Query MX, TXT, SRV, CAA, and SOA Records with nslookup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Networking, Troubleshooting

Description: Use explicit DNS record types on Windows and Linux, read the important fields, and handle CAA tool compatibility without confusing a client error with missing data.

A default hostname lookup usually answers an address question. It will not tell you which server receives a domain's mail, which port a service advertises, or which certificate authorities may issue a certificate. Those questions require different DNS record types, often at different owner names.

The basic diagnostic pattern stays the same: select the type, write the complete owner name with a final dot, and choose the DNS server explicitly. The interpretation changes with the record. This guide explains what to inspect after each command instead of treating any printed answer as success.

## Set the platform and query context

The Windows examples follow Microsoft's Windows Server 2025 command documentation. The Linux discussion uses BIND 9.18.33's utility documentation and tagged source. Windows and BIND utilities share the name `nslookup`, but their supported options and record-type parsing are not identical.

Use `192.0.2.53` below as a placeholder for an approved resolver. Replace every example domain with the name you are investigating. Do not send private infrastructure names to a public resolver just because it is convenient.

Microsoft documents [query-type selection](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-querytype) and the command-line `-type=` option in its [nslookup reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup). For BIND, consult the [9.18.33 manual](https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility).

| Type | Question answered | Typical owner name |
| --- | --- | --- |
| MX | Which hosts receive mail for this domain? | `example.com.` |
| TXT | What text data is published at this exact name? | `example.com.` or a service-specific name |
| SRV | Which host and port provide a named service? | `_ldap._tcp.corp.example.` |
| CAA | What certificate-issuance policy is published here? | `www.example.com.` or an ancestor |
| SOA | What administrative and timing data describes this zone? | `example.com.` |

## MX: inspect preference and the mail host

Query the recipient domain's mail exchanger records:

```bash
nslookup -type=MX example.com. 192.0.2.53
```

An MX answer contains a preference number and a hostname. Smaller numbers are preferred. With preferences 10 and 20, the host at 10 is normally tried before the host at 20. The target is a hostname, not an IP address, so inspect its A and AAAA records separately if delivery fails.

Do not confuse an MX preference with an SRV weight. MX records describe incoming mail routing, not authorization for outbound senders. SMTP's [routing procedure](https://www.rfc-editor.org/rfc/rfc5321.html#section-5) explains how these records are used.

A special answer, `0 .`, is a null MX: the domain explicitly advertises that it accepts no mail. It is different from merely having no MX record. [RFC 7505](https://www.rfc-editor.org/rfc/rfc7505.html) defines that distinction. Escalate an unexpected null MX to the domain owner instead of trying to resolve the dot as a mail host.

## TXT: query the exact owner and preserve record boundaries

Start with the name that should hold the text:

```bash
nslookup -type=TXT example.com. 192.0.2.53
nslookup -type=TXT _dmarc.example.com. 192.0.2.53
```

These are two different owner names. A successful query at the domain apex does not establish that the `_dmarc` policy exists. Likewise, a DomainKeys Identified Mail key commonly uses a selector-specific owner such as `selector1._domainkey.example.com.`; use the selector configured by the mail system. The owner-name conventions are specified in [DKIM section 3.6.2.1](https://www.rfc-editor.org/rfc/rfc6376.html#section-3.6.2.1) and [DMARC section 6.1](https://www.rfc-editor.org/rfc/rfc7489.html#section-6.1).

A TXT record can contain multiple quoted character strings. Some applications, including Sender Policy Framework (SPF), interpret those strings as one value joined without inserting extra spaces. [RFC 7208 section 3.3](https://www.rfc-editor.org/rfc/rfc7208.html#section-3.3) explains that SPF handling.

Keep separate TXT records separate. Do not concatenate all the text returned at a name and call it one policy. Save the raw output and compare it with the publishing system's intended value, especially for long keys or verification tokens. A matching TXT lookup demonstrates publication, not that the consuming service has accepted the policy.

## SRV: preserve the service labels and read all four fields

A service-location record usually lives under a name beginning with service and transport labels:

```bash
nslookup -type=SRV _ldap._tcp.corp.example. 192.0.2.53
```

The underscores are part of the owner name. Querying `corp.example.` for SRV records is not the same question. Microsoft demonstrates SRV lookup in its [DNS-record verification instructions](https://learn.microsoft.com/en-us/skypeforbusiness/deploy/install/create-dns-records).

Read the priority, weight, port, and target together. Lower priority values are preferred. Weight influences selection among records sharing a priority; it is not another priority number. The port tells the client where to connect, and the target identifies the host. [RFC 2782](https://www.rfc-editor.org/rfc/rfc2782.html) defines these fields and the selection procedure.

For an illustrative record containing `10 50 389 ldap1.corp.example.`, record all four values. Then check the target's address records and the service's reachability. DNS advertisement alone does not show that the advertised port is listening or that authentication succeeds.

## CAA: check utility support before interpreting the answer

Certification Authority Authorization, or CAA, lets a domain publish certificate-issuance constraints. For BIND `nslookup`, query the exact certificate name:

```bash
nslookup -type=CAA www.example.com. 192.0.2.53
```

BIND 9.18.33 uses its DNS record-type parser in [nslookup's tagged source](https://github.com/isc-projects/bind9/blob/v9.18.33/bin/dig/nslookup.c), and includes a [CAA type implementation](https://github.com/isc-projects/bind9/blob/v9.18.33/lib/dns/rdata/generic/caa_257.c).

Do not assume that every Windows `nslookup` build accepts the same CAA syntax. Microsoft's query-type reference does not document CAA support. If your executable rejects the type, that is a client capability issue, not a DNS response saying no CAA exists. Use an approved BIND utility environment with the required network access. Do not assume replacing `CAA` with a numeric string makes an unsupported Windows client work.

A CAA value contains flags, a property tag, and a value. Common tags include `issue` for issuance policy and `issuewild` for wildcard issuance policy. The flags field is not a priority. [RFC 8659](https://www.rfc-editor.org/rfc/rfc8659.html) defines the format and policy evaluation.

An empty CAA answer at `www.example.com.` does not by itself establish unrestricted issuance. Evaluation can involve aliases and parent names. Inspect the applicable hierarchy and use the certificate authority's diagnostics when investigating a refusal. Do not delete policy records merely to make issuance proceed.

## SOA: ask for the zone, not an arbitrary host

The Start of Authority record describes a zone:

```bash
nslookup -debug -type=SOA example.com. 192.0.2.53
```

Inspect the primary-server name, responsible-mailbox field, serial, refresh, retry, expiry, and minimum fields. The mailbox field uses DNS-name notation rather than an ordinary email address. The [SOA definition in RFC 1035](https://www.rfc-editor.org/rfc/rfc1035.html#section-3.3.13) explains the structure.

The serial supports zone-version comparisons; it is not necessarily a date. Refresh, retry, and expiry relate to secondary-zone maintenance. The SOA MINIMUM field also participates in negative-cache lifetime calculation under [RFC 2308](https://datatracker.ietf.org/doc/html/rfc2308). Do not use one of these values interchangeably with the TTL attached to an individual A record.

## Finish with the question you intended to test

For any type, preserve the responder, exact question, response code, answer, and time. Add `-debug` when you need the DNS response details. A timeout, a rejected type, NXDOMAIN, and a successful response without the requested record are different outcomes.

Avoid using `ANY` as a universal inventory query. Servers may deliberately return minimal answers, as specified in [RFC 8482](https://www.rfc-editor.org/rfc/rfc8482.html). Query each required type at its actual owner name.

If the resolver's result conflicts with the configuration, compare the correct authoritative servers for the same DNS view. Then test the consuming service separately. The practical result is a documented answer to a specific DNS question, plus a clear next step when that answer does not match the intended configuration.
