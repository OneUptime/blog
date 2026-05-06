# How to Configure BGP Peer Groups to Simplify Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Peer Groups, Cisco IOS, Configuration Management, Routing

Description: Learn how to use BGP peer groups to apply a common configuration template to multiple neighbors, reducing repetition and improving consistency.

## What Are BGP Peer Groups?

When you have many BGP neighbors with the same policy (same route maps, prefix lists, timers, or AS number), configuring each one individually creates repetitive configuration that's hard to maintain. BGP peer groups let you define a template once and apply it to many neighbors.

Benefits:
- Reduced configuration length
- Consistent policy across similar neighbors
- Faster UPDATE generation (Cisco processes peer group members together)

## Step 1: Create a Peer Group

Define the peer group under the BGP router process:

```text
router bgp 65001
 ! Create a peer group called CUSTOMERS
 neighbor CUSTOMERS peer-group

 ! Apply common configuration to the peer group
 neighbor CUSTOMERS remote-as 65100
 neighbor CUSTOMERS description Customer-AS65100
 neighbor CUSTOMERS password CustomerBGP!
 neighbor CUSTOMERS maximum-prefix 100 80
 neighbor CUSTOMERS soft-reconfiguration inbound
```

## Step 2: Apply Filters and Route Maps to the Peer Group

Define policy once on the group instead of on each neighbor:

```text
router bgp 65001
 ! Apply prefix lists to peer group
 neighbor CUSTOMERS prefix-list CUSTOMER_PREFIXES in
 neighbor CUSTOMERS prefix-list OUR_ROUTES out

 ! Apply route map
 neighbor CUSTOMERS route-map CUSTOMER_IN in

 ! Set send-community
 neighbor CUSTOMERS send-community both
```

## Step 3: Add Individual Neighbors to the Peer Group

Now assign individual neighbor IPs to the peer group:

```text
router bgp 65001
 ! Individual customers inherit all CUSTOMERS peer group settings
 neighbor 10.1.1.1 peer-group CUSTOMERS
 neighbor 10.1.2.1 peer-group CUSTOMERS
 neighbor 10.1.3.1 peer-group CUSTOMERS
 neighbor 10.1.4.1 peer-group CUSTOMERS
```

Each neighbor automatically inherits the group's route maps, prefix lists, timers, and password.

## Step 4: Create Separate Groups for Different Peer Types

Use multiple peer groups for different peer types:

```text
router bgp 65001

 ! iBGP peer group for internal route reflector clients
 neighbor IBGP_CLIENTS peer-group
 neighbor IBGP_CLIENTS remote-as 65001
 neighbor IBGP_CLIENTS update-source Loopback0
 neighbor IBGP_CLIENTS next-hop-self
 neighbor IBGP_CLIENTS route-reflector-client

 ! eBGP peer group for ISP uplinks
 neighbor ISP_UPLINKS peer-group
 neighbor ISP_UPLINKS description ISP-Peering
 neighbor ISP_UPLINKS maximum-prefix 900000 80
 neighbor ISP_UPLINKS prefix-list BOGON_FILTER in

 ! Assign members to their groups
 neighbor 10.0.1.1 peer-group IBGP_CLIENTS
 neighbor 10.0.1.2 peer-group IBGP_CLIENTS
 neighbor 10.0.1.3 peer-group IBGP_CLIENTS

 neighbor 203.0.113.1 peer-group ISP_UPLINKS
 neighbor 203.0.113.1 remote-as 65100

 neighbor 198.51.100.1 peer-group ISP_UPLINKS
 neighbor 198.51.100.1 remote-as 65200
```

## Step 5: Override Settings for Individual Members

Individual neighbors can override specific peer group settings:

```text
router bgp 65001
 ! Member 10.1.5.1 needs a higher max-prefix limit than the group default
 neighbor 10.1.5.1 peer-group CUSTOMERS
 neighbor 10.1.5.1 maximum-prefix 500   ! Overrides group's 100 limit
```

Per-neighbor settings that do not affect outbound updates can override peer group defaults.

## Step 6: Verify Peer Group Configuration

```text
! Show peer group details
Router# show ip bgp peer-group CUSTOMERS

BGP peer-group is CUSTOMERS, remote AS 65100
  BGP version 4
  Default minimum time between advertisement runs is 30 seconds
  For address family: IPv4 Unicast
    BGP neighbor is CUSTOMERS, peer-group external, members:
      10.1.1.1  10.1.2.1  10.1.3.1  10.1.4.1

! Verify a specific member's configuration
Router# show ip bgp neighbors 10.1.1.1 | include peer-group
Member of peer-group CUSTOMERS for session parameters
```

## Step 7: Apply Peer Groups in the Address Family

In the address-family model, activate peer groups within the address family:

```text
router bgp 65001
 neighbor CUSTOMERS peer-group
 neighbor CUSTOMERS remote-as 65100

 address-family ipv4 unicast
  neighbor CUSTOMERS activate
  neighbor CUSTOMERS prefix-list CUSTOMER_PREFIXES in
  neighbor 10.1.1.1 peer-group CUSTOMERS
  neighbor 10.1.2.1 peer-group CUSTOMERS
 exit-address-family
```

## Conclusion

BGP peer groups dramatically simplify large BGP configurations by allowing a single policy definition to be shared across many neighbors. Create groups for each peer type (customer, ISP, iBGP), apply filters and route maps to the group, then assign individual neighbor IPs. Use `show ip bgp peer-group` to verify membership and inherited settings.
