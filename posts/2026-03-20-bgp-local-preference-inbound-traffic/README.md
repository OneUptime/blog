# How to Configure BGP Local Preference for Inbound Traffic Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Local Preference, Traffic Engineering, Cisco IOS, Routing Policy

Description: Learn how to use BGP Local Preference to control which exit path your AS uses for outbound traffic when multiple BGP paths are available.

## Understanding Local Preference

Local Preference (LOCAL_PREF) is a BGP attribute used only within a single autonomous system. It tells all iBGP routers which exit path to prefer when multiple paths to the same destination exist. The route with the **highest** local preference wins.

Key facts:
- Default value in Cisco IOS: 100
- Scope: iBGP only (not sent to eBGP peers)
- Range: 0–4294967295

## BGP Path Selection Order (Simplified)

```text
1. Highest Weight (Cisco-proprietary, local to router)
2. Highest Local Preference
3. Locally Originated
4. Shortest AS Path
5. Lowest Origin Code (IGP < EGP < Incomplete)
6. Lowest MED
7. eBGP over iBGP
8. Lowest IGP metric to next-hop
```

Local Preference is evaluated early, making it powerful for AS-wide path selection.

## Scenario: Dual-ISP with Primary and Backup

Your router has two eBGP sessions: ISP1 (preferred exit) and ISP2 (backup). You want all outbound traffic to use ISP1 unless it fails.

## Step 1: Set High Local Preference on ISP1 Routes

Use a route map applied inbound on the ISP1 neighbor session:

```text
! Route map sets local-preference to 200 for all ISP1 routes
route-map ISP1_PREFER permit 10
 set local-preference 200

! Route map sets local-preference to 100 for all ISP2 routes (default, backup)
route-map ISP2_BACKUP permit 10
 set local-preference 100

router bgp 65001
 neighbor 203.0.113.1 remote-as 65100    ! ISP1
 neighbor 203.0.113.1 route-map ISP1_PREFER in

 neighbor 198.51.100.1 remote-as 65200   ! ISP2
 neighbor 198.51.100.1 route-map ISP2_BACKUP in
```

## Step 2: Fine-Grained Preference by Prefix

You can set different preferences for different destination prefixes-useful for routing specific traffic through a specific ISP:

```text
! Prefer ISP2 only for traffic to CDN prefix 104.16.0.0/12
ip prefix-list CDN_PREFIX seq 10 permit 104.16.0.0/12

route-map ISP2_CDN permit 10
 match ip address prefix-list CDN_PREFIX
 ! High preference for CDN traffic via ISP2
 set local-preference 300

route-map ISP2_CDN permit 20
 ! All other routes get default preference
 set local-preference 100

router bgp 65001
 neighbor 198.51.100.1 route-map ISP2_CDN in
```

## Step 3: Verify Local Preference in the BGP Table

```text
! View BGP table with local-preference column
Router# show ip bgp

   Network          Next Hop            Metric LocPrf Weight Path
*> 0.0.0.0          203.0.113.1              0    200      0 65100 i
*  0.0.0.0          198.51.100.1             0    100      0 65200 i

! The route with LocPrf 200 has the > (best) flag
```

The `>` marker shows which path is selected as best.

## Step 4: Verify a Specific Route's Attributes

```text
Router# show ip bgp 0.0.0.0 0.0.0.0

BGP routing table entry for 0.0.0.0/0
  Paths: (2 available, best #1)
  65100
    203.0.113.1 from 203.0.113.1 (203.0.113.1)
      Origin IGP, metric 0, localpref 200, valid, external, best
  65200
    198.51.100.1 from 198.51.100.1 (198.51.100.1)
      Origin IGP, metric 0, localpref 100, valid, external
```

## Step 5: Apply Changes Without Dropping Sessions

After modifying route maps, apply a soft reset to re-evaluate routes if the peer supports route refresh or inbound soft reconfiguration is enabled:

```text
! Re-process inbound routes from ISP1 with the new route map
Router# clear ip bgp 203.0.113.1 soft in
Router# clear ip bgp 198.51.100.1 soft in
```

## Conclusion

BGP Local Preference is the primary mechanism for controlling outbound path selection across your AS. Set higher values on preferred exit paths, apply the values via route maps on inbound neighbor sessions, and verify the selected path with `show ip bgp`. All iBGP routers receive the local-preference value automatically, ensuring consistent routing throughout the AS.
