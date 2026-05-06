# How to Configure BGP Weight for Local Path Selection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Weight, Cisco IOS, Path Selection, Traffic Engineering

Description: Learn how to use Cisco's BGP Weight attribute to influence path selection on a single router without affecting other routers in the AS.

## What Is BGP Weight?

BGP Weight is a Cisco-proprietary attribute that affects path selection only on the local router where it is configured. Unlike Local Preference (which is shared across all iBGP peers), Weight is not propagated to any other router. The route with the **highest weight** is preferred.

Key facts:
- Cisco-proprietary (not in the BGP RFC)
- Local to the router only-not sent to any peer
- Default weight: 0 for learned routes, 32768 for locally originated routes
- Range: 0–65535
- Evaluated first in the BGP path selection process

This makes Weight useful for quick, per-router path preference without changing AS-wide policy.

## Step 1: Set Weight on a Specific Neighbor

The simplest approach sets a weight for all routes received from a given neighbor:

```text
router bgp 65001
 ! All routes from ISP1 get weight 200 (preferred)
 neighbor 203.0.113.1 remote-as 65100
 neighbor 203.0.113.1 weight 200

 ! All routes from ISP2 get weight 100 (backup)
 neighbor 198.51.100.1 remote-as 65200
 neighbor 198.51.100.1 weight 100
```

All routes learned from ISP1 will now have weight 200, making them preferred over ISP2 routes with weight 100.

## Step 2: Set Weight via Route Map for Selective Control

For per-prefix weight control, use a route map:

```text
ip prefix-list PREFERRED_DEST seq 10 permit 8.8.8.0/24

! Set weight 500 for a specific destination learned via ISP1
route-map ISP1_WEIGHT permit 10
 match ip address prefix-list PREFERRED_DEST
 set weight 500

! Default weight for other routes
route-map ISP1_WEIGHT permit 20
 set weight 200

router bgp 65001
 neighbor 203.0.113.1 route-map ISP1_WEIGHT in
```

## Step 3: Verify Weight in the BGP Table

```text
Router# show ip bgp

   Network          Next Hop            Metric LocPrf Weight Path
*> 0.0.0.0          203.0.113.1              0           200  65100 i
*  0.0.0.0          198.51.100.1             0           100  65200 i

! Route via ISP1 has Weight=200 and is selected as best (>)
! Route via ISP2 has Weight=100 and is backup
```

## Step 4: Apply Changes

After modifying neighbor weight or a route map, apply a soft reset to recalculate best paths:

```text
! Re-evaluate inbound routes with new weight settings
Router# clear ip bgp 203.0.113.1 soft in
Router# clear ip bgp 198.51.100.1 soft in
```

## Step 5: Compare Weight, Local Preference, and MED

| Attribute | Scope | Higher or Lower wins | Propagated |
|---|---|---|---|
| Weight | Local router only | Higher wins | Never |
| Local Preference | Entire AS | Higher wins | iBGP |
| MED | Adjacent AS | Lower wins | iBGP within the AS; not to other ASes |

Use Weight for quick fixes on a single router. Use Local Preference when you need consistent outbound path selection across the entire AS.

## Common Use Case: Overriding a Route Map on One Router

Suppose a global route map sets local-preference 200 for ISP1, but on one specific router you want to use ISP2 instead. Set a higher weight on ISP2 routes on that router-Weight is evaluated before Local Preference:

```text
! On the specific router where you want to use ISP2
router bgp 65001
 neighbor 198.51.100.1 weight 1000    ! Override global preference locally
```

## Conclusion

BGP Weight is the highest-priority attribute in Cisco's path selection algorithm and is purely local to the router where it's configured. Use it for quick per-router traffic steering or to override global policies on specific devices. For consistent AS-wide policy, use Local Preference instead.
