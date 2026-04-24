# How to Configure radvd Route Information Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Radvd, Route Information, RFC4191, Routing, Networking

Description: Configure radvd Route Information Options per RFC 4191 to advertise specific IPv6 routes to clients, enabling multi-router environments and more specific routing without DHCPv6.

## Introduction

RFC 4191 defines the Route Information Option for IPv6 Router Advertisements. This option allows a router to advertise specific prefixes as reachable via the advertising router, enabling scenarios like multi-router networks where different prefixes are reachable via different gateways.

## When to Use Route Information Options

Standard Router Advertisements provide a default route (`::/0`). Route Information Options are needed when:
- Multiple routers serve different prefixes on the same LAN
- A specific prefix should be routed via a different gateway than the default
- Clients need to know about off-link prefixes without a DHCPv6 server

## Basic Route Configuration in radvd

```text
# /etc/radvd.conf

# Advertise route information alongside prefix and DNS

interface eth1 {
    AdvSendAdvert on;
    AdvManagedFlag off;
    AdvOtherConfigFlag off;

    prefix 2001:db8:1:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };

    # Advertise a specific route to the 2001:db8:2::/48 network
    # via this router (which is the RA sender)
    route 2001:db8:2::/48 {
        AdvRouteLifetime 1800;
        AdvRoutePreference medium;
    };
};
```

On Linux, more-specific Route Information Options are accepted only up to `net.ipv6.conf.<interface>.accept_ra_rt_info_max_plen`. Set it to at least the advertised prefix length (for example, `48` for a `/48` route) or the kernel will ignore the route.

## Route Preference Values

RFC 4191 defines three preference levels, encoded the same way as default router preference:

```text
# High preference: use this route preferentially over others
route 2001:db8:10::/48 {
    AdvRouteLifetime 1800;
    AdvRoutePreference high;
};

# Medium preference: default, use when no high-preference route exists
route 2001:db8:20::/48 {
    AdvRouteLifetime 1800;
    AdvRoutePreference medium;
};

# Low preference: fallback route, only use if no higher-preference route
route 2001:db8:30::/48 {
    AdvRouteLifetime 1800;
    AdvRoutePreference low;
};
```

## Multi-Router Environment

Two routers on the same segment advertising different prefixes:

**Router 1** (`/etc/radvd.conf` on `192.168.1.1` / `2001:db8:1:1::1`):
```text
interface eth1 {
    AdvSendAdvert on;
    # Router lifetime: clients use this router as default gateway
    AdvDefaultLifetime 1800;

    prefix 2001:db8:1:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };

    # Router 1 handles the primary corporate prefix
    route 2001:db8:100::/48 {
        AdvRouteLifetime 1800;
        AdvRoutePreference high;
    };
};
```

**Router 2** (`/etc/radvd.conf` on `2001:db8:1:1::2`):
```text
interface eth1 {
    AdvSendAdvert on;
    # Set lifetime to 0 so Router 2 is NOT the default gateway
    AdvDefaultLifetime 0;

    # No prefix block - Router 1 handles SLAAC

    # Router 2 only provides routes to the DMZ
    route 2001:db8:200::/48 {
        AdvRouteLifetime 1800;
        AdvRoutePreference high;
    };
};
```

## Verifying Route Information Is Received

On a client that receives these RAs:

```bash
# Check if the route information was installed
ip -6 route show

# Expected output includes a route learned from RA, for example:
# 2001:db8:2::/48 via fe80::<router-link-local> dev eth0 proto ra

# Use rdisc6 to inspect the received RA, including route information options
rdisc6 eth0
# Look for "Route Information" sections in the output
```

## Advertising a Default Route with Preference

You can also use the route option to advertise the default route with a specific preference:

```text
# Advertise the default route with high preference
route ::/0 {
    AdvRouteLifetime 1800;
    AdvRoutePreference high;
};
```

On hosts that process Route Information Options, this overrides the default-route preference and lifetime from the RA header. For general default-router preference, `AdvDefaultPreference` in the RA header is still the usual setting.

## Conclusion

Route Information Options in radvd extend the basic default-gateway-only model of standard Router Advertisements to support multi-router environments and specific prefix routing. By combining prefix options, RDNSS, DNSSL, and route information in a single RA, you can achieve fully stateless IPv6 client configuration for complex network topologies. Use route preferences to control failover and route selection between multiple routers.
