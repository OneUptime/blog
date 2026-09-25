# Validation Summary: How to Submit Evidence for Disputed XSS Findings in PCI DSS ASV Scans

## Status
validated

## Post Type
Technical guide containing an HTML example and practical vulnerability-evidence collection instructions.

## Technologies Covered
- PCI DSS Approved Scanning Vendor (ASV) scans and dispute handling
- Reflected, stored, and DOM-based cross-site scripting (XSS)
- HTML character references, context-specific encoding, and safe DOM sinks
- Content Security Policy (CSP) and web application firewalls (WAFs)
- HTTP routing, Host headers, TLS Server Name Indication, proxies, and load balancers
- Evidence integrity and cryptographic hashing

## Sources Consulted
- PCI SSC, ASV Program Guide v4.0 r2 (December 2022), Table 1 and Sections 5.6, 7.5–7.8: https://www.pcisecuritystandards.org/document_library/ — official library checked; guide text consulted through a reproduction at https://www.scribd.com/document/686715606/ASV-Program-Guide-v4-0r2 because the official PDF download returned an access error.
- OWASP XSS Prevention Cheat Sheet, including output contexts, sanitization, safe sinks, and other controls: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- OWASP Types of XSS: https://community.owasp.org/Types_of_Cross-Site_Scripting
- WHATWG HTML Standard, character-reference parsing: https://html.spec.whatwg.org/multipage/parsing.html#character-reference-state
- IETF RFC 9110, Section 7.2, Host and :authority: https://www.rfc-editor.org/rfc/rfc9110.html#section-7.2
- IETF RFC 6066, Section 3, Server Name Indication: https://www.rfc-editor.org/rfc/rfc6066#section-3
- NIST FIPS 180-4, Secure Hash Standard: https://csrc.nist.gov/pubs/fips/180-4/upd1/final

## Issues Found
- The scan-interference sentence made handling a detected active-protection block sound optional. Replaced it with the required Section 7.6 handling, consistent with Section 5.6.
- The Section 7.7 paragraph omitted mandatory customer attestation and explicit verification/resubmission each scan period. Added those steps and specified collection time, location, and method.

## Review Notes
- Confirmed the guide's XSS automatic-failure classification, ASV control over report changes, distinction between remediation and false positives, and evaluation of compensating controls.
- The HTML fragment is valid in an HTML body and displays `Search term: <review-marker>` as text. It does not create a `review-marker` element or establish safety in another output context.
- Context-specific encoding, unsafe DOM sink cautions, HTML sanitization, and CSP limitations agree with OWASP guidance. Reflected/stored and DOM-based classifications can overlap; the post does not require them to be mutually exclusive.
- Host and TLS server-name differences support the warning that hostname and direct-IP requests may reach different deployments.
- Hashes can detect changes relative to a trusted digest; they do not establish the truth or completeness of captured evidence.
- No CLI commands, deployable configuration, or versioned programming APIs are present. The text block is an evidence checklist. No live vulnerability scan or application deployment was tested.
- The PCI library and OWASP links point to the intended resources. The author profile is attribution, not a technical source. Direct access to the official ASV PDF was unavailable during this review; the version-specific review used the reproduced PCI SSC document, not independent verification of the downloaded official PDF.
