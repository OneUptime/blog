# How to Use NetworkManager Dispatcher Scripts for Custom Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, NetworkManager, Dispatcher Scripts, Automation, Networking

Description: Use NetworkManager dispatcher scripts to run custom commands when network interfaces connect, disconnect, or change state - enabling automatic configuration triggered by network events.

## Introduction

NetworkManager dispatcher scripts run automatically when network events occur (interface up, down, DHCP acquired, etc.). They live in `/etc/NetworkManager/dispatcher.d/` and are executed in alphabetical order. Each script receives the interface name and event as arguments.

## Create a Dispatcher Script

```bash
# Create the dispatcher script

cat > /etc/NetworkManager/dispatcher.d/10-custom.sh << 'EOF'
#!/bin/bash

INTERFACE=$1
EVENT=$2

case "$EVENT" in
    up)
        echo "Interface $INTERFACE came up" >> /var/log/nm-dispatcher.log
        # Add your custom commands here
        ;;
    down)
        echo "Interface $INTERFACE went down" >> /var/log/nm-dispatcher.log
        ;;
    dhcp4-change)
        echo "DHCP lease changed on $INTERFACE" >> /var/log/nm-dispatcher.log
        ;;
esac
EOF

# Make it executable (required by NetworkManager)
chmod +x /etc/NetworkManager/dispatcher.d/10-custom.sh
```

## Script Events Reference

| Event | Description |
|---|---|
| `up` | Interface connected and configured |
| `down` | Interface disconnected |
| `pre-up` | Before interface comes up (script must be in `dispatcher.d/pre-up.d/`) |
| `pre-down` | Before interface goes down (script must be in `dispatcher.d/pre-down.d/`) |
| `dhcp4-change` | IPv4 DHCP lease changed |
| `dhcp6-change` | IPv6 DHCP lease changed |
| `vpn-up` | VPN connected |
| `vpn-down` | VPN disconnected |

## Add a Static Route on Interface Up

```bash
cat > /etc/NetworkManager/dispatcher.d/20-add-routes.sh << 'EOF'
#!/bin/bash
INTERFACE=$1
EVENT=$2

if [ "$INTERFACE" = "eth0" ] && [ "$EVENT" = "up" ]; then
    ip route add 192.168.100.0/24 via 10.0.0.2
fi
EOF

chmod +x /etc/NetworkManager/dispatcher.d/20-add-routes.sh
```

## Run a Script on VPN Connect

```bash
cat > /etc/NetworkManager/dispatcher.d/30-vpn.sh << 'EOF'
#!/bin/bash
INTERFACE=$1
EVENT=$2

if [ "$EVENT" = "vpn-up" ]; then
    # Mount network shares, start services, etc.
    mount -t nfs 10.10.0.5:/shared /mnt/shared
fi
EOF

chmod +x /etc/NetworkManager/dispatcher.d/30-vpn.sh
```

## Test a Dispatcher Script Manually

```bash
# Simulate an 'up' event for eth0
/etc/NetworkManager/dispatcher.d/10-custom.sh eth0 up

# Check log output
cat /var/log/nm-dispatcher.log
```

## Check Dispatcher Script Execution Logs

```bash
# View NetworkManager logs for dispatcher events
journalctl -u NetworkManager | grep -i dispatch
```

## Conclusion

Dispatcher scripts provide a hook mechanism for custom network automation. Place executable scripts in `/etc/NetworkManager/dispatcher.d/`, check the `$1` (interface) and `$2` (event) arguments, and implement the desired logic. Scripts must be owned by root and not group/world-writable to be executed by NetworkManager.
