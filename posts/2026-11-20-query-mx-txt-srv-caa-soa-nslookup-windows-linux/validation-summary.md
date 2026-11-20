# Validation summary

## Checks

- Shell examples passed bash -n.
- Executed BIND nslookup 9.10.6 against a loopback-only UDP fixture for MX, TXT, SRV, CAA and SOA. Verified wire types 15,16,33,257,6, expected decoded target/text/issuer/serial, and exit 0 for each. TXT fixture contained two character strings in one record.
- Inspected official BIND v9.18.33 nslookup.c record-type parser and caa_257.c implementation. Reviewed Microsoft query options and SRV example plus RFC definitions for record meanings, TXT chunking, null MX, CAA policy and minimal ANY responses.
- Checked metadata and 1280x720 image; visually reviewed complete readable title and branding.

## Limitations

- No Windows runtime or Windows CAA support verified. CAA example is explicitly scoped to BIND; a local unsupported-type error is not interpreted as a negative DNS response.
- Fixtures tested utility query construction and decoding, not a real DNS zone, service connection, mail policy acceptance or certificate issuance. BIND 9.18.33 was source-reviewed; installed 9.10.6 was the executed binary.

## Sources

- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-querytype
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
- https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility
- https://www.rfc-editor.org/rfc/rfc5321.html#section-5
- https://www.rfc-editor.org/rfc/rfc7505.html
- https://www.rfc-editor.org/rfc/rfc6376.html#section-3.6.2.1
- https://www.rfc-editor.org/rfc/rfc7489.html#section-6.1
- https://www.rfc-editor.org/rfc/rfc7208.html#section-3.3
- https://learn.microsoft.com/en-us/skypeforbusiness/deploy/install/create-dns-records
- https://www.rfc-editor.org/rfc/rfc2782.html
- https://github.com/isc-projects/bind9/blob/v9.18.33/bin/dig/nslookup.c
- https://github.com/isc-projects/bind9/blob/v9.18.33/lib/dns/rdata/generic/caa_257.c
- https://www.rfc-editor.org/rfc/rfc8659.html
- https://www.rfc-editor.org/rfc/rfc1035.html#section-3.3.13
- https://datatracker.ietf.org/doc/html/rfc2308
- https://www.rfc-editor.org/rfc/rfc8482.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
