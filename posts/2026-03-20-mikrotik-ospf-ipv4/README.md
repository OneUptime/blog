# How to Set Up OSPF for IPv4 on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, RouterOS, OSPF, IPv4, Dynamic Routing, Networking

Description: Configure OSPF on MikroTik RouterOS to dynamically exchange IPv4 routes between routers, set router IDs, configure area types, and redistribute connected networks.

## Introduction

OSPF (Open Shortest Path First) is a link-state routing protocol that automatically discovers and maintains IPv4 routes. MikroTik RouterOS supports OSPF through the `/routing ospf` menu, with support for multiple areas, authentication, and route redistribution.

## Basic OSPF Configuration (RouterOS v7)

```mikrotik
# Create OSPF instance

/routing ospf instance add \
  name=ospf-main \
  router-id=1.1.1.1 \
  comment="Main OSPF"

# Create backbone area
/routing ospf area add \
  name=backbone \
  area-id=0.0.0.0 \
  instance=ospf-main

# Add interfaces to OSPF
/routing ospf interface-template add \
  interfaces=ether1 \
  area=backbone \
  hello-interval=10s \
  dead-interval=40s

/routing ospf interface-template add \
  interfaces=ether2 \
  area=backbone
```

## RouterOS v6 Syntax

```mikrotik
# v6 uses older command structure
/routing ospf instance set default router-id=1.1.1.1

/routing ospf network add \
  network=192.168.1.0/24 \
  area=backbone

/routing ospf network add \
  network=10.1.0.0/16 \
  area=backbone
```

## Passive Interface (Don't Send Hello on LAN)

```mikrotik
# Mark LAN interfaces as passive (advertise but don't form neighbors)
/routing ospf interface-template add \
  interfaces=bridge-lan \
  area=backbone \
  passive=yes
```

## OSPF Authentication

```mikrotik
/routing ospf interface-template add \
  interfaces=ether1 \
  area=backbone \
  auth=md5 \
  authentication-key=OSPFsecret123
```

## Stub and NSSA Areas

```mikrotik
# Create stub area
/routing ospf area add \
  name=area1 \
  area-id=0.0.0.1 \
  instance=ospf-main \
  type=stub

# Create NSSA area
/routing ospf area add \
  name=area2 \
  area-id=0.0.0.2 \
  instance=ospf-main \
  type=nssa
```

## Route Redistribution

```mikrotik
/routing ospf instance set ospf-main \
  redistribute=connected,static \
  comment="Redistribute connected and static into OSPF"
```

## Verify OSPF

```mikrotik
# Show OSPF neighbors
/routing ospf neighbor print

# Show OSPF routes in routing table
/ip route print where ospf

# Show OSPF instance status
/routing ospf instance print

# Show LSDB (link state database)
/routing ospf lsa print
```

## Conclusion

MikroTik OSPF configuration creates an instance, defines areas, and attaches interfaces via interface templates (RouterOS v7) or network statements (v6). Mark LAN-facing interfaces as passive to avoid sending hellos to end hosts, enable MD5 authentication on inter-router links, and redistribute connected routes to share all directly attached subnets with OSPF neighbors.
