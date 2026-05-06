# Validation Summary: How to Use BGP Communities for Route Tagging and Filtering

## Status
validated

## Post Type
Guide

## Technologies Covered
- Border Gateway Protocol (BGP)
- Standard BGP communities
- Cisco IOS / IOS XE BGP policy configuration
- Route maps
- Community lists

## Sources Consulted
- RFC 1997, "BGP Communities Attribute" - https://datatracker.ietf.org/doc/rfc1997/
- RFC 8642, "Policy Behavior for Well-Known BGP Communities" - https://datatracker.ietf.org/doc/rfc8642/
- Cisco IOS IP Routing: BGP Command Reference, `neighbor send-community` and `match community` - https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp3.html
- Cisco IOS IP Routing: BGP Command Reference, `show ip bgp community`, `show ip bgp community-list`, and `show ip community-list` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-s1.html
- Cisco IOS IP Routing: BGP Command Reference, `set community` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-n1.html
- Cisco IOS XE 17.x IP Routing Configuration Guide, route-map matching and set behavior - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_iri-iprouting.html

## Issues Found
- The `no-export` and `local-AS` descriptions were too loose. I corrected them to match RFC 1997 semantics for confederation-aware propagation behavior.
- The selective export example said `no-export` could be used for "specific peers," which is incorrect. `no-export` prevents advertisement outside the local AS or confederation boundary, so I corrected the explanation.
- The regional traffic-engineering example matched `EUROPE_COMMUNITY` without defining it. I added the missing `ip community-list standard EUROPE_COMMUNITY permit 65001:300` line so the route map example is internally consistent.
- The command `show ip bgp detail | include Community` is not a valid Cisco IOS verification command in this context. I replaced it with `show ip bgp community-list CUST_ROUTES`, which is the documented Cisco IOS command for validating routes matched by a community list.
- The conclusion told readers to test community-list matches with `show ip bgp community`, which only checks routes by community value. I corrected it to use `show ip bgp community-list CUST_ROUTES`.

## Review Notes
- The post is accurate for standard BGP communities on Cisco IOS after the fixes above.
- Extended communities and large communities use different attributes and verification patterns; this post remains focused on standard communities only.
- Cisco IOS `set community` behavior is vendor-specific enough that multi-vendor readers should verify overwrite versus preservation behavior when moving the same policy to other platforms; RFC 8642 documents those differences.
