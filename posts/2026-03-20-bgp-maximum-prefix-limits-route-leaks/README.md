# How to Set Up BGP Maximum-Prefix Limits to Prevent Route Leaks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Maximum-Prefix, Route Leaks, Cisco IOS, Security, Routing

Description: Learn how to configure BGP maximum-prefix limits on neighbor sessions to protect your routers from route leak events and accidental full-table injections.

## Why Maximum-Prefix Limits Matter

Route leaks-where an AS accidentally or maliciously advertises prefixes it shouldn't-have caused major Internet outages. BGP maximum-prefix limits provide a circuit breaker: when the number of prefixes received from a neighbor exceeds the configured limit, the session is torn down or a warning is triggered, protecting your routing table from corruption.

## Step 1: Set a Maximum-Prefix Limit

The `maximum-prefix` command sets how many prefixes can be received from a neighbor before action is taken:

```text
router bgp 65001
 ! Accept maximum 500 prefixes from this customer
 ! Session tears down if exceeded
 neighbor 10.0.0.1 maximum-prefix 500

 ! For an ISP full-table peer, allow up to 1.3 million routes
 ! (set warning threshold at 80%, tear down at 100%)
 neighbor 203.0.113.1 maximum-prefix 1300000 80

 ! Warning only - log but don't tear down the session
 neighbor 198.51.100.1 maximum-prefix 500 warning-only
```

The percentage threshold triggers a syslog warning when that percentage of the limit is reached, giving you advance notice before the session drops.

## Step 2: Configure Restart After Limit Is Hit

By default, once a session is torn down due to maximum-prefix, it stays down until manually cleared. Use `restart` to automatically re-establish after a cooldown period:

```text
router bgp 65001
 ! Tear down session if >500 prefixes received, auto-restart after 5 minutes
 neighbor 10.0.0.1 maximum-prefix 500 restart 5
```

This prevents a permanently broken session while still protecting against route floods.

## Step 3: Recommended Limits by Peer Type

| Peer Type | Recommended Limit | Warning Threshold |
|---|---|---|
| Customer (/24 only) | 10–50 | 80% |
| Customer (small ISP) | 500–5000 | 75% |
| Regional ISP partial table | 50,000 | 75% |
| Tier-1 ISP full table | 1,300,000 | 80% |
| iBGP peer (route reflector) | 1,300,000 | 80% |

Always set the limit 20–25% above the expected prefix count to accommodate normal growth.

## Step 4: Monitor Current Prefix Counts

Check the current prefix count per neighbor to set appropriate limits:

```text
Router# show ip bgp summary

Neighbor        V     AS   MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.0.0.1        4  65100       100     100       50    0    0 01:00:00       45
203.0.113.1     4  65200     50000   50000     9000    0    0 5d00h      1052261

! PfxRcd column shows current prefix count from each neighbor
```

Set limits approximately 20-25% above the `PfxRcd` value.

## Step 5: Handle a Tripped Maximum-Prefix Session

When a session trips the maximum-prefix limit, the log shows:

```text
%BGP-4-MAXPFX: No. of prefix received from 10.0.0.1 (afi 0) reaches 500, max 500
%BGP-3-MAXPFXEXCEED: No. of prefix received from 10.0.0.1 (afi 0): 501 exceed limit 500
```

To restore the session after the peer has corrected their announcements:

```text
! Clear the BGP session to allow it to re-establish
Router# clear ip bgp 10.0.0.1

! Or wait for the automatic restart timer if configured
```

## Step 6: Apply to Address Families

For routers using address-family model, configure maximum-prefix within the address family:

```text
router bgp 65001
 address-family ipv4 unicast
  neighbor 10.0.0.1 activate
  neighbor 10.0.0.1 maximum-prefix 500 80 warning-only
 exit-address-family
```

## Conclusion

BGP maximum-prefix limits are a critical defensive measure against route leaks and BGP table flooding. Configure limits on every neighbor session-use `warning-only` for iBGP peers and established ISP connections, and automatic tear-down with `restart` for customer peerings where prefix counts should be predictable and small.
