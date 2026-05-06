# How to Configure BGP Dampening to Suppress Flapping Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Dampening, Route Flapping, Cisco IOS, Routing Stability

Description: Learn how to configure BGP route dampening to suppress unstable routes that repeatedly appear and disappear, protecting your network from routing instability.

## What Is BGP Route Flapping?

A BGP route flap occurs when a prefix is withdrawn and re-advertised repeatedly-typically due to an unstable link or interface. Each flap causes UPDATE messages to propagate across the Internet, consuming CPU and bandwidth. BGP dampening penalizes flapping routes by suppressing them temporarily.

## How Dampening Works

In Cisco IOS, each time a route is withdrawn, its penalty increases by 1000 by default; an attribute change adds 500. The penalty decays exponentially over time:
- **Suppress limit (Cisco IOS default: 2000):** Route is suppressed when penalty exceeds this value
- **Reuse limit (Cisco IOS default: 750):** Route is made available again when penalty drops below this value
- **Half-life (Cisco IOS default: 15 min):** Time for penalty to drop to half its current value
- **Max suppress time (Cisco IOS default: 60 min):** Maximum time a route stays suppressed

## Step 1: Enable BGP Dampening

Enable dampening globally for all BGP routes using default values:

```text
router bgp 65001
 ! Enable dampening with default parameters
 bgp dampening
```

Or configure custom parameters:

```text
router bgp 65001
 ! Custom example: half-life=15min, reuse=750, suppress=6000, max-suppress=60min
 bgp dampening 15 750 6000 60
```

## Step 2: Apply Dampening Selectively with Route Maps

Apply dampening only to specific prefixes using a route map:

```text
! Define which prefixes to dampen
ip prefix-list DAMPEN_THESE seq 10 permit 0.0.0.0/0 ge 25

! Route map applies dampening for long prefixes (/25 and longer)
route-map DAMPEN_LONG_PREFIXES permit 10
 match ip address prefix-list DAMPEN_THESE

router bgp 65001
 bgp dampening route-map DAMPEN_LONG_PREFIXES
```

## Step 3: View Dampened Routes

```text
! Show all currently dampened routes
Router# show ip bgp dampened-paths

Status codes: s suppressed, d damped, h history, * valid, > best, i - internal

   Network          From             Reuse     Path
*d 192.168.99.0/24  203.0.113.1      00:27:00  65100 65200 i

! The 'Reuse' column shows how long until the path is made available again
```

```text
! Show flap statistics for routes that are currently or recently dampened
Router# show ip bgp flap-statistics

Status codes: s suppressed, d damped, h history, * valid, > best, i - internal

   Network          From        Flaps Duration  Reuse     Path
*d 192.168.50.0/24  10.0.0.1        5  00:10:00 00:20:00 65100 i

! The output shows how many times the route has flapped and when it becomes reusable
```

## Step 4: Check a Route's Current Penalty

```text
Router# show ip bgp 192.168.99.0 255.255.255.0

BGP routing table entry for 192.168.99.0 255.255.255.0
Paths: (1 available, no best path)
  65100 65200, (suppressed due to dampening)
    203.0.113.1 from 203.0.113.1 (203.0.113.1)
      Origin IGP, metric 0, valid, external
      Dampinfo: penalty 2615, flapped 3 times in 00:05:18, reuse in 00:27:00
```

## Step 5: Manually Clear Dampening for a Route

If a route has stabilized and you want to unsuppress it immediately:

```text
! Clear dampening for a specific prefix
Router# clear ip bgp dampening 192.168.99.0 255.255.255.0

! Clear all dampened routes
Router# clear ip bgp dampening
```

## Dampening Considerations

- **Over-dampening:** Overly aggressive settings can suppress legitimate routes for too long, especially during maintenance
- **Current guidance:** RFC 7196 recommends less aggressive settings than the classic Cisco defaults; the default suppress threshold of 2000 is considered overly aggressive
- **Default is off:** Dampening is not enabled by default because improper tuning can cause more harm than good
- **Monitor regularly:** Check `show ip bgp flap-statistics` to identify genuinely unstable routes

## Conclusion

BGP dampening protects your network from route flap instability by penalizing repeatedly withdrawn prefixes. Enable it only where needed, use route maps for selective application, and monitor dampened paths with `show ip bgp dampened-paths`. If you use it, tune the suppress threshold conservatively rather than relying blindly on the classic defaults, and always have a process to manually clear dampening when a genuinely stable route gets incorrectly suppressed.
