# Validation Summary: How to Create ROA (Route Origin Authorization) for IPv6 Prefixes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RPKI
- Route Origin Authorization (ROA)
- IPv6 prefixes
- BGP origin validation
- RIPE NCC RPKI Management API
- RIPEstat RPKI Validation API
- Routinator
- RIR hosted RPKI portals

## Sources Consulted
- RFC 9582: A Profile for Route Origin Authorizations (ROAs): https://datatracker.ietf.org/doc/html/rfc9582
- RFC 9319: The Use of maxLength in the Resource Public Key Infrastructure (RPKI): https://datatracker.ietf.org/doc/html/rfc9319
- RIPE NCC Hosted Certification Authority / ROA Management: https://www.ripe.net/manage-ips-and-asns/resource-management/rpki/resource-certification-roa-management/
- RIPE NCC RPKI Management API: https://www.ripe.net/publications/documentation/developer-documentation/rpki-management-api/
- RIPEstat RPKI Validation API: https://stat.ripe.net/docs/data-api/api-endpoints/rpki-validation
- Routinator manual page: https://routinator.docs.nlnetlabs.nl/en/latest/manual-page.html
- Cloudflare route filtering and RPKI documentation: https://developers.cloudflare.com/byoip/concepts/route-filtering-rpki/
- ARIN Route Origin Authorizations documentation: https://www.arin.net/resources/manage/rpki/roas/
- APNIC RPKI and MyAPNIC ROA documentation: https://www.apnic.net/rpki-at-apnic/ and https://blog.apnic.net/2019/09/11/how-to-creating-rpki-roas-in-myapnic/
- LACNIC Creating ROAs documentation: https://lacnic.zendesk.com/hc/en-us/articles/231828447-Creating-ROAs
- AFRINIC RPKI documentation: https://afrinic.net/support/rpki

## Issues Found
- The post described the ROA maximum prefix length as always present. Updated this to say the maximum prefix length is optional, matching RFC 9582 and RIPE NCC documentation.
- The RIPE NCC and APNIC portal URLs were inaccurate or less direct for ROA management. Updated RIPE NCC to the RPKI dashboard and APNIC to `https://my.apnic.net`.
- The RIPE NCC UI navigation was outdated. Updated the steps to refer to the Resource Certification dashboard and the ROAs/Announcements tabs.
- The parameter example included `Valid Until` as a normal ROA creation field. Updated it to note that validity is managed by the hosted CA, which avoids implying that validity is part of the ROA payload.
- The examples used a `/32` ROA with max length `/48` by default, which is broader than current maxLength best practice unless `/48`s are actually announced. Updated the examples to default to exact-prefix ROAs and reserve `/48` for the explicit more-specific case.
- The multiple-ROA example was marked as `bash` even though it was descriptive text, not executable shell. Changed the fence to `text`.
- The propagation statement was too absolute. Updated it to account for RIR publication and relying-party validator refresh intervals.
- The Cloudflare RPKI validator curl URL returned 404 and is not documented as a current API endpoint. Replaced it with a visual check through Cloudflare's RPKI Portal and kept verified RIPEstat and Routinator command examples.
- The "ROA conflicts" section used RIPEstat `announced-prefixes`, which lists BGP announcements rather than existing ROAs or VRPs. Replaced it with `routinator vrps --select-prefix ... --more-specifics` and RIPE NCC's `announcements/affected` API.
- The RIPE NCC automation example created a RIPE Database `route6` object, not an RPKI ROA. Replaced it with the official RIPE NCC RPKI Management API `roas/publish` endpoint and payload.
- The conclusion implied all operators manually renew certificates before expiry. Updated it to recommend monitoring certificate and ROA validity, especially for delegated CAs.

## Review Notes
The example prefix `2001:db8::/32` and ASNs `AS64496`/`AS64497` are documentation examples; public validation APIs may return `unknown` for them unless matching test ROAs exist. The post is technically accurate after the fixes above.
