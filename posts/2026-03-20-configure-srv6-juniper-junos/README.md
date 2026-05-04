# How to Configure SRv6 on Juniper Junos

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Juniper, Junos, Segment Routing, Traffic Engineering

Description: Configure SRv6 segment routing on Juniper Junos routers, including locator blocks, IS-IS SRv6 extensions, and traffic engineering using SRv6 policies.

## Introduction

Juniper Junos supports SRv6 on MX, PTX, and ACX platforms. Configuration uses the familiar Junos hierarchical CLI. This guide covers locator blocks, IS-IS advertisement, and verifying SRv6 forwarding.

## SRv6 Locator Configuration

```text
# Junos SRv6 configuration

set routing-options source-packet-routing srv6 locator MAIN 5f00:2::/48
set routing-options source-packet-routing srv6 locator MAIN micro-sid
set routing-options source-packet-routing srv6 source-address 5f00:2::1

# Alternatively in full hierarchy:
routing-options {
    source-packet-routing {
        srv6 {
            locator MAIN 5f00:2::/48 {
                micro-sid;
            }
            source-address 5f00:2::1;
        }
    }
}
```

## Loopback and Interface Configuration

```text
# Assign a locator-derived address to loopback
set interfaces lo0 unit 0 family inet6 address 5f00:2::1/128

# Enable IPv6 on interfaces
set interfaces ge-0/0/0 unit 0 family inet6 address fd00:12::2/64

interfaces {
    ge-0/0/0 {
        unit 0 {
            family inet6 {
                address fd00:12::2/64;
            }
        }
    }
    ge-0/0/1 {
        unit 0 {
            family inet6 {
                address fd00:23::2/64;
            }
        }
    }
}
```

## IS-IS with SRv6 Extensions

```text
protocols {
    isis {
        level 2 wide-metrics-only;
        interface ge-0/0/0.0 {
            level 2 metric 10;
        }
        interface ge-0/0/1.0 {
            level 2 metric 10;
        }
        interface lo0.0 {
            passive;
        }
        source-packet-routing {
            srv6 {
                locator MAIN end-sid 5f00:2::1 flavor psp;
            }
        }
    }
}
```

## Verification Commands

```bash
# Show SRv6 locators
show segment-routing srv6 locator detail

# Show SRv6 SIDs
show segment-routing srv6 sid detail

# Show IS-IS SRv6 database
show isis database extensive | grep -A10 "SRv6"

# Show forwarding
show route 5f00:2::/48 detail
show route 5f00:1:0:e001:: detail

# Ping using SRv6 destination
ping inet6 5f00:3::1 source 5f00:2::1
```

## SRv6 Traffic Engineering Policy

```text
# SRv6 TE policy via segment-list and policy
routing-options {
    source-packet-routing {
        srv6 {
            segment-list VIA-R3 {
                segment index 10 srv6-sid 5f00:3:0:e001::;
                segment index 20 srv6-sid 5f00:1:0:e000::;
            }
            policy R2-to-R1-via-R3 {
                endpoint 5f00:1::;
                color 100;
                candidate-path preference 100 {
                    segment-list VIA-R3;
                }
            }
        }
    }
}
```

## BGP with SRv6 for L3VPN

```text
# Enable SRv6 service exchange on the iBGP group
protocols {
    bgp {
        group IBGP {
            family inet-vpn {
                unicast {
                    extended-nexthop;
                    advertise-srv6-service;
                    accept-srv6-service;
                }
            }
        }
    }
}

# Bind the locator and End.DT4 SID to the customer VRF
routing-instances {
    CUSTOMER-A {
        instance-type vrf;
        route-distinguisher 65002:100;
        vrf-target target:65002:100;
        protocols {
            bgp {
                source-packet-routing {
                    srv6 {
                        locator MAIN {
                            end-dt4-sid 5f00:2:0:e004::;
                        }
                    }
                }
            }
        }
    }
}
```

## Conclusion

Juniper Junos SRv6 configuration lives under the `routing-options source-packet-routing srv6` hierarchy, with per-VRF SID binding under `routing-instances <name> protocols bgp source-packet-routing srv6`. IS-IS advertises locators and End-SIDs. Use `show segment-routing srv6 locator` and `show segment-routing traffic-engineering policy detail` to verify forwarding and TE policies. Monitor SRv6 path status and BGP session health with OneUptime.
