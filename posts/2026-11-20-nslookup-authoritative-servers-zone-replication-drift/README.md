# Find DNS Zone Replication Drift with Authoritative nslookup Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Networking, Troubleshooting

Description: Query each authoritative DNS endpoint directly, compare SOA serials and actual records, and distinguish replication drift from delegation, view, and cache differences.

An updated DNS record works for some clients and not others. A recursive resolver answers correctly, so the initial investigation moves on to application caches. Yet another authoritative server may still serve the old record. Different resolvers can reach different authorities and cache different answers.

A useful check visits every advertised authoritative endpoint directly. It compares the record that matters, verifies that the response is authoritative, and records the zone's Start of Authority (SOA) serial. The serial is supporting evidence, not a substitute for comparing data.

This procedure uses documented Windows Server 2025 `nslookup` options and a Bash collection loop suitable for a host with BIND `nslookup`. The BIND reference version is 9.18.33. Replace every example name and address, and run queries from a client permitted to contact the relevant servers.

## Define the zone and audience

First identify the zone containing the failing record. A name such as `api.eu.example.com.` might belong to `example.com.` or to a separately delegated `eu.example.com.` zone. Querying the wrong zone's SOA can produce a reassuring serial that says nothing about the record's actual authority.

Also define the audience. Internal and external DNS views may intentionally contain different records. Compare authorities serving the same intended view from the same client context. Microsoft's [DNS zone documentation](https://learn.microsoft.com/en-us/windows-server/networking/dns/zone-types) explains the zone boundary and the distinction between primary, secondary, and Active Directory-integrated storage.

For the example below, assume the affected record is `api.example.com.` and its zone is `example.com.`. The client is checking that zone's intended public view using approved diagnostic paths.

## Build the authoritative endpoint list

Start by obtaining the zone's name-server records through an approved resolver:

```bash
nslookup -type=NS example.com. 10.20.0.53
```

Treat this result as a discovery aid, because the resolver can have cached an old delegation. Compare it with the DNS provider's configured authorities and, for a delegated public zone, the parent zone's delegation. The parent tells resolvers where to go; the child zone also publishes its own NS records. RFC 1034 describes [delegation and zone authority](https://www.rfc-editor.org/rfc/rfc1034.html#section-4.2).

Resolve every advertised server name to all of its A and AAAA addresses. For example:

```bash
nslookup -type=A ns1.example.net. 10.20.0.53
nslookup -type=AAAA ns1.example.net. 10.20.0.53
```

Repeat for each server name. Save the mapping between server names and addresses. If parent glue, resolved addresses, and provider inventory disagree, investigate that discrepancy rather than quietly selecting the convenient address.

Use the union of the currently advertised endpoints and the expected configured endpoints for the investigation. An obsolete server still present in the delegation can explain intermittent failures even if it no longer appears in the deployment inventory.

## Query the data without recursive assistance

Ask each endpoint directly for the SOA and the affected record:

```bash
nslookup -debug -norecurse -type=SOA example.com. 192.0.2.10
nslookup -debug -norecurse -type=A api.example.com. 192.0.2.10
```

The IP address is a documentation placeholder. `-norecurse` avoids asking the target to resolve through other servers on your behalf. Debug output exposes response details. The [Microsoft nslookup reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup) and [recursion option](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-recurse) document these controls.

Check the authoritative-answer flag, often abbreviated `AA` or displayed as an authoritative-answer label. An answer without that indication, a referral, a refusal, or a timeout does not count as a matching authoritative copy. Record it separately.

For a CNAME alias, distinguish the authoritative alias from its target. A target in another zone has its own authorities and needs a separate investigation. Do not mistake the absence of a recursively obtained target address for a missing alias record.

## Collect every endpoint consistently

This Bash example preserves full command output and continues after a failed endpoint. Replace the names and the entire address list. Include every verified address; the four below are documentation examples, not reachable test servers.

```bash
zone='example.com.'
record='api.example.com.'
failed=0

for dns_server in 192.0.2.10 192.0.2.20 2001:db8::10 2001:db8::20; do
    printf '\nDNS endpoint: %s\n' "$dns_server"
    if ! nslookup -debug -norecurse -type=SOA "$zone" "$dns_server"; then
        printf 'SOA query failed for %s\n' "$dns_server" >&2
        failed=1
    fi
    if ! nslookup -debug -norecurse -type=A "$record" "$dns_server"; then
        printf 'Record query failed for %s\n' "$dns_server" >&2
        failed=1
    fi
done

exit "$failed"
```

Run it as a saved script, so its final `exit` does not close an interactive shell. Record the run's time and client location alongside its output. Exit status 1 indicates at least one command failed; status 0 does not certify matching contents or authoritative flags. Review those fields explicitly. The [BIND nslookup manual](https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility) documents command exit status.

An unreachable IPv6 endpoint is an incomplete coverage result, not proof of a broken zone. Repeat from an approved client with the required connectivity and identify which endpoint was actually tested.

## Interpret serials alongside records

Create a table with endpoint, authoritative status, SOA serial, response code, record values, and TTL. Compare address sets independently of their order; DNS answers can present multiple addresses in different orders.

For a conventional primary/secondary zone, the SOA serial helps a secondary decide whether to transfer newer data. BIND's [zone-transfer explanation](https://bind9.readthedocs.io/en/v9.18.33/chapter3.html) describes that exchange. If one secondary has an older serial and still returns the previous address, transfer lag is a strong candidate.

Equal serials do not prove identical records. A deployment error can change content without correctly advancing the serial, and a few sample queries cannot prove the whole zone matches. Inspect the actual affected record and additional recent changes.

Serials are unsigned 32-bit sequence numbers with wraparound, not arbitrary decimal timestamps. Do not sort them as dates or increase them by a guessed huge amount. [RFC 1982](https://datatracker.ietf.org/doc/html/rfc1982) defines the comparison rules.

Active Directory-integrated zones need another caution. Microsoft documents that multi-master replication can produce different SOA serials across DNS servers. A serial difference alone is therefore insufficient evidence of missing record data. Review the actual records and Active Directory replication health using the [AD-integrated serial-number guidance](https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/ad-integrated-dns-zone-serial-no-dot-behavior).

## Investigate the mechanism that is behind

For a conventional secondary, examine its configured primary, transfer permissions, connectivity, refresh attempts, and transfer logs. For Active Directory-integrated data, investigate the relevant directory replication path and partition. If the data differs by client location, revisit view selection before treating the discrepancy as replication failure.

Do not start by forcing a transfer or editing serials on every server. Preserve the comparison and determine which copy represents the intended change. Microsoft's [DNS server troubleshooting guide](https://learn.microsoft.com/en-us/windows-server/networking/dns/troubleshoot/troubleshoot-dns-server) separates authoritative-data problems from recursive-resolution problems.

After the repair, repeat the same endpoint matrix and the affected record queries. Then check recursive resolvers and the application, since earlier answers may remain cached. If an address uses anycast, one query reaches one routed instance, not every physical backend; provider telemetry or tests from multiple locations may still be needed. [RFC 4786](https://datatracker.ietf.org/doc/html/rfc4786) explains how routing selects an anycast service instance.

The completion claim should match the coverage: all listed endpoints returned the expected authoritative records from the tested locations. That is stronger evidence than one successful recursive lookup, while remaining honest about untested records and hidden infrastructure.
