# Decode NXDOMAIN, SERVFAIL, REFUSED, and nslookup Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Networking, Troubleshooting

Description: Classify nslookup failures by DNS response code and transport behavior, then choose a focused check for missing names, resolver errors, access policy, or packet loss.

“DNS failed” is not yet a diagnosis. A server can say that a name does not exist, decline to answer a client, or fail while resolving the question. A request can also disappear without a usable response. Those cases require different evidence and different repairs.

Start by classifying the failure before flushing caches, replacing resolvers, or editing records. The examples below use Windows Server 2025's documented `nslookup` options, with BIND 9.18.33 documentation where resolver behavior is discussed. Replace the names and server addresses with approved values for your environment.

## Capture one unambiguous question

Run a direct query with an explicit record type and an absolute name:

```bash
nslookup -debug -type=A app.corp.example. 10.20.0.53
```

The final dot prevents a search suffix from changing the name. `A` selects an IPv4-address record, and the last argument chooses the DNS server. Save the whole output with the time, client, and VPN state. Debug mode helps expose the response code, question, and answer sections. See the [Microsoft nslookup reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup).

Read the output belonging to the application question. A preliminary reverse lookup for the DNS server's own name can generate separate messages. Likewise, “Non-authoritative answer” describes the responder's authority for the question; it is not one of the failure categories below.

A DNS response includes a response code, abbreviated RCODE. The basic codes are defined in [RFC 1035](https://www.rfc-editor.org/rfc/rfc1035.html#section-4.1.1). A local timeout is not an RCODE because the tool did not obtain a usable reply in time.

| Result | What it says | First useful check |
| --- | --- | --- |
| NXDOMAIN, code 3 | The queried name was reported nonexistent | Exact name, DNS view, and authoritative data |
| SERVFAIL, code 2 | The server could not complete the query | Resolver processing and upstream dependencies |
| REFUSED, code 5 | The server declined the operation | Query policy and intended server role |
| Timeout | No usable response arrived within the tool's wait | Destination, path, transport, and timing |
| NOERROR, code 0, no requested record | The requested type may be absent | Record type and negative-response details |

## NXDOMAIN: investigate the name that was actually asked

NXDOMAIN is a response, so something answered. Do not treat it as evidence that the DNS server is unreachable. Compare the question in the output with the intended name, including any service labels such as `_ldap._tcp`.

Then check the appropriate authoritative servers directly. For a known authority in the same intended DNS view:

```bash
nslookup -debug -norecurse -type=A app.corp.example. 10.20.1.10
```

The address is a placeholder. Confirm that the response is authoritative, and repeat for the other authorities. If they also report the name missing, inspect publication and zone selection. If they return the expected address while the recursive resolver returns NXDOMAIN, inspect the negative response's SOA record and remaining lifetime.

A recently created name can remain hidden behind a cached negative answer. RFC 2308 describes [NXDOMAIN and negative caching](https://datatracker.ietf.org/doc/html/rfc2308). It also distinguishes NODATA: the name can exist while the requested record type does not. An existing A record does not guarantee an AAAA record, for example.

Do not recreate a correct authoritative record merely because one resolver has not refreshed its earlier answer.

## SERVFAIL: inspect the resolver's work

SERVFAIL means the server could not produce a successful result. It is not a precise statement that a database is corrupt or that the name does not exist. Possible causes include unreachable authorities, forwarding problems, delegation errors, and failed DNS Security Extensions (DNSSEC) validation.

DNSSEC lets a validating resolver check signed DNS data. A validation failure can therefore make a resolver reject data that a direct, nonvalidating query appears to retrieve. Cloudflare's [DNSSEC troubleshooting guide](https://developers.cloudflare.com/dns/dnssec/troubleshooting/) describes validation-related SERVFAIL investigations.

Use a known-good name in the same relevant zone as a control, then compare another approved resolver without changing the client's configuration:

```bash
nslookup -debug -type=A known-good.corp.example. 10.20.0.53
nslookup -debug -type=A app.corp.example. 10.20.0.54
```

Replace the control with a record whose expected answer is verified. If only one name fails, investigate its chain of aliases, delegation, and signatures. If many names fail through one resolver, investigate that resolver's upstream connectivity and health. A different result from the second resolver is evidence to explain, not permission to disable validation or permanently bypass policy.

Collect resolver logs or Extended DNS Error details when supported. [RFC 8914](https://www.rfc-editor.org/rfc/rfc8914.html) defines additional error information that can explain failures more precisely than SERVFAIL alone. Availability depends on the resolver and diagnostic tool; absence from `nslookup` output does not prove no additional detail exists.

Also account for cached resolution failures. [RFC 9520](https://datatracker.ietf.org/doc/html/rfc9520) specifies failure-caching behavior. Repeating a query immediately may return a cached failure rather than trigger a new upstream attempt.

## REFUSED: check policy before opening access

A DNS REFUSED response means the server declined the query. An authoritative-only server may refuse recursive work for an unrelated zone. A recursive resolver may permit only specific client networks. A VPN or gateway change can alter the source address the DNS server sees and therefore the policy that matches.

Verify that the selected server is intended to answer this client and this kind of query. Compare an authorized client, the configured query permissions, and the server's logs. BIND documents separate query and recursion access controls in its [9.18.33 configuration reference](https://bind9.readthedocs.io/en/v9.18.33/reference.html).

Do not turn a refusal into an unrestricted public recursive service just to make a test pass. Correct the specific intended client rule or choose the proper endpoint through the normal configuration process.

Keep DNS REFUSED separate from “connection refused.” The latter is a transport or connection failure, not the same DNS response code. Microsoft's [nslookup error descriptions](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup) distinguish the two.

## Timeout: investigate the round trip

A timeout says the tool did not receive a usable answer before its retry budget ended. It does not identify where the failure occurred. The request might never leave the client, reach the wrong destination, be silently dropped, wait on an overloaded server, or lose its response on the return path.

Confirm the server IP and expected port, then compare another authorized client. A successful ping tests a different protocol and does not demonstrate that DNS queries work.

To compare a connection-oriented DNS query, start an interactive session:

```bash
nslookup - 10.20.0.53
```

Then enter:

```text
set type=A
set vc
app.corp.example.
exit
```

`set vc` requests TCP. Microsoft documents the [virtual-circuit switch](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-vc), and the [BIND manual](https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility) identifies that transport. If ordinary queries time out but TCP succeeds, investigate transport-specific handling; do not assume the DNS records need changing.

For unresolved cases, correlate a narrowly scoped packet capture with server logs and the recorded timestamps. Distinguish a request that never arrives from a response that never returns.

## Make the escalation specific

Send the responsible team the exact name and type, destination server, client network context, timestamp, response code or timeout, and the control comparison. State the next hypothesis: wrong authoritative data, failed resolution dependency, query-policy mismatch, or transport failure.

After the repair, repeat the same controlled query and the original application operation. Preserve the before-and-after results. This establishes that the failure category changed for a reason, rather than merely showing that a different resolver happened to return an address.
