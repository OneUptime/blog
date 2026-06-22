# Validation Summary: How to Set Up IPv6 Network Monitoring with OneUptime

## Status
validated

## Post Type
Guide / Tutorial — a configuration walkthrough for setting up IPv6 network monitoring with OneUptime, including CLI diagnostics, Docker/Kubernetes probe deployment, and alerting/incident-management practices.

## Technologies Covered
- IPv6 / dual-stack networking (addressing, Path MTU Discovery, ICMPv6, 6to4/Teredo tunneling)
- OneUptime monitors (IP, Port, Website, SSL Certificate, Synthetic)
- OneUptime self-hosted probes (Docker and Kubernetes deployment)
- Linux IPv6 diagnostic tooling (ping6, traceroute6, dig, openssl s_client, curl, ip)
- Kubernetes Deployment manifests

## Sources Consulted
- OneUptime monitor type definitions: `oneuptime/Common/Types/Monitor/MonitorType.ts` (confirmed Website, IP, Port, SSLCertificate, SyntheticMonitor all exist)
- OneUptime custom/self-hosted probe documentation: `oneuptime/App/FeatureSet/Docs/Content/en/probe/custom-probe.md` (required env vars and image tag)
- Repo-wide probe image tag usage (`grep oneuptime/probe:*` → 190× `:release`, 0× `:latest`)
- RFC 4291 (IPv6 Addressing Architecture) for address notation/compression and valid hex digits
- RFC 8200 (IPv6) / RFC 8201 (Path MTU Discovery for IPv6) for the PMTUD + ICMPv6 claim
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation — 2001:db8::/32)
- Cross-checked referenced internal blog posts exist under `posts/`

## Issues Found
1. **Incorrect probe Docker image tag.** The Docker run and Kubernetes examples used `oneuptime/probe:latest`. The official documentation and the entire repo consistently use `oneuptime/probe:release` (190 occurrences; `:latest` is never used). Changed both occurrences to `:release`.
2. **Missing required `PROBE_ID` environment variable.** The probe requires both `PROBE_KEY` and `PROBE_ID` (per the official probe docs "Required Variables"). The Docker run command and Kubernetes Deployment only set `PROBE_KEY`, so the probe would fail to register. Added `PROBE_ID` to the `docker run` command (`-e PROBE_ID=your-probe-id`) and to the Kubernetes env block (sourced from the same secret with key `probe-id`).
3. **Invalid IPv6 example addresses.** Two example "Host" values contained non-hexadecimal characters and are therefore not valid IPv6 addresses: `2001:db8:3::cache` (`h` is not a hex digit) and `2001:db8:4::mq` (`m`/`q` are not hex digits). Since the post itself states OneUptime validates addresses before saving, these were replaced with valid documentation-range addresses (`2001:db8:3::3` and `2001:db8:4::4`). The other examples (`2001:db8:1::80`, `2001:db8:2::db`) are valid hex and were left unchanged.

## Review Notes
- IPv6 technical claims are accurate: address compression example (full vs compressed `2001:db8:85a3::8a2e:370:7334`) is correct; the PMTUD/ICMPv6 dependency is correct; the MTU test payload of 1452 bytes (1500 − 40 IPv6 header − 8 ICMP header) is correct; Google public IPv6 DNS `2001:4860:4860::8888` is correct.
- CLI commands (`ping6`, `traceroute6`, `dig AAAA`, `openssl s_client` with bracketed IPv6, `curl -4/-6 -w "%{time_connect}"`, `ip -6 addr show`) are all valid. Note `ping6`/`traceroute6` are the legacy command names; modern iputils/iproute2 also support `ping -6` / `traceroute -6`, but the legacy binaries remain widely available, so no change was required.
- The YAML alert-rule snippets and the JSON assertions block are illustrative pseudo-configuration (clearly framed as examples), not literal OneUptime config schemas, so they were not treated as exact API contracts.
- All four referenced internal blog post URLs map to existing posts in the repo.
