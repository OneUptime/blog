# How to Configure IPv6 Address Lifetime for Privacy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Privacy, Address Lifetime, RFC4941, Linux, Networking

Description: Configure IPv6 address preferred and valid lifetimes to optimize privacy by controlling how long temporary addresses remain active and when they are replaced.

## Introduction

IPv6 temporary addresses (RFC 4941/RFC 8981) have two key lifetime values: the **preferred lifetime** (how long the address is used for new connections) and the **valid lifetime** (how long existing connections using that address remain valid). Tuning these values balances privacy (shorter lifetimes) against connection stability (longer lifetimes).

## Understanding Address Lifetimes

```mermaid
timeline
    title IPv6 Temporary Address Lifecycle
    section Hour 0
        Address created : preferred + valid
    section Before preferred expiry
        New address generated : overlap for transition
    section Preferred lifetime ends
        Old addr deprecated : only for existing connections
    section Valid lifetime ends
        Old address expires : removed
```

- **Preferred lifetime**: During this period, the address is used for new outgoing connections
- **Valid lifetime**: After preferred expires, the address still works for established connections but no new ones are initiated from it
- **REGEN_ADVANCE**: RFC 8981 defines a lead time so Linux can generate the next temporary address before the current one is deprecated

## Default Linux Values

Current upstream Linux kernel defaults are:

| Parameter | Default | sysctl key |
|---|---|---|
| Preferred lifetime | 86400s (1 day) | `temp_prefered_lft` |
| Valid lifetime | 172800s (2 days) | `temp_valid_lft` |
| Min regeneration advance | 2 seconds | `regen_min_advance` |
| Regeneration retries | 5 | `regen_max_retry` |

Distributions or local sysctl overrides can set different runtime values, so verify the active values on the host you are tuning.

## Viewing Current Lifetime Settings

```bash
# Show all IPv6 privacy-related sysctl values for eth0

sysctl -a | grep -E "eth0.*(temp|addr_gen|use_temp)"

# Show lifetimes for eth0
sysctl net.ipv6.conf.eth0.temp_prefered_lft
sysctl net.ipv6.conf.eth0.temp_valid_lft
```

## Configuring Shorter Lifetimes for Higher Privacy

For higher privacy (at the cost of more address churn):

```bash
# /etc/sysctl.d/60-ipv6-privacy-strict.conf

# Enable temporary addresses and prefer them
net.ipv6.conf.default.use_tempaddr = 2
net.ipv6.conf.all.use_tempaddr = 2

# Preferred lifetime: 4 hours (14400 seconds)
net.ipv6.conf.default.temp_prefered_lft = 14400
net.ipv6.conf.all.temp_prefered_lft = 14400

# Valid lifetime: 24 hours (86400 seconds)
net.ipv6.conf.default.temp_valid_lft = 86400
net.ipv6.conf.all.temp_valid_lft = 86400
```

Apply the settings:

```bash
sudo sysctl -p /etc/sysctl.d/60-ipv6-privacy-strict.conf
```

## Configuring Longer Lifetimes for Stability

For server-like workloads where connection stability is more important:

```bash
# /etc/sysctl.d/60-ipv6-privacy-stable.conf

net.ipv6.conf.default.use_tempaddr = 2
net.ipv6.conf.all.use_tempaddr = 2

# Preferred lifetime: 3 days
net.ipv6.conf.default.temp_prefered_lft = 259200
net.ipv6.conf.all.temp_prefered_lft = 259200

# Valid lifetime: 14 days
net.ipv6.conf.default.temp_valid_lft = 1209600
net.ipv6.conf.all.temp_valid_lft = 1209600
```

## How the Router Advertisement Affects Lifetimes

The actual lifetime of a temporary address is bounded by both the router-advertised prefix lifetimes and your local privacy settings. Per RFC 8981, the valid lifetime is the lower of the advertised prefix valid lifetime and `temp_valid_lft`, while the preferred lifetime is capped by both the advertised preferred lifetime and `temp_prefered_lft` (with Linux also applying a randomized desynchronization factor).

```bash
# Request and display Router Advertisements to inspect advertised prefix lifetimes
sudo rdisc6 eth0

# Or use tcpdump to capture RA packets
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 134"
```

If the RA advertises shorter prefix lifetimes than your local sysctl settings, the advertised values cap the resulting temporary address lifetime.

## Checking Current Address Lifetimes

```bash
# Show addresses with their remaining lifetimes
ip -6 addr show eth0

# Example output:
# inet6 2001:db8::a1b2:c3d4:e5f6:7890/64 scope global temporary dynamic
#    valid_lft 72000sec preferred_lft 3600sec
# The address will be preferred for 1 hour more, valid for 20 hours more
```

## Verifying Lifetime Changes Take Effect

Existing temporary addresses keep their current remaining lifetimes; the new settings apply to newly generated temporary addresses.

```bash
# Ask for a fresh Router Advertisement so the kernel refreshes SLAAC state
sudo rdisc6 eth0

# Check temporary addresses and their remaining lifetimes
ip -6 addr show dev eth0 temporary
```

## Conclusion

IPv6 address lifetimes are a key tunable in the privacy/stability tradeoff. Shorter preferred lifetimes rotate your visible address more frequently, reducing the window for cross-session correlation. Longer valid lifetimes ensure that existing connections (downloads, VPN sessions, SSH) are not abruptly terminated. Configure these values based on your threat model and workload type, and always verify that router-advertised prefix lifetimes are compatible with your local settings.
