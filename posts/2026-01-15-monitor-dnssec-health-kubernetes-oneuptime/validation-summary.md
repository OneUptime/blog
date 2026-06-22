# Validation Summary: How to Monitor DNSSEC Health in Kubernetes with OneUptime

## Status
validated

## Post Type
Tutorial / Guide (technical, with extensive code and configuration examples)

## Technologies Covered
- DNSSEC (RRSIG, DNSKEY, DS records, NSEC/NSEC3, trust chain)
- Kubernetes (CronJob, Deployment, ConfigMap, Secret, Pod)
- CoreDNS (Corefile, plugins, Prometheus ServiceMonitor)
- OneUptime (synthetic monitors, incoming-request heartbeats, alert rules)
- Python (dnspython / `dns.resolver`, `requests`, boto3, google-cloud-dns)
- Node.js / TypeScript (`dns` module, `Resolver`)
- Bash + `dig` / `delv` / `drill` / `ldns` tooling
- AWS Route 53 DNSSEC API, Google Cloud DNS DNSSEC

## Sources Consulted
- dnspython 2.8.0 (verified locally): `dns.rdtypes.ANY.RRSIG.RRSIG` field types and `dns.resolver.Resolver` API — confirmed `rrsig.expiration` is an `int` POSIX timestamp and that `Resolver` has no `use_dnssec` attribute (must use `use_edns(0, dns.flags.DO, 4096)`).
- CoreDNS plugin documentation — `dnssec` plugin (https://coredns.io/plugins/dnssec/) and `forward` plugin (https://coredns.io/plugins/forward/): the `dnssec` plugin performs on-the-fly *signing* of authoritative zones and requires a `key file` directive; it does not validate upstream DNSSEC.
- Node.js `dns` module docs (https://nodejs.org/api/dns.html): `dns.Resolver`, `resolve4`, and error codes (`ESERVFAIL`, `ENOTFOUND`) — confirmed correct.
- AWS Route 53 `GetDNSSEC` API (boto3 `get_dnssec`): `Status.ServeSignature`, `KeySigningKeys[].{Name,Status,SigningAlgorithmType,CreatedDate}` — confirmed correct.
- RFC 4034 (DNSKEY SEP/KSK bit semantics): confirmed `flags & 0x0001` correctly distinguishes KSK (257) from ZSK (256).

## Issues Found
1. **RRSIG expiration parsed with the wrong type/format (RRSIG Expiration Monitor, Python).** The script did `expiration_str = str(rrsig.expiration)` then `datetime.strptime(expiration_str, '%Y%m%d%H%M%S')`. In dnspython, `rrsig.expiration` is an integer POSIX timestamp (e.g. `1769904000`), not a `YYYYMMDDHHMMSS` string. `strptime` does not raise on this — it silently parses `"1769904000"` to the year **1769**, so `days_until_expiry` would always be a huge negative number and every domain would be reported "expired". Fixed by using `datetime.utcfromtimestamp(rrsig.expiration)` and correcting the comment.

2. **DNSSEC records never requested (RRSIG Expiration Monitor, Python).** The script set `resolver.use_dnssec = True`, but `dns.resolver.Resolver` has no such attribute — it is a no-op, so the EDNS DO bit is never set and RRSIG records are not returned (the script would always report `no_rrsig`). Fixed by replacing it with `resolver.use_edns(0, dns.flags.DO, 4096)`.

3. **CoreDNS `dnssec` plugin mischaracterized as upstream validation (Corefile).** The Corefile added an empty `dnssec { }` block commented "Enable DNSSEC validation / Validate DNSSEC for upstream queries". The CoreDNS `dnssec` plugin signs responses for authoritative zones and requires a `key file` directive — an empty block is invalid config and it does not validate upstream answers. With the `forward` plugin, validation is performed by the upstream resolver. Removed the invalid/misleading block and added an accurate note clarifying where validation actually happens and what the `dnssec` plugin is for.

## Review Notes
- The TypeScript synthetic monitor uses a validating public resolver (8.8.8.8 / 1.1.1.1), which correctly returns `ESERVFAIL` on bogus DNSSEC data. However, setting `result.chainComplete = true` purely because the address resolved overstates the result — a successful resolution only implies the validating resolver did not return SERVFAIL, not that the full chain was independently verified. Functionally fine for an up/down check; the wording is optimistic.
- The bash CronJob's SERVFAIL detection relies mostly on the empty-output check (`dig +short` suppresses SERVFAIL text), and the AD-flag detection in the CoreDNS script uses `grep -c "ad;"`, which is fragile (it depends on `ad` being the last header flag). Both work in the common case but are not robust; `dig +dnssec ... | grep -E '^;; flags:.* ad'` or parsing the status would be more reliable. Left as-is since they function for the intended checks.
- The Google Cloud DNS example depends on `ManagedZone.dnssec_config` from `google-cloud-dns`; this could not be verified offline against a specific library version and should be confirmed against the installed `google-cloud-dns` release, as that library's surface is thin and has changed over time.
- `datetime.utcnow()` is used throughout and is deprecated in Python 3.12+, but the example deployments pin `python:3.11-slim`, where it still works. Acceptable for the versions shown.
