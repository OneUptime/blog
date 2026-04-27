# Validation Summary: How to Configure OSPF Route Summarization at Area Border Routers

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- Cisco IOS configuration (`area range` command)
- OSPF Area Border Routers (ABRs)
- Type-3 Summary LSAs
- Inter-area route summarization
- BGP `aggregate-address` (briefly, for comparison)

## Sources Consulted
- [Cisco IOS IP Routing: OSPF Command Reference - `area range`](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/ospf-a1.html)
- [OSPF Summarization Explained + Configuration in Cisco IOS - itskillbuilding.com](https://itskillbuilding.com/networking/network/ospf/ospf-summarization/)
- [OSPF Metric: Calculation and Tuning on Cisco IOS - itskillbuilding.com](https://itskillbuilding.com/routing/ospf/ospf-metric/)
- [OSPF Inter-area route summarization - Cisco Community](https://community.cisco.com/t5/networking-knowledge-base/ospf-inter-area-route-summarization/ta-p/3145113)
- [Route Summarization > BGP Fundamentals - Cisco Press](https://www.ciscopress.com/articles/article.asp?p=2756480&seqNum=13)
- [Summary Routes To Null0 - Tom G CCIE Blog](https://ccie4all.wordpress.com/2013/01/04/summary-routes-to-null0/)
- RFC 2328 (OSPF Version 2)
- RFC 1583 (OSPF Version 2, predecessor)

## Issues Found

1. **Default summary cost was incorrectly stated as "highest"** (Step 4).
   - Original text: *"The default summary cost is the highest cost among the component routes."*
   - **Fixed to:** *"The default summary cost is the lowest cost among the component routes."*
   - Why: Cisco IOS OSPF implementation, by default, sets the cost of the summary route to the **lowest** (least) metric of the component routes within the summarized range, not the highest. This is documented across multiple Cisco-related sources and matches typical observed lab behavior. (Note: RFC 2328 §12.4.3 specifies the highest cost, but Cisco's default implementation deviates from this and uses the lowest.)

2. **BGP `aggregate-address` was incorrectly described as not creating an automatic Null0 route** (Summarization vs. Aggregation table).
   - Original text: *"Automatic null route | Yes | No (add manually)"*
   - **Fixed to:** *"Automatic null route | Yes | Yes"*
   - Why: Cisco IOS automatically installs a Null0 discard route for any prefix configured with `aggregate-address`, exactly as it does for OSPF `area range`. This is a built-in BGP loop-prevention mechanism and does not require a manual static route. The original claim was simply wrong.

## Review Notes

- The `area range` command syntax (`area area-id range ip-address mask [advertise | not-advertise] [cost cost]`) is correct and current for Cisco IOS / IOS XE.
- The use of `O IA` for inter-area route codes in `show ip route ospf` output is correct.
- The `show ip ospf database summary` command (and using `| include` to filter) is correct.
- The administrative distance of 110 shown for the Null0 discard route in the example is consistent with Cisco IOS default behavior for OSPF-generated discard routes.
- The explanation that the summary is only advertised if at least one component subnet exists in the routing table is accurate.
- The behavior of `not-advertise` (suppresses both the summary and the component routes from being advertised to other areas) is correctly described.
- The tutorial correctly notes that summary ranges should align with bit boundaries.
- Note for future readers: the cost calculation for OSPF summary routes is a frequently confused topic — RFC 2328 specifies the *largest* component cost, but Cisco IOS's default implementation uses the *lowest*. If exact RFC 2328 compliance is required, this should be tested in the specific IOS version in use.
