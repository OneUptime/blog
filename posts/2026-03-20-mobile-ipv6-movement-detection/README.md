# How to Understand Mobile IPv6 Movement Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Mobile IPv6, Movement Detection, NDP, Router Advertisement, RFC 6275

Description: Understand the mechanisms Mobile IPv6 uses to detect network movement, including Router Advertisement monitoring, prefix change detection, and link-layer indications.

## Introduction

Movement detection is the process by which a Mobile Node determines it has moved to a new network. Fast and accurate detection minimizes handover latency, which directly impacts ongoing connections. RFC 6275 specifies a generic movement detection algorithm based on Router Discovery and Neighbor Unreachability Detection; implementations can supplement this with link-layer hints and faster probing strategies.

## Movement Detection Methods

### Method 1: Router Advertisement Monitoring (Default)

The MN monitors Router Advertisements (RAs) from the default router. A new or different RA prefix indicates movement.

```bash
# Monitor incoming Router Advertisements

sudo tcpdump -i eth0 -n "icmp6 and ip6[40] == 134" -v
# Type 134 = Router Advertisement

# What to look for in RA:
# - New router LL address (fe80::X)
# - New Prefix Information Option (different prefix)
# - Reachability failure of old default router
```

```python
# Simplified movement detection logic (pseudo-code)

class MovementDetector:
    def __init__(self):
        self.current_prefix = None
        self.current_default_router = None

    def process_router_advertisement(self, ra):
        """Called when an RA is received."""
        new_prefix = ra.prefix_information.prefix
        new_router = ra.source_address  # link-local of the router

        if self.current_prefix is None:
            # First RA - establish baseline
            self.current_prefix = new_prefix
            self.current_default_router = new_router
            return

        # Detect movement via prefix change
        if new_prefix != self.current_prefix:
            print(f"Movement detected!")
            print(f"  Old prefix: {self.current_prefix}")
            print(f"  New prefix: {new_prefix}")
            self.on_movement_detected(new_prefix, new_router)

    def detect_router_unreachability(self):
        """
        Eager detection: MN probes current router via NUD.
        If router becomes unreachable, assume movement occurred.
        """
        if not self.is_router_reachable(self.current_default_router):
            print("Default router unreachable - movement likely!")
            self.on_movement_detected(None, None)

    def on_movement_detected(self, new_prefix, new_router):
        """Trigger handover procedure."""
        pass  # Implemented by MIPv6 daemon
```

### Method 2: Neighbor Unreachability Detection (NUD)

The MN uses NUD to probe the current default router. If unreachable, movement is inferred.

```bash
# Force NUD for the default router
# (Check if default router fe80::1 is still reachable)
ping6 -c 1 -I eth0 fe80::1%eth0

# NUD threshold tuning for faster detection
# Probe every 1 second, declare unreachable after 3 failures
sysctl net.ipv6.neigh.eth0.ucast_solicit=3
sysctl net.ipv6.neigh.eth0.retrans_time_ms=1000  # 1 second between probes
```

### Method 3: Link-Layer Indications (Fastest)

802.11 (Wi-Fi) and LTE interfaces can trigger movement detection immediately via link-layer events.

```bash
# Monitor link-layer events with ip monitor
ip -6 monitor link address route

# netlink events for link down/up (triggers movement detection)
# IFLA_OPERSTATE change from UP to DOWN = potential movement

# NetworkManager can trigger MIPv6 daemon on handover
# /etc/NetworkManager/dispatcher.d/10-mipv6.sh
#!/bin/bash
[ "$2" = "up" ] && systemctl restart mip6d
```

## Detecting False Movement

False movement can occur when the RA is delayed or dropped. The MN should confirm movement with multiple evidence sources.

```python
def is_genuine_movement(mn_state) -> bool:
    """
    Confirm movement before triggering handover.
    Returns True only if multiple indicators agree.
    """
    score = 0

    # Evidence 1: RA from new prefix
    if mn_state.new_ra_received and \
       mn_state.new_ra_prefix != mn_state.current_prefix:
        score += 3

    # Evidence 2: Current router unreachable
    if not mn_state.current_router_reachable:
        score += 2

    # Evidence 3: Link layer indication
    if mn_state.link_layer_movement_indicated:
        score += 4

    # Trigger movement if score >= 3 (at least one strong indicator)
    return score >= 3
```

## Configuring Movement Detection in UMIP

```bash
# /etc/mip6d.conf - tuning movement detection
NodeConfig MN;

Interface "eth0" {
    MnIfPreference 1;
}

# Tune NUD-based router reachability probing for faster detection
MnRouterProbes 3;           # Number of probes before declaring router unreachable
MnRouterProbeTimeout 1.0;   # Seconds between probes of the old router
MnMaxHaBindingLife 3600;    # Max HA binding lifetime
```

## Conclusion

Mobile IPv6 movement detection uses a combination of RA monitoring, NUD probing, and link-layer signals. Faster detection reduces handover latency. Aggressive NUD settings or link-layer triggers can reduce detection time from seconds to milliseconds. Monitor handover frequency and detection time with OneUptime to optimize MIPv6 deployment for your user patterns.
