# Validation Summary: How to Prioritize Systems for IPv6 Migration

## Status
validated

## Post Type
Guide / planning framework

## Technologies Covered
- IPv6 enterprise migration planning
- DNS and AAAA records
- Routers, firewalls, load balancers, and monitoring systems
- Mail routing (`MX`) and SPF (`ip6`)
- NAT64/DNS64 and application proxying
- Python 3 (`dataclasses`) for scoring/ranking

## Sources Consulted
- IETF RFC 7381, *Enterprise IPv6 Deployment Guidelines*: https://www.rfc-editor.org/rfc/rfc7381.html
- IETF RFC 3596, *DNS Extensions to Support IP Version 6*: https://www.rfc-editor.org/rfc/rfc3596
- IETF RFC 5321, *Simple Mail Transfer Protocol*: https://www.rfc-editor.org/rfc/rfc5321
- IETF RFC 7208, *Sender Policy Framework (SPF) for Authorizing Use of Domains in Email, Version 1*: https://www.rfc-editor.org/rfc/rfc7208
- IETF RFC 6146, *Stateful NAT64: Network Address and Protocol Translation from IPv6 Clients to IPv4 Servers*: https://www.rfc-editor.org/rfc/rfc6146
- Python standard library documentation for `dataclasses`: https://docs.python.org/3/library/dataclasses.html

## Issues Found
1. The sample Python code labeled `external_facing` as `1 or 5`, but the post defines a 1-5 scoring scale and the example data already uses intermediate values. I corrected the comment to `1-5`.
2. The sample Python code hard-coded `Wave 1` through `Wave 3`, which conflicted with the four-wave framework in the article and used the score as a global wave assignment rather than a ranking tool. I changed the script to output a ranked order, which matches the post's guidance that scoring is used to rank systems when resources are constrained.
3. The Wave 1 description said those systems "must" be first and that DNS resolver support means "nothing else works." RFC 7381 recommends a phased approach based on enterprise priorities and describes DNS as a main anchor for IPv6, so I softened that wording to avoid overstating it.
4. The mail-server guidance incorrectly said to add AAAA to `MX` and `SPF`. Per RFC 5321 and RFC 7208, `MX` points to hostnames whose hosts may have `AAAA` records, and SPF uses mechanisms such as `ip6`. I updated the sentence accordingly.
5. The VPN guidance was overly specific to IKEv2 for generic VPN endpoints. I changed it to protocol-agnostic IPv6 transport and client-addressing guidance.
6. The legacy-system guidance presented NAT64 as a blanket workaround. RFC 6146 defines NAT64 for IPv6 clients reaching IPv4 servers, so I narrowed the recommendation to specific client-initiated access patterns and mentioned proxying as an alternative.
7. The conclusion claimed a Wave 2 issue would not affect Wave 1 infrastructure. That certainty is too strong operationally, so I changed it to the more accurate blast-radius framing.

## Review Notes
- The weighting formula is a heuristic, not an RFC-defined standard. That is acceptable because the post presents it as a practical prioritization framework rather than a protocol requirement.
- RFC 7381 explicitly notes that some enterprises may prioritize external-facing systems before internal infrastructure, depending on business and operational constraints. The edited wording now reflects that flexibility without changing the article's overall advice.
- The Python example is syntactically valid after the edits and uses current standard-library features.
