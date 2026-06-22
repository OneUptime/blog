# Validation Summary: How to Implement IPv6 Anycast for Global Load Distribution

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- IPv6 and Anycast routing concepts
- BGP (Border Gateway Protocol)
- BIRD Internet Routing Daemon (2.x)
- FRRouting (FRR)
- ExaBGP (programmatic BGP / health-check driven announcements)
- BFD (Bidirectional Forwarding Detection)
- RPKI / ROA (Routinator, rpki-client)
- BGP communities & traffic engineering (NO_EXPORT, blackhole, AS prepending)
- Python (FastAPI health endpoints, asyncpg, redis.asyncio, psutil)
- Prometheus / bird_exporter monitoring & alerting
- DNS (AAAA records, TTL strategy)
- nftables, BGP Flowspec, RTBH (DDoS mitigation)
- Cloud anycast: AWS Global Accelerator, GCP Cloud Load Balancing, Azure Front Door
- RIR allocation (ARIN, RIPE, APNIC)

## Sources Consulted
- FRR APT repository setup — https://deb.frrouting.org/ (signed-by keyring method)
- FRRouting documentation — https://docs.frrouting.org/
- BIRD User Guide — https://bird.network.cz/doc/
- Routinator manual page — https://routinator.docs.nlnetlabs.nl/en/stable/manual-page.html
- rpki-client(8) — https://man.openbsd.org/rpki-client and https://www.rpki-client.org/
- CAIDA BGPStream / bgpreader docs — https://bgpstream.caida.org/docs/tools/bgpreader
- RFC 7999 (well-known BLACKHOLE community 65535:666), RFC 7454 (BGP operations & security), RFC 6177 (IPv6 address assignment to end sites)
- redis-py asyncio (redis.asyncio) — supersedes the deprecated standalone aioredis package

## Issues Found
1. **Deprecated FRR repository setup (apt-key / keys.asc).** The install used `curl ... keys.asc | sudo apt-key add -`. `apt-key` is deprecated (removed in recent Debian/Ubuntu) and the current FRR docs publish `keys.gpg`. Replaced with the official signed-by keyring method:
   `curl -s https://deb.frrouting.org/frr/keys.gpg | sudo tee /usr/share/keyrings/frrouting.gpg > /dev/null` plus a `[signed-by=...]` source line.
2. **Wrong Routinator flag (`--filter-prefix`).** `routinator vrps` has no `--filter-prefix` option; the correct flag is `--select-prefix` (alias `-p`). Fixed in the RPKI verification example.
3. **Incorrect BGPStream CLI invocation (`bgpstream -p`).** The CAIDA command-line tool is `bgpreader`, not `bgpstream`, and the prefix filter flag is `-k`/`--prefix`, not `-p`. Changed `bgpstream -w ... -p ...` to `bgpreader -w ... -k ...`.
4. **Invalid `rpki-client` prefix-filter usage.** `rpki-client -v 2001:db8:abcd::/48` does not filter by prefix (`-v` is verbose; rpki-client takes no prefix argument). Replaced the troubleshooting command with `routinator vrps --select-prefix 2001:db8:abcd::/48`, consistent with the earlier RPKI section.
5. **Deprecated/broken `aioredis` import.** The standalone `aioredis` package is deprecated and fails to import on Python 3.11+. Changed `import aioredis` to `from redis import asyncio as aioredis` (redis-py 4.2+), which keeps the rest of the example (`aioredis.from_url`, `.ping()`, `.close()`) working unchanged.

## Review Notes
- Core anycast/BGP concepts, the unicast/multicast/anycast comparison, and the IPv6 rationale are accurate. BIRD 2.x config (kernel/device/direct/static blackhole protocols, channel-scoped `next hop self`, `graceful restart on`, BFD block) and the FRR config (`no bgp default ipv4-unicast`, address-family activation, route-maps, prefix-lists) are syntactically and semantically correct.
- Community values are correct: BLACKHOLE 65535:666 (RFC 7999) and NO_EXPORT 65535:65281.
- The `ping6` avg-RTT parse (`line.split('/')[4]`) correctly extracts the avg field from the `min/avg/max/mdev` output.
- RIR figures are reasonable approximations. RIPE is described as "/29 minimum for LIRs"; RIPE actually allocates a /32 by default with up to a /29 available without further justification — a defensible simplification, left as-is. Costs are ballpark and may drift over time.
- `datetime.utcnow()` is used in the health endpoint; it is deprecated (not removed) in Python 3.12+ in favor of `datetime.now(timezone.utc)`. Left as-is since it still functions and is illustrative.
- The BIRD export filter using `if proto = "upstream2"` to selectively prepend is illustrative; selecting the target session inside an export filter this way is implementation-dependent and may need a per-neighbor export filter in practice. Not changed.
- Cloud CLI examples (AWS Global Accelerator `--ip-address-type DUAL_STACK`, GCP global IPv6 LB, Azure Front Door) match current provider CLIs at review time, though cloud CLI flags evolve and should be checked against current docs before use.
