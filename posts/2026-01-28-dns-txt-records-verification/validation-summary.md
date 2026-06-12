# Validation Summary: How to Use DNS TXT Records for Verification

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- DNS TXT records
- Domain ownership verification
- SPF
- DKIM
- DMARC
- ACME DNS-01 challenges
- JavaScript / Node.js DNS APIs
- Python / dnspython
- BIND `dig`

## Sources Consulted
- RFC 1035: Domain Names - Implementation and Specification: https://datatracker.ietf.org/doc/html/rfc1035
- RFC 7208: Sender Policy Framework (SPF): https://datatracker.ietf.org/doc/html/rfc7208
- RFC 6376: DomainKeys Identified Mail (DKIM): https://datatracker.ietf.org/doc/html/rfc6376
- RFC 9989: Domain-Based Message Authentication, Reporting, and Conformance (DMARC): https://datatracker.ietf.org/doc/html/rfc9989
- RFC 9990: DMARC Aggregate Reporting: https://datatracker.ietf.org/doc/html/rfc9990
- Node.js DNS API documentation: https://nodejs.org/api/dns.html
- dnspython resolver documentation: https://dnspython.readthedocs.io/en/latest/resolver-class.html
- Let's Encrypt challenge type documentation: https://letsencrypt.org/docs/challenge-types/
- BIND 9 `dig` manual documentation: https://bind9.readthedocs.io/en/stable/manpages.html
- Google Workspace TXT record verification documentation: https://knowledge.workspace.google.com/admin/domains/about-txt-records
- Microsoft 365 DNS/domain verification documentation: https://learn.microsoft.com/en-us/microsoft-365/admin/get-help-with-domains/information-for-dns-records

## Issues Found
- The DMARC section described SPF and DKIM as if SPF success must be followed by DKIM success. Updated the text and Mermaid diagram to reflect DMARC's actual pass condition: either SPF or DKIM must pass and align with the RFC5322.From domain.
- The DMARC example used the `pct=100` tag, which is obsolete in current DMARC RFC 9989. Removed `pct=100` from the example and breakdown.
- The DMARC `p=reject` explanation and diagram implied unconditional rejection. Updated the wording to indicate it is a requested policy and that receivers may reject or quarantine.
- The Node.js TXT handling flattened TXT chunks instead of joining chunks within each TXT record. Updated examples to join chunks per record, matching Node.js `dnsPromises.resolveTxt()` behavior.
- The propagation example referenced `this.queryServer()` without implementing it. Added a minimal `queryServer()` implementation using `dns.promises.Resolver`.
- The security JavaScript example redeclared `const token` in one code block. Renamed the second variable to `secureToken` so the snippet is syntactically valid.
- The TXT length troubleshooting entry described a 255-character record limit. Updated it to the more precise 255-octet limit per TXT string, with one TXT record able to contain multiple strings.

## Review Notes
JavaScript and Python code blocks were syntax-checked after edits. The post uses illustrative domain/service tokens, which are appropriate examples rather than live credentials.
