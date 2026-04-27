# How to Troubleshoot OSPF LSA Types and Their Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, LSA Types, Troubleshooting, Cisco IOS, Routing Database

Description: Learn about OSPF LSA types 1 through 7, how they propagate between areas, and how to use the OSPF database commands to troubleshoot missing routes.

## OSPF LSA Types Reference

| Type | Name | Originator | Scope |
|---|---|---|---|
| 1 | Router LSA | Every router | Intra-area only |
| 2 | Network LSA | DR on multi-access | Intra-area only |
| 3 | Summary LSA | ABR | Inter-area (into adjacent areas) |
| 4 | ASBR Summary | ABR | Inter-area (locates ASBR) |
| 5 | AS External | ASBR | Entire OSPF domain (except stubs) |
| 7 | NSSA External | ASBR in NSSA | NSSA area only (translated to Type 5 by ABR) |
| 9/10/11 | Opaque | Various | Various (used for TE, Grace) |

## Step 1: View the Complete OSPF Database

```text
! Show all LSAs in the OSPF database
Router# show ip ospf database

OSPF Router with ID (1.1.1.1) (Process ID 1)

  Router Link States (Area 0)          <- Type 1
  Net Link States (Area 0)             <- Type 2
  Summary Net Link States (Area 0)     <- Type 3
  Summary ASB Link States (Area 0)     <- Type 4
  Type-5 AS External Link States       <- Type 5
```

## Step 2: Inspect Type-1 Router LSAs

Type-1 LSAs describe the router's directly connected links and their states:

```text
! Show Router LSAs in Area 0
Router# show ip ospf database router

! Look for:
! LS Type: Router Links
! Link State ID: 1.1.1.1 (Router ID of originator)
! Number of links: 3
! Link connected to: a Transit Network / Stub Network / another Router
```

If a router's Type-1 LSA is missing from the database, check OSPF adjacency to that router.

## Step 3: Inspect Type-3 Summary LSAs

Type-3 LSAs are advertised by ABRs to share inter-area prefixes:

```text
! Show Summary LSAs
Router# show ip ospf database summary

! Each entry shows:
! Link State ID: 172.16.0.0 (prefix being summarized)
! Advertising Router: 10.0.0.2 (the ABR)
! Network Mask: 255.255.255.0
```

If a route from another area is missing, check whether the ABR is generating Type-3 LSAs for it.

## Step 4: Inspect Type-5 External LSAs

Type-5 LSAs carry redistributed external routes from the ASBR:

```text
! Show AS External LSAs
Router# show ip ospf database external

! Each entry shows:
! Link State ID: 198.51.100.0
! Advertising Router: 10.0.0.5 (the ASBR)
! Metric: 100, Type: E2
! External Route Tag: 100 (set by route map if configured)
```

If external routes are missing, verify the ASBR is redistributing correctly and Type-4 ASBR Summary LSAs exist to locate it.

## Step 5: Trace Why a Route Is Missing

Use the detailed OSPF database and route commands to trace a missing route:

```text
! Check if the prefix exists as an LSA
Router# show ip ospf database summary | include 172.16.5.0

! If not found - the ABR is not generating the Type-3 LSA
! Check the ABR's routing table and OSPF database
ABR# show ip route 172.16.5.0
ABR# show ip ospf database router | include 172.16.5

! If found but no route - check for filtering (filter-lists per area)
Router# show ip ospf 1 | include Filter
```

## Step 6: Verify LSA Age (MaxAge Flushing)

LSAs have a maximum age of 3600 seconds (1 hour). An LSA approaching MaxAge is being refreshed or purged:

```text
Router# show ip ospf database router | include Age

! Age 3600 = LSA is being flushed (MaxAge)
! If a router's LSA shows MaxAge and the router is still present,
! there's a flooding problem
```

## Step 7: Check Area Type Blocking

Remember which LSA types are blocked by area type:

```text
! For a stub area router - Type 5 LSAs should NOT appear
Router# show ip ospf database external

! If Type-5 LSAs appear in a stub area router's database, the area type
! is not configured consistently across all routers
```

## Common Troubleshooting Scenarios

| Symptom | Likely Cause | Check |
|---|---|---|
| Missing inter-area route | ABR not generating Type-3 | `show ip ospf database summary` on ABR |
| Missing external route | ASBR redistribution issue | `show ip ospf database external` on ASBR |
| Route not installed despite LSA present | Route filtering | `show ip ospf \| include Filter` |
| Type-5 in stub area | Incomplete stub config | Verify all routers have `area X stub` |

## Conclusion

OSPF LSA types define what routing information is shared and where. Use `show ip ospf database [type]` to inspect what LSAs exist and who is advertising them. Missing inter-area routes indicate a Type-3 LSA generation problem at the ABR; missing external routes indicate an ASBR redistribution issue. Always verify area type consistency when stub/NSSA LSA filtering is involved.
