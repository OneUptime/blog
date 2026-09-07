# How to Bring Your Own IP Addresses and BGP to a Colocation Provider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, IP Addresses, BGP, RPKI, ARIN

Description: Prepare registry records, routing security, provider authorization, BGP policy, testing, and rollback for portable IP space in colocation.

---

Bringing your own IP addresses lets services keep stable public addresses across providers, but it makes your organization responsible for registry accuracy, route authorization, and safe BGP policy. Complete the control-plane work before moving production.

## Confirm resources and provider policy

You need legitimate rights to the address block and a routing design the provider accepts. Depending on the arrangement, use your own public autonomous system number or an explicitly agreed provider-originated design.

Ask each provider for:

- minimum and maximum accepted IPv4 and IPv6 prefix lengths
- whether it supports customer BGP, provider-originated routes, or both
- required letter of authorization and registry evidence
- private or public peering addresses and session parameters
- supported BGP communities, maximum prefixes, and default route options
- route-origin validation and Internet Routing Registry policy
- denial-of-service diversion and blackhole communities

Do not assume every network will propagate a more-specific prefix. Global routing practice commonly filters long prefixes, and exact acceptance remains a provider and peer policy question.

## Prepare registry objects

Make organization, abuse, routing, and NOC contacts current with the relevant Regional Internet Registry. If requesting an ASN or addresses from ARIN, follow its resource request and qualification process rather than treating the provider as the resource authority.

Create a Route Origin Authorization that permits the intended origin ASN and prefix. RFC 9319 recommends minimal ROAs and generally avoiding `maxLength`; authorize only prefixes the ASN actually originates. If the routing policy requires `maxLength`, keep it no broader than necessary. An overly permissive value authorizes unplanned more-specific routes from that ASN, while an overly restrictive value makes a legitimate more-specific announcement RPKI-invalid.

RPKI route-origin validation checks whether the origin ASN and prefix length are authorized. It does not validate the complete AS path. Create any required IRR route or route6 objects and keep them consistent with the ROA and actual announcement.

Plan reverse DNS authority and update geolocation, reputation, allowlists, and upstream anti-spoofing filters separately. BGP reachability does not update those systems automatically.

## Build default-deny BGP policy

Define exact outbound prefixes and accepted inbound routes. RFC 8212 specifies default-reject behavior for external BGP when policy is absent. Apply that principle explicitly even if the router platform has different defaults.

A small edge may need only a default route from each provider. If accepting full routes, confirm router memory, forwarding-table capacity, update behavior, and convergence under load.

Controls should include:

- exact prefix and prefix-length filters in both directions
- maximum-prefix limits with a documented recovery policy
- explicit local preference and outbound path policy
- bogon and martian handling appropriate to the role
- authentication supported by both peers
- change control for communities and traffic engineering
- monitoring for session state, route count, origin validity, and visibility

Never paste a provider's example policy into production without adapting interface names, address family, ASN, prefixes, and platform semantics.

## Stage the deployment

Use this order:

1. validate registry ownership, contacts, ROA, and IRR data
2. configure filters with sessions administratively disabled
3. have both sides review ASNs, addresses, and expected prefixes
4. establish the session without exporting production space
5. verify received routes and next-hop behavior
6. announce a test prefix if one is available and globally usable
7. announce production with a controlled preference
8. verify visibility and application reachability externally

Check route collectors and probes from multiple regions. Validate IPv4 and IPv6 independently. Monitor for RPKI-invalid state and unexpected AS paths.

## Plan migration and rollback

Address moves can be affected by cached routes, DNS, stateful sessions, reputation controls, and the old provider's withdrawal timing. Reduce DNS TTL only for names that will actually change. Coordinate when the old provider stops originating the block so two origins do not appear unexpectedly.

Define rollback triggers such as widespread unreachability, invalid origin state, route leak, or excessive loss. Rollback may mean withdrawing the new route and restoring the prior origin, not merely shutting the new interface.

Keep out-of-band router access and provider NOC contacts available throughout the change. After stabilization, remove obsolete ROAs, IRR objects, sessions, LOAs, and filters.

## Conclusion

Successful BYOIP is a registry and routing-security project as much as a router configuration. Align provider authorization, ROA, IRR, exact BGP filters, external validation, migration timing, and rollback before advertising production prefixes.

## Official Documentation

- [ARIN resource request guide](https://www.arin.net/resources/guide/request/)
- [ARIN Route Origin Authorization documentation](https://www.arin.net/resources/manage/rpki/roas/)
- [IETF BGP-4 specification, RFC 4271](https://www.rfc-editor.org/rfc/rfc4271)
- [IETF BGP operations and security, RFC 7454](https://www.rfc-editor.org/rfc/rfc7454)
- [IETF default external BGP policy, RFC 8212](https://www.rfc-editor.org/rfc/rfc8212)
- [IETF RPKI route-origin validation clarifications, RFC 8893](https://www.rfc-editor.org/rfc/rfc8893)
- [IETF guidance for minimal ROAs and maxLength, RFC 9319](https://www.rfc-editor.org/rfc/rfc9319)
