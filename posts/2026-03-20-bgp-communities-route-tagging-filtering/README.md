# How to Use BGP Communities for Route Tagging and Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Communities, Route Tagging, Cisco IOS, Traffic Engineering

Description: Learn how to attach BGP community values to routes for flexible tagging, filtering, and traffic engineering across autonomous systems.

## What Are BGP Communities?

BGP communities are optional transitive attributes attached to route announcements. They are 32-bit values typically expressed as `AS:value` (e.g., `65001:100`). Communities allow routers to make policy decisions based on tags set by the originating or transit AS, without needing to match on specific prefixes.

## Well-Known Communities

| Community | Meaning |
|---|---|
| `no-export` | Do not advertise outside the local AS or confederation |
| `no-advertise` | Do not advertise to any peer |
| `local-AS` | Do not advertise to external BGP peers, including other confederation member ASes |
| `internet` | Advertise normally (default) |

## Step 1: Attach a Community to Outbound Routes

Use a route map to set a community value on routes before sending them to a neighbor:

```text
! Create a route map to tag routes with community 65001:100
route-map SET_COMMUNITY permit 10
 ! Match the specific prefix to tag
 match ip address prefix-list OUR_PREFIX
 ! Set the community value (additive preserves existing communities)
 set community 65001:100 additive

! Apply outbound to the neighbor
router bgp 65001
 neighbor 203.0.113.1 route-map SET_COMMUNITY out
 ! Enable community sending (disabled by default)
 neighbor 203.0.113.1 send-community
```

Without `send-community`, communities are stripped before the update is sent.

## Step 2: Match and Filter Based on Community

On the receiving router, create a community list to match the tag:

```text
! Define a community list matching community 65001:100
ip community-list standard CUST_ROUTES permit 65001:100

! Route map that matches and applies policy
route-map CUST_POLICY permit 10
 match community CUST_ROUTES
 set local-preference 150

route-map CUST_POLICY permit 20
 ! Permit everything else without modification

! Apply inbound on the neighbor
router bgp 65002
 neighbor 203.0.113.2 route-map CUST_POLICY in
```

## Step 3: Use Communities for Selective Export Control

ISPs commonly use communities to let customers control how their routes are announced. Example: customer sets community `65001:200` to request that the route not be exported outside the ISP AS:

```bash
! ISP router: match customer's no-export community
ip community-list standard NO_PEER_EXPORT permit 65001:200

route-map CUSTOMER_IN permit 10
 match community NO_PEER_EXPORT
 ! Replace with well-known no-export community
 set community no-export

route-map CUSTOMER_IN permit 20
 ! Everything else passes through normally
```

## Step 4: Tag Routes by Region for Traffic Engineering

Use communities to mark routes by geographic region and adjust preference accordingly:

```text
! Mark routes learned from the European PoP
route-map EUROPE_TAG permit 10
 set community 65001:300 additive

! Match the Europe tag on the US router
ip community-list standard EUROPE_COMMUNITY permit 65001:300

! On the US router - prefer routes tagged Europe less
route-map PREFER_US permit 10
 match community EUROPE_COMMUNITY
 set local-preference 80

route-map PREFER_US permit 20
 set local-preference 120
```

## Step 5: View Communities in the BGP Table

```text
! Show routes carrying community 65001:100
Router# show ip bgp community 65001:100

! Show routes permitted by the community list
Router# show ip bgp community-list CUST_ROUTES

! Show community lists defined on the router
Router# show ip community-list
```

## Conclusion

BGP communities are a powerful mechanism for route tagging, policy enforcement, and traffic engineering. Always send communities explicitly with `send-community`, use `additive` to preserve existing tags, and test community list matches with `show ip bgp community-list CUST_ROUTES` before deploying policy changes in production.
