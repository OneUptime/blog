# How to Add a Static Route on Debian Using /etc/network/interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Debian, Static Routes, /etc/network/interfaces, Ifupdown, Networking, Routing

Description: Configure persistent static routes on Debian using the up/down commands or post-up directives in /etc/network/interfaces for the ifupdown network stack.

## Introduction

Debian with the traditional ifupdown network stack uses `/etc/network/interfaces` for network configuration. Static routes can be added using `post-up` and `pre-down` directives that run `ip route` commands when the interface comes up or goes down.

## Method 1: Using post-up in /etc/network/interfaces

```bash
# /etc/network/interfaces

auto eth0
iface eth0 inet static
    address 10.0.0.100
    netmask 255.255.255.0
    gateway 10.0.0.1
    # Static route added when interface comes up
    post-up ip route add 192.168.2.0/24 via 10.0.0.1
    post-up ip route add 172.16.0.0/16 via 10.0.0.1
    # Remove routes when interface goes down
    pre-down ip route del 192.168.2.0/24 via 10.0.0.1
    pre-down ip route del 172.16.0.0/16 via 10.0.0.1
```

## Method 2: Using up/down Directives

```bash
auto eth0
iface eth0 inet static
    address 10.0.0.100
    netmask 255.255.255.0
    gateway 10.0.0.1
    up ip route add 192.168.2.0/24 via 10.0.0.1
    down ip route del 192.168.2.0/24 via 10.0.0.1
```

## Apply the Configuration

```bash
# Bring down and up the interface to apply
ifdown eth0 && ifup eth0

# Or restart networking
systemctl restart networking
```

## Method 3: Using ifupdown-extra Package

The `ifupdown-extra` package installs helper scripts that read static routes from `/etc/network/routes`:

```bash
apt install ifupdown-extra

# /etc/network/routes
# Network         Netmask         Gateway     Interface
192.168.2.0       255.255.255.0   10.0.0.1    eth0
172.16.0.0        255.255.0.0     10.0.0.1    eth0
```

## Method 4: Using /etc/network/if-up.d/ Scripts

For more complex routing logic, create a script in `/etc/network/if-up.d/`:

```bash
cat > /etc/network/if-up.d/static-routes << 'EOF'
#!/bin/bash
# Only apply when eth0 comes up
if [ "$IFACE" = "eth0" ]; then
    ip route add 192.168.2.0/24 via 10.0.0.1 2>/dev/null
    ip route add 172.16.0.0/16 via 10.0.0.1 2>/dev/null
fi
EOF
chmod +x /etc/network/if-up.d/static-routes
```

## Verify Routes

```bash
# Check routes are applied
ip route show

# Test routing decision
ip route get 192.168.2.100
```

## Conclusion

Debian's ifupdown uses `post-up` or `up` directives in `/etc/network/interfaces` to add static routes when interfaces come up. When you add routes directly in an interface stanza, pair `post-up` routes with `pre-down` removal to clean up routes when the interface goes down. For complex routing, use `/etc/network/if-up.d/` scripts. Routes are applied automatically on boot when the interface initializes.
