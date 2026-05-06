# Validation Summary: How to Configure AAAA Records in PowerDNS

## Status
validated

## Post Type
Guide

## Technologies Covered
- PowerDNS Authoritative Server
- DNS AAAA records
- IPv6
- `pdnsutil`
- PowerDNS HTTP REST API
- SQL backends (MySQL/MariaDB and PostgreSQL)
- DNS zone files
- `dig`

## Sources Consulted
- PowerDNS Authoritative Server `pdnsutil` manual: https://docs.powerdns.com/authoritative/manpages/pdnsutil.1.html
- PowerDNS Built-in Webserver and HTTP API docs: https://docs.powerdns.com/authoritative/http-api/index.html
- PowerDNS Zones API docs: https://docs.powerdns.com/authoritative/http-api/zone.html
- PowerDNS Domain Metadata docs: https://docs.powerdns.com/authoritative/domainmetadata.html
- PowerDNS Generic SQL Backends docs: https://doc.powerdns.com/authoritative/backends/generic-sql.html
- PowerDNS Generic PostgreSQL backend docs: https://doc.powerdns.com/authoritative/backends/generic-postgresql.html
- PowerDNS Generic MySQL/MariaDB backend docs: https://doc.powerdns.com/authoritative/backends/generic-mysql.html
- PowerDNS Upgrade Notes: https://docs.powerdns.com/authoritative/upgrading.html
- RFC 3596, DNS Extensions to Support IP Version 6: https://datatracker.ietf.org/doc/rfc3596/

## Issues Found
- The post used pre-5.0 `pdnsutil` command syntax such as `list-zone`, `add-record`, `load-zone`, `increase-serial`, `check-zone`, `rectify-zone`, and `delete-rrset`. I updated these to the current documented forms including `zone list`, `rrset add`, `zone load`, `zone increase-serial`, `zone check`, `zone rectify`, and `rrset delete`.
- The `pdnsutil` examples used relative or special record names such as `www`, `mail`, and `@`. Current PowerDNS documentation requires fully qualified absolute names for these commands, and `@` no longer has special meaning there. I updated the examples to `www.example.com`, `mail.example.com`, and `example.com`.
- The overview implied that PowerDNS stores records only in SQL databases. I corrected that to reflect that the Authoritative Server supports multiple backends, including BIND zone files.
- The raw SQL section did not reflect PowerDNS's recommendation to prefer `pdnsutil` or the REST API over direct SQL, and its SQL examples were not portable between MySQL and PostgreSQL as written. I added the official caveat, changed `prio` to `NULL`, changed `disabled` to `false`, and added a `pdnsutil zone rectify example.com` follow-up for DNSSEC-capable setups.
- The verification section described `zone check` as a DNSSEC status check and `zone rectify` as updating NSEC records. I corrected the wording to match the documented behavior: `zone check` validates zone correctness, and `zone rectify` recalculates DNSSEC-related backend metadata after direct backend changes.
- The summary still referenced deprecated `pdnsutil` syntax and implied the same SOA serial handling across all interfaces. I updated it to current syntax and noted that API changes follow `SOA-EDIT-API` rules.

## Review Notes
- PowerDNS 5.0 still recognizes the old `pdnsutil` syntax, but the official upgrade notes recommend switching to the newer object/action syntax.
- When using raw SQL with SQL backends, record and zone names should remain fully qualified without trailing dots, except for the root zone.
- If DNSSEC-capable SQL backends are in use, direct SQL changes can require rectification, and API-triggered rectification depends on `API-RECTIFY` or `default-api-rectify`.
