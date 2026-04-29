# Understanding Linux use_tempaddr for IPv6 Privacy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Use_tempaddr, Sysctl, Privacy Extensions, SLAAC

Description: A deep dive into the Linux `use_tempaddr` sysctl parameter for IPv6 privacy extensions, covering all three values, address lifecycle management, preferred lifetime tuning, and per-interface...

The `net.ipv6.conf.*.use_tempaddr` sysctl controls how Linux generates and uses temporary IPv6 addresses from SLAAC (Router Advertisement). This parameter controls the IPv6 privacy extensions described by RFC 8981, which obsoletes RFC 4941.

## Understanding use_tempaddr Values

```bash
# Check current value

sysctl net.ipv6.conf.all.use_tempaddr
sysctl net.ipv6.conf.eth0.use_tempaddr

# Value 0: Disabled
# - No temporary addresses generated
# - Only stable/EUI-64 address used (or RFC 7217 stable privacy if configured)
# - Appropriate for servers with DNS entries

# Value 1: Generate but prefer stable
# - Temporary address is generated and kept
# - BUT stable address is preferred for outgoing connections
# - Temporary address still exists (visible on the interface)
# - Rarely the right choice (temporary address is not normally selected while a stable/public address is available)

# Value 2 (and any value >1): Generate and prefer temporary (RECOMMENDED for clients)
# - Temporary address generated
# - Temporary address is PREFERRED for outgoing connections
# - Stable address still exists (for incoming connections)
# - This is what most Linux distributions should use for desktop/laptop
```

## Checking Address Assignment After Enabling

```bash
# Enable use_tempaddr = 2
sysctl -w net.ipv6.conf.all.use_tempaddr=2
sysctl -w net.ipv6.conf.default.use_tempaddr=2

# Request a new RA (or wait for router to send one)
# Force interface restart to get new addresses immediately
ip link set eth0 down && ip link set eth0 up

# OR send Router Solicitation to trigger RA
rdisc6 eth0   # Requires rdisc6 tool (ndisc6 package)

# Check addresses after RA received
ip -6 addr show eth0

# Expected output with two global addresses (exact lifetimes depend on the RA and your temp_* sysctls):
# inet6 2001:db8:x:x:TEMP:TEMP:TEMP:TEMP/64 scope global temporary dynamic
#   valid_lft 604794sec preferred_lft 86393sec
# inet6 2001:db8:x:x:STABLE:STABLE:STABLE:STABLE/64 scope global dynamic mngtmpaddr
#   valid_lft 2591990sec preferred_lft 604790sec
```

## Address Lifecycle and Timers

```bash
# Temporary address timers:
# preferred_lft = how long this address is preferred for new connections
# valid_lft = how long the address can still be used for existing connections

# As preferred_lft approaches expiry:
# 1. Linux normally generates a new temporary address before the old one is deprecated
# 2. The old temporary address enters "deprecated" state when preferred_lft reaches 0
# 3. Existing connections using old address continue until valid_lft expires

# Check address state
ip -6 addr show eth0 | grep -E "temporary|mngtmpaddr"

# Monitor address transitions
ip -6 monitor address
```

## Configuring Temporary Address Lifetimes

```bash
# View all temporary address parameters
sysctl -a | grep "temp"

# Key parameters:
# net.ipv6.conf.*.temp_prefered_lft  - preferred lifetime for temp addresses (default: 86400 = 24h)
# net.ipv6.conf.*.temp_valid_lft     - valid lifetime for temp addresses (default: 172800 = 2d)
# net.ipv6.conf.*.regen_max_retry    - max retries for generating non-conflicting temp address
# net.ipv6.conf.*.max_desync_factor  - randomization factor subtracted from preferred_lft

# Set shorter preferred lifetime (rotate every 6 hours)
cat > /etc/sysctl.d/99-ipv6-tempaddr.conf << 'EOF'
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2

# Rotate temporary address every 6 hours (preferred lifetime)
net.ipv6.conf.all.temp_prefered_lft = 21600

# Keep the address valid for up to 24 hours total, so deprecated addresses
# can continue serving existing connections after the 6-hour preferred lifetime ends
net.ipv6.conf.all.temp_valid_lft = 86400

# Randomization: subtract up to 600 seconds randomly from preferred_lft
# Prevents all devices from rotating at the exact same time
net.ipv6.conf.all.max_desync_factor = 600
EOF

sysctl --system
```

## Per-Interface Configuration

```bash
# Enable for client interfaces, disable for server interfaces
cat > /etc/sysctl.d/99-ipv6-tempaddr-selective.conf << 'EOF'
# Client interface (laptop WiFi/ethernet) - enable privacy
net.ipv6.conf.wlan0.use_tempaddr = 2
net.ipv6.conf.eth0.use_tempaddr = 2

# Server interface - disable privacy (needs stable address for DNS)
net.ipv6.conf.eth1.use_tempaddr = 0

# Container/VM bridge interface - disable (containers use their own addressing)
net.ipv6.conf.docker0.use_tempaddr = 0
net.ipv6.conf.br-default.use_tempaddr = 0
EOF

sysctl --system
```

## Verifying Source Address Selection

```bash
# The kernel's default address selection (RFC 6724) prefers:
# temporary addresses over stable when use_tempaddr = 2

# Check source address used for a specific destination
ip -6 route get 2001:4860:4860::8888
# Look for "src" field - should show temporary address

# Confirm with an actual connection
curl -6 https://ipv6.icanhazip.com
# Or
wget -6 -O- https://ipv6.icanhazip.com 2>/dev/null

# The returned address should be your temporary address

# Verify using strace to see connect() syscall
strace -e connect curl -6 -s https://ipv6.icanhazip.com 2>&1 | grep "sin6_addr"
```

## Relationship with mngtmpaddr Flag

```bash
# The "mngtmpaddr" flag marks an address as the template
# from which temporary addresses are generated
ip -6 addr show eth0 | grep mngtmpaddr

# If mngtmpaddr flag is missing, temporary addresses won't be generated
# from that manually added address
# This can happen after manually adding an address:
ip -6 addr add 2001:db8::1/64 dev eth0
# This doesn't get mngtmpaddr - temporary addresses can still come from SLAAC,
# but not from this manual address

# Stable SLAAC addresses have both "dynamic" and "mngtmpaddr" flags:
# inet6 2001:db8::xxx/64 scope global dynamic mngtmpaddr
```

## Integration with NetworkManager

```bash
# NetworkManager's ipv6.ip6-privacy setting maps to use_tempaddr:
# -1 = use kernel default
# 0 = disabled
# 1 = prefer stable
# 2 = prefer temporary (recommended)

nmcli connection modify "My Connection" ipv6.ip6-privacy 2

# Verify
nmcli connection show "My Connection" | grep ip6-privacy

# After reconnecting/activating the connection, check that NetworkManager
# writes the sysctl correctly on the active interface
sysctl net.ipv6.conf.eth0.use_tempaddr
# Should be 2
```

The `use_tempaddr = 2` sysctl is usually the right setting for Linux client systems that use SLAAC temporary addresses. Set it in `/etc/sysctl.d/` for persistence, configure per-interface overrides for server interfaces that need stable addresses, and tune `temp_prefered_lft` to control how frequently the system rotates to a new temporary address.
