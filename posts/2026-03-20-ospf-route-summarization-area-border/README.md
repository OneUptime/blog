# How to Configure OSPF Route Summarization at Area Border Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Summarization, ABR, Cisco IOS, Routing, Scalability

Description: Learn how to configure OSPF inter-area route summarization at Area Border Routers to reduce LSA flooding and routing table size across OSPF areas.

## Why Summarize OSPF Routes?

Without summarization, every individual subnet in an area is advertised as a separate Type-3 Summary LSA into adjacent areas. A branch area with 50 subnets generates 50 LSAs flooding into Area 0. Summarization consolidates them into one or a few summary LSAs, reducing database size, SPF calculation load, and routing table entries.

## How OSPF Summarization Works

ABRs perform inter-area summarization. When a summary is configured, the ABR advertises a single Type-3 LSA covering the range instead of individual Type-3 LSAs for each component subnet. The summary is only advertised if at least one component subnet exists in the routing table.

## Step 1: Plan Your Summary Ranges

Before configuring, design address ranges that align with bit boundaries. A good summarization plan is:

| Area | Subnets | Summary |
|---|---|---|
| Area 1 | 10.1.0.0–10.1.255.255 | 10.1.0.0/16 |
| Area 2 | 10.2.0.0–10.2.255.255 | 10.2.0.0/16 |
| Area 3 | 10.3.0.0–10.3.255.255 | 10.3.0.0/16 |

## Step 2: Configure Summarization on the ABR

Use `area range` to configure inter-area summarization on the ABR:

```text
! On ABR connecting Area 1 to Area 0
ABR(config)# router ospf 1
! Summarize all Area 1 prefixes into a single /16
ABR(config-router)# area 1 range 10.1.0.0 255.255.0.0
```

The ABR now advertises only `10.1.0.0/16` into Area 0 instead of each individual /24.

## Step 3: Suppress the Summary (Not Advertise)

If you want to prevent the summary from being advertised (useful during testing or to temporarily hide an area):

```text
! Do not advertise the summary (useful for filtering)
ABR(config-router)# area 1 range 10.1.0.0 255.255.0.0 not-advertise
```

This suppresses both the summary and the component routes from other areas.

## Step 4: Set Summary Cost

The default summary cost is the lowest cost among the component routes. Override it:

```text
! Explicitly set the summary cost
ABR(config-router)# area 1 range 10.1.0.0 255.255.0.0 cost 50
```

This is useful when multiple ABRs serve the same area and you need to influence which ABR's summary is preferred.

## Step 5: Verify Summarization

```text
! On Area 0 router - check if summary is visible
R0# show ip route ospf

! Should see:
! O IA 10.1.0.0/16 [110/11] via 10.0.12.2    <- Summary from Area 1 ABR
! O IA 10.2.0.0/16 [110/11] via 10.0.13.2    <- Summary from Area 2 ABR
! (No individual /24 routes from those areas)

! On the ABR - verify component routes
ABR# show ip ospf database summary | include 10.1

! The ABR's OSPF database should show individual /24s
! but only the summary is advertised to other areas
```

## Step 6: Null Route for Summary (Avoid Black Holing)

When an ABR creates a summary, it also installs a Null route for the summary prefix. This prevents routing loops if no specific component route exists:

```text
ABR# show ip route 10.1.0.0

Routing entry for 10.1.0.0/16
  Known via "ospf 1", distance 110, metric 0
  Redistributing via ospf 1
  Routing Descriptor Blocks:
  * directly connected, via Null0
    Route metric is 0, traffic share count is 1
```

This Null route is automatically created-it's normal behavior, not a problem.

## Summarization vs. Aggregation

| Feature | OSPF `area range` | BGP `aggregate-address` |
|---|---|---|
| Protocol | OSPF | BGP |
| Applied at | ABR | BGP router |
| LSA type suppressed | Type-3 | BGP UPDATE |
| Automatic null route | Yes | Yes |

## Conclusion

OSPF inter-area summarization at ABRs significantly reduces OSPF database size and routing table entries in large multi-area deployments. Plan address ranges to align with bit boundaries, configure `area X range [network] [mask]` on ABRs, and verify with `show ip route ospf` on Area 0 routers that only summaries (not component routes) appear.
