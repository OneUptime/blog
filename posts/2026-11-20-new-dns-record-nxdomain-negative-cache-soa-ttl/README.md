# Trace NXDOMAIN After Adding a DNS Record with nslookup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Networking, Troubleshooting

Description: Compare authoritative DNS answers with cached NXDOMAIN responses, inspect the SOA negative TTL, and distinguish normal expiry from a record published in the wrong zone.

You create a DNS record, confirm it in the management console, and still receive NXDOMAIN from a client. Recreating the record does not help. Lowering its TTL to 30 seconds does not help either. The client may be receiving an older answer that says the name does not exist.

That answer can be cached too. The investigation is to prove where the new record is available and where the older negative answer remains. Calling the entire delay “propagation” hides the distinction between a publication problem and an ordinary cache lifetime.

The examples use Windows Server 2025's documented `nslookup` options. BIND 9.18.33 documentation provides the resolver-configuration reference. All names and addresses are placeholders: use the affected name, its actual recursive resolver, and the authoritative server addresses supplied by your DNS owner.

## Understand which lifetime matters

TTL means time to live: how long a DNS answer may be retained in a cache. A new A record's TTL controls caching of that positive address answer. It does not retroactively control an earlier NXDOMAIN response.

Negative answers normally carry a Start of Authority, or SOA, record for the relevant zone. For negative caching, RFC 2308 specifies a lifetime based on the smaller of the SOA record's TTL and its MINIMUM field. The SOA included in the negative response carries the resulting TTL, which decreases while cached. See [RFC 2308, sections 3 and 5](https://datatracker.ietf.org/doc/html/rfc2308).

For example, an SOA TTL of 600 seconds and a MINIMUM value of 900 seconds yield a 600-second initial negative lifetime before resolver-specific limits. The MINIMUM field is inside the SOA data; it is not the same field as the TTL attached to that record.

AWS's [SOA documentation](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/SOA-NSrecords.html) also explains the smaller-of-two-values calculation and the tradeoff between reducing negative caching and increasing queries. A very small positive-record TTL cannot expire an already cached negative answer.

## Freeze the question and identify the responders

Choose one exact name and record type. For an IPv4 address, use an A query and include a trailing dot on the name:

```bash
nslookup -debug -type=A newapp.corp.example. 10.20.0.53
```

Here `10.20.0.53` represents the affected client's recursive resolver, the server that looks up and caches answers on the client's behalf. The explicit destination avoids accidentally comparing different servers between runs. Debug mode adds packet details; Microsoft documents it in the [nslookup reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup) and [debug option](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-debug).

Save the timestamp, responding server, question name, question type, response code, and authority section. Make sure you are reading the answer for `newapp.corp.example.`, not a preliminary reverse lookup used to identify the DNS server.

NXDOMAIN indicates a nonexistent name. A response with `NOERROR` but no requested record is a different case, often called NODATA. Do not label every empty answer NXDOMAIN. RFC 2308 distinguishes [name errors from missing record types](https://datatracker.ietf.org/doc/html/rfc2308#section-2).

## Establish the authoritative answer

The authoritative servers hold the zone's published records. Obtain their addresses from the DNS administrator or the verified zone configuration. For the example, assume they are `10.20.1.10` and `10.20.1.11`, and that direct queries are permitted from this diagnostic client.

```bash
nslookup -debug -norecurse -type=A newapp.corp.example. 10.20.1.10
nslookup -debug -norecurse -type=A newapp.corp.example. 10.20.1.11
```

`-norecurse` asks these servers to answer without recursively resolving the question elsewhere. Look for the expected address and the authoritative-answer indicator in debug output. A referral or a non-authoritative cached answer is not the evidence this step needs. Microsoft's [recursion option](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-recurse) and [DNS server troubleshooting guide](https://learn.microsoft.com/en-us/windows-server/networking/dns/troubleshoot/troubleshoot-dns-server) support this separation of authoritative data from recursive processing.

If one authority still returns NXDOMAIN, investigate publication or replication before waiting for caches. If neither knows the record, check the zone, spelling, deployment status, and DNS view. A management-console entry in a private zone will not make the same name exist in an unrelated public zone. AWS's [NXDOMAIN troubleshooting guidance](https://repost.aws/knowledge-center/route-53-troubleshoot-nxdomain-responses) similarly checks authority and delegation as well as caching.

If all intended authorities answer correctly while the recursive resolver returns NXDOMAIN, negative caching is now a strong candidate. It is still a hypothesis until you inspect the negative response and its lifetime.

## Read the SOA in the negative response

In the recursive resolver's debug output, find the SOA under the authority section. Record its owner name and displayed TTL. The owner identifies the zone responsible for the negative answer; an unexpected owner can expose a wrong delegation or DNS view.

You can separately inspect the current SOA at an authoritative server:

```bash
nslookup -debug -norecurse -type=SOA corp.example. 10.20.1.10
```

That query helps check the current configuration, including the serial and MINIMUM field. It does not reveal the remaining lifetime of the negative answer already stored in another resolver. Use the SOA TTL in the actual negative response for that observation.

Consider this hypothetical timeline, assuming a single cache and no refresh or policy changes:

| Time | Event | Expected implication |
| --- | --- | --- |
| 12:00 | Resolver caches NXDOMAIN with TTL 600 | It may retain the answer until roughly 12:10 |
| 12:02 | Record is published on every authority | New authoritative queries return the record |
| 12:03 | Client queries the same resolver | Cached negative TTL is roughly 420 |
| 12:10 | Negative lifetime expires | A subsequent successful refresh can discover the new record |

Changing the new A record's TTL at 12:03 does not alter the negative response cached at 12:00. Likewise, changing the authoritative SOA now does not rewrite copies already held elsewhere.

## Follow the countdown, then challenge the hypothesis

Repeat the exact recursive query after a measured interval. A decreasing negative TTL supports the cache explanation. Record the observed values instead of promising users a universal deadline.

A countdown that jumps back upward deserves investigation. The resolver may have several cache instances behind one address, an upstream forwarder may still obtain negative answers, or some authorities may disagree. Compare destinations and server logs before deciding that the TTL is being ignored.

Resolver policy also matters. BIND 9.18.33 documents `min-ncache-ttl` and `max-ncache-ttl`, which bound negative retention. Its [configuration reference](https://bind9.readthedocs.io/en/v9.18.33/reference.html) is the right place to check a BIND deployment's settings. Do not assume the authoritative values alone describe every cache in the path.

## Recover at the layer holding the stale answer

If authoritative data is wrong, correct that first. If it is correct and the remaining negative lifetime is short, waiting may be the least disruptive recovery. If an urgent invalidation is needed, ask the resolver operator for the narrowest supported cache action and preserve the diagnostic output first.

Flushing the Windows client cache does not flush a recursive resolver. Microsoft documents [Clear-DnsClientCache](https://learn.microsoft.com/en-us/powershell/module/dnsclient/clear-dnsclientcache?view=windowsserver2025-ps) as a local operation. A browser or application can also retain its own state, so finish by retesting the affected application after the resolver answers correctly.

For future launches, publish and verify required names before clients begin querying them. When planning lower negative-cache lifetimes, make the change early enough for previous lifetimes to expire and assess the added query load. The useful completion evidence is a matching authoritative answer, a matching recursive answer, and a successful application lookup, each recorded with its time and resolver context.
