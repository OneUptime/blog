# How to Configure BGP Route Aggregation with Summary-Only

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Route Aggregation, Cisco IOS, Routing, Summarization

Description: Learn how to configure BGP route aggregation to advertise summary prefixes instead of individual component routes, reducing routing table size with the summary-only option.

## Why Aggregate BGP Routes?

Advertising individual /24 prefixes from a /16 allocation contributes to global routing table bloat. Aggregating them into a single summary prefix reduces the number of routes your AS advertises, makes your routing policy cleaner, and is good Internet citizenship.

## How BGP Aggregation Works

The `aggregate-address` command creates a summary route in the BGP table. By default, both the summary and the component routes are advertised. The `summary-only` keyword suppresses the individual more-specific routes.

## Step 1: Ensure Component Routes Are in the BGP Table

Aggregation only works when at least one more-specific route exists in the BGP table. Verify this first:

```text
Router# show ip bgp | include 192.168

! You should see individual routes like:
! *> 192.168.1.0/24   0.0.0.0         32768 i
! *> 192.168.2.0/24   0.0.0.0         32768 i
! *> 192.168.3.0/24   0.0.0.0         32768 i
```

## Step 2: Configure the Aggregate Address

Create an aggregate that covers the range you want to summarize:

```text
router bgp 65001
 ! Aggregate all /24s within 192.168.0.0/16
 ! Without summary-only, both the aggregate and the components are advertised:
 ! aggregate-address 192.168.0.0 255.255.0.0

 ! To suppress the component routes, configure:
 aggregate-address 192.168.0.0 255.255.0.0 summary-only
```

With `summary-only`, only `192.168.0.0/16` is advertised to neighbors; the individual /24s are suppressed.

## Step 3: Understand as-set Before Using It

Without `as-set`, the aggregate is advertised as coming from your AS and does not carry the component routes' full AS-path information. Cisco IOS supports `as-set` if you need to include that history:

```text
router bgp 65001
 ! Include AS-path information from all component routes
 aggregate-address 192.168.0.0 255.255.0.0 summary-only as-set
```

The aggregate will now carry an AS_SET built from the summarized paths, which can help BGP detect some loops. However, RFC 9774 (published in May 2025) deprecates origination of new BGP routes with AS_SET/AS_CONFED_SET, so `as-set` should not be treated as a default best practice for modern Internet-facing deployments.

## Step 4: Selectively Re-Advertise Component Routes

Instead of suppressing components for every peer, use an unsuppress map on a specific neighbor to continue advertising selected prefixes alongside the summary:

```text
! Define which prefixes to still advertise despite summary-only
ip prefix-list KEEP_ADVERTISED seq 10 permit 192.168.1.0/24

route-map UNSUPPRESS permit 10
 match ip address prefix-list KEEP_ADVERTISED

router bgp 65001
 aggregate-address 192.168.0.0 255.255.0.0 summary-only
 ! Re-advertise 192.168.1.0/24 to this specific neighbor
 neighbor 203.0.113.1 unsuppress-map UNSUPPRESS
```

## Step 5: Verify the Aggregate in the BGP Table

```text
Router# show ip bgp 192.168.0.0/16

BGP routing table entry for 192.168.0.0/16
  Paths: (1 available)
    Local, (aggregated by 65001 1.1.1.1)
      0.0.0.0 from 0.0.0.0 (1.1.1.1)
        Origin IGP, localpref 100, weight 32768
        Atomic aggregate
```

The `Atomic aggregate` attribute indicates the aggregate may not carry full path information because of aggregation; it is not the signal that `summary-only` was configured. The `s` status code on the component routes is the direct indicator that they were suppressed.

## Step 6: Verify Suppressed Routes

```text
! Check that component routes are suppressed (shown with 's' flag)
Router# show ip bgp

Status codes: s suppressed, d damped, h history, * valid, > best
!  s 192.168.1.0/24  0.0.0.0  32768 i   <- suppressed
!  s 192.168.2.0/24  0.0.0.0  32768 i   <- suppressed
! *> 192.168.0.0/16  0.0.0.0  32768 i   <- aggregate advertised
```

## Conclusion

BGP route aggregation with `summary-only` reduces the number of prefixes advertised by your AS. Always ensure component routes exist in the BGP table before creating an aggregate, be cautious with `as-set` because modern BGP standards deprecate AS_SET in new Internet-facing advertisements, and verify suppression with the `s` flag in `show ip bgp`.
