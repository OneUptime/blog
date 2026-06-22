# Validation Summary: How to Test Your DNSSEC Implementation Before Going Live

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- DNSSEC
- DNS resource records: DNSKEY, DS, RRSIG, NSEC, NSEC3, NSEC3PARAM
- BIND command-line tools: dig, delv, dnssec-dsfromkey
- DNSViz
- Verisign DNSSEC Debugger and DNSSEC Analyzer
- ldns drill
- Unbound unbound-host
- Zonemaster
- Public validating resolvers: Google Public DNS, Cloudflare DNS, Quad9

## Sources Consulted
- RFC 4034: Resource Records for the DNS Security Extensions - https://datatracker.ietf.org/doc/html/rfc4034
- RFC 9364: DNS Security Extensions (DNSSEC) - https://www.rfc-editor.org/rfc/rfc9364.html
- RFC 9904: DNSSEC Cryptographic Algorithm Recommendation Update Process - https://www.rfc-editor.org/info/rfc9904/
- IANA DNSSEC Algorithm Numbers registry - https://www.iana.org/assignments/dns-sec-alg-numbers
- IANA DS Resource Record Digest Algorithms registry - https://www.iana.org/assignments/ds-rr-types
- RFC 4509: Use of SHA-256 in DNSSEC Delegation Signer Resource Records - https://datatracker.ietf.org/doc/html/rfc4509
- RFC 5155: DNSSEC Hashed Authenticated Denial of Existence - https://datatracker.ietf.org/doc/html/rfc5155
- RFC 9276: Guidance for NSEC3 Parameter Settings - https://datatracker.ietf.org/doc/rfc9276/
- BIND 9 local manual pages for dig and delv
- ISC Knowledgebase: dig and delv - https://kb.isc.org/docs/aa-01152
- DNSViz documentation and project page - https://github.com/dnsviz/dnsviz and https://dnsviz.net/
- Google Public DNS FAQ - https://developers.google.com/speed/public-dns/faq
- Zonemaster CLI installation documentation - https://doc.zonemaster.net/latest/installation/zonemaster-cli.html

## Issues Found
- The post overstated DNSSEC failure impact as taking an entire domain offline. Updated the wording to clarify that DNSSEC validation failures affect users behind validating resolvers.
- The description framed the deployment action as enabling signature validation. Updated it to refer to publishing DNSSEC delegation records, which better matches authoritative DNSSEC rollout.
- The DNSKEY checks assumed every valid deployment has separate KSK and ZSK records. Updated the prose, example comments, and automated script to allow valid single-key CSK deployments.
- The algorithm recommendation table treated RSA/SHA-512 and ECDSA P-384 as general good defaults. Updated the recommendations to match current IANA/RFC guidance: RSA/SHA-512 is not recommended for new signing, and ECDSA P-384 is a situational choice rather than the default recommendation.
- The AD flag explanation was too broad. Updated it to clarify that AD reflects the resolver's DNSSEC validation policy for the answer and authority data.
- The script described NSEC3 as generally recommended. Updated the wording to align with current guidance that NSEC3 is mainly useful when zone walking is a concern.
- The DS checklist called SHA-256 "algorithm 2." Updated it to "digest type 2," which is the correct DS field name.
- The tools summary listed `pip install zonemaster`, which is not the official Zonemaster CLI installation method. Updated it to OS package, CPAN, or Docker installation.
- The conclusion said validation is enforced once DS is published. Updated it to specify that validating resolvers enforce the chain of trust.

## Review Notes
The article remains a practical DNSSEC testing guide. Some operational recommendations, such as rollover timelines and signature validity windows, are policy-dependent rather than universal requirements, but they are reasonable examples for a pre-production checklist.
