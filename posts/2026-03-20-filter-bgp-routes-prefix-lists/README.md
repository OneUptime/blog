# How to Filter BGP Routes Using Prefix Lists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Prefix Lists, Cisco IOS, Route Filtering, Network Security

Description: Learn how to create and apply IP prefix lists to filter BGP routes, controlling which prefixes are accepted from neighbors or advertised to them.

## Why Filter BGP Routes?

Accepting all BGP routes from a neighbor is dangerous. A misconfigured or malicious peer can advertise routes that hijack your traffic or fill your routing table with bogon prefixes. Prefix lists provide a fast, readable way to allow only specific prefixes.

## Step 1: Create a Prefix List

Prefix lists match routes based on the network address and prefix length. The `ge` (greater-than-or-equal) and `le` (less-than-or-equal) keywords control the length range:

```text
! Allow only prefixes from 10.0.0.0/8 with lengths between /24 and /32
ip prefix-list CUSTOMER_IN seq 10 permit 10.0.0.0/8 ge 24 le 32

! Allow a specific summary prefix exactly
ip prefix-list CUSTOMER_IN seq 20 permit 192.168.100.0/24

! Implicit deny at the end - no explicit deny needed
! But you can add it explicitly for clarity:
ip prefix-list CUSTOMER_IN seq 999 deny 0.0.0.0/0 le 32
```

An implicit `deny any` exists at the end of every prefix list. Any prefix not matched by a permit statement is dropped.

## Step 2: Block Bogon Prefixes

Bogons are IP ranges that should never appear in global routing tables (RFC 1918, documentation ranges, etc.):

```text
! Block RFC 1918 private addresses
ip prefix-list BOGON_BLOCK seq 10 deny 10.0.0.0/8 le 32
ip prefix-list BOGON_BLOCK seq 20 deny 172.16.0.0/12 le 32
ip prefix-list BOGON_BLOCK seq 30 deny 192.168.0.0/16 le 32

! Block documentation ranges
ip prefix-list BOGON_BLOCK seq 40 deny 192.0.2.0/24 le 32
ip prefix-list BOGON_BLOCK seq 50 deny 198.51.100.0/24 le 32
ip prefix-list BOGON_BLOCK seq 60 deny 203.0.113.0/24 le 32

! Block default route (unless you specifically want it)
ip prefix-list BOGON_BLOCK seq 70 deny 0.0.0.0/0

! Permit everything else
ip prefix-list BOGON_BLOCK seq 999 permit 0.0.0.0/0 le 32
```

## Step 3: Apply the Prefix List to a BGP Neighbor

Apply prefix lists inbound (filter what you accept) or outbound (filter what you advertise):

```text
router bgp 65001
 ! Apply inbound filter - only accept valid prefixes from neighbor
 neighbor 203.0.113.1 prefix-list BOGON_BLOCK in

 ! Apply outbound filter - only advertise the intended prefix to neighbor
 neighbor 203.0.113.1 prefix-list OUR_PREFIX out
```

Create the outbound filter:

```text
! Only advertise the example prefix
ip prefix-list OUR_PREFIX seq 10 permit 198.51.100.0/24
ip prefix-list OUR_PREFIX seq 999 deny 0.0.0.0/0 le 32
```

## Step 4: Activate the Filter

After applying a new filter, perform a soft reset to apply it without dropping the BGP session when the peer supports route refresh:

```text
! Soft reset inbound (re-evaluate received routes against new filter)
Router# clear ip bgp 203.0.113.1 soft in

! Soft reset outbound (re-advertise routes through new filter)
Router# clear ip bgp 203.0.113.1 soft out
```

## Step 5: Verify Filter Operation

```text
! View the prefix list configuration
Router# show ip prefix-list BOGON_BLOCK

! Check which routes are being received before filtering
Router# show ip bgp neighbors 203.0.113.1 received-routes

! Check which routes are accepted after filtering
Router# show ip bgp neighbors 203.0.113.1 routes
```

The `received-routes` view is only available when inbound soft reconfiguration is enabled for that neighbor with `neighbor 203.0.113.1 soft-reconfiguration inbound`. That stores unmodified updates and uses additional memory. If you have not enabled inbound soft reconfiguration, use `routes` to verify the prefixes that were accepted.

If `received-routes` shows more entries than `routes`, your filter is working as intended.

## Prefix List vs Access List for BGP Filtering

| Feature | Prefix List | Access List |
|---|---|---|
| Match prefix length | Yes (`ge`/`le`) | Limited (exact mask or wildcard matching, no `ge`/`le`) |
| Performance | Better for large lists | Lower for large lists |
| Readability | High | Lower |
| Recommended for BGP | Usually yes | Still supported, but less convenient |

## Conclusion

Prefix lists are the recommended tool for BGP route filtering in Cisco IOS. Create permit/deny entries based on network addresses and prefix lengths, apply them inbound and outbound with `neighbor X.X.X.X prefix-list`, and use `clear ip bgp soft` to activate changes without session disruption when the peer supports route refresh.
