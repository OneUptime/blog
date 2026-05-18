# Validation Summary: How to Set Up Knot DNS on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Knot DNS (authoritative DNS server)
- Ubuntu Linux
- YAML configuration
- DNS zone files (BIND format)
- DNSSEC (ECDSAP256SHA256, KSK/ZSK)
- TSIG (hmac-sha256)
- Zone transfers (AXFR/IXFR)
- systemd
- dig (DNS query tool)
- keymgr (Knot DNS key management)

## Sources Consulted
- [Knot DNS Documentation — knotc man page](https://www.knot-dns.cz/docs/latest/html/man_knotc.html)
- [Knot DNS Documentation — keymgr man page](https://www.knot-dns.cz/docs/latest/html/man_keymgr.html)
- [Knot DNS Documentation — Operation](https://www.knot-dns.cz/docs/latest/html/operation.html)
- [Knot DNS Documentation — Modules / mod-stats](https://www.knot-dns.cz/docs/latest/html/modules.html)
- [CZ.NIC Labs Knot DNS PPA — current stable (knot-dns-latest)](https://launchpad.net/~cz.nic-labs/+archive/ubuntu/knot-dns-latest)
- [CZ.NIC Labs Knot DNS PPA — previous stable (knot-dns)](https://launchpad.net/~cz.nic-labs/+archive/ubuntu/knot-dns)
- [CZ.NIC Labs Repos Setup Docs](https://pkg.labs.nic.cz/doc/?project=knot-dns)

## Issues Found

1. **`knotc version` is not a valid subcommand.** `knotc` does not have a `version` action. The correct way to print the version is `knotc -V` (or `knotc --version`). Replaced `knotc version` with `knotc -V`.

2. **`knotc zone-list` does not exist.** There is no `zone-list` action in `knotc`. Replaced with `knotc conf-read zone.domain`, which is the documented way to enumerate configured zones.

3. **`knotc zone-ksk-status` does not exist.** No such command is documented. To obtain a DS record for submission to the registrar, the correct tool is `keymgr <zone> ds`. Replaced `sudo knotc zone-ksk-status example.com` with `sudo keymgr example.com ds`.

4. **Invalid stats metrics referenced.** `resolver.answer-nodata` is a Knot Resolver metric and does not apply to the Knot DNS authoritative server. `server.query-received` is not a built-in default metric — only `server.zone-count` and similar are available without enabling the `mod-stats` module. Rewrote the stats examples to use valid commands: `knotc stats server.zone-count`, `knotc zone-stats example.com`, and `knotc stats mod-stats` (with a note that detailed query metrics require enabling the `mod-stats` module). Also updated the `watch` example to use a valid metric.

## Review Notes

- The `ppa:cz.nic-labs/knot-dns` PPA referenced in the install section is real — it is CZ.NIC's "previous stable" official PPA. CZ.NIC also publishes `ppa:cz.nic-labs/knot-dns-latest` (current stable) and `ppa:cz.nic-labs/knot-dns-experimental`. The post's choice is valid but slightly conservative; either name works.
- The duplicate `sudo apt install -y knot` in the install section (once for the PPA path, once for "Ubuntu's default repositories") is intentional as written — the user enables the PPA in one path and falls back to defaults in the other. Left as-is since it is not technically incorrect.
- The YAML configuration uses `dnssec-signing: on` — `on` is interpreted as boolean true by Knot's parser, which accepts both `on/off` and `true/false`. Valid as written.
- The default `policy.manual` value is already `off`, so `manual: false` is redundant but not incorrect.
- The `_http._tcp` SRV record example is syntactically valid, though HTTP SRV records are uncommon in practice. Left as-is since the syntax is correct and the post explicitly labels it as an example.
- `zonefile-load: difference-no-serial` is a valid Knot option; valid choices are `none`, `difference`, `difference-no-serial`, and `whole`.
- The `keymgr -t transfer-key hmac-sha256` syntax for generating a TSIG key is correct per the official keymgr documentation.
