# How to Disable IPv6 on macOS via Command Line

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, macOS, Networksetup, Terminal, Disable IPv6

Description: Learn how to disable IPv6 on macOS using the networksetup command from Terminal, including disabling on all interfaces and making changes persistent.

## Disable IPv6 with networksetup

```bash
# Disable IPv6 on Wi-Fi

sudo networksetup -setv6off Wi-Fi

# Disable IPv6 on Ethernet
sudo networksetup -setv6off Ethernet

# Disable on Thunderbolt Bridge
sudo networksetup -setv6off "Thunderbolt Bridge"

# List all network services to find names
networksetup -listallnetworkservices
```

## Disable IPv6 on All Network Services

```bash
#!/bin/bash
# Disable IPv6 on all network services

if [[ $EUID -ne 0 ]]; then
    echo "Run this script with sudo."
    exit 1
fi

echo "Disabling IPv6 on all network services..."

# Get list of all network services
networksetup -listallnetworkservices | tail -n +2 | while IFS= read -r service; do
    # Skip lines starting with * (disabled network services)
    [[ "$service" == \** ]] && continue

    echo "Disabling IPv6 on: $service"
    networksetup -setv6off "$service" 2>/dev/null
done

echo "Done."
```

## Set Link-Local Only (Partial Disable)

```bash
# Keep link-local IPv6 but disable global IPv6 on Wi-Fi
sudo networksetup -setv6linklocal Wi-Fi

# This is useful when:
# - You need link-local for local network discovery
# - But don't want global IPv6 routing
```

## Verify IPv6 is Disabled

```bash
# Map the network service to its device name first
networksetup -listallhardwareports

# Replace enX with the device name for the service you changed
ifconfig enX | grep inet6

# Confirm no global IPv6 routing
ping6 2001:4860:4860::8888
# If no other active service has IPv6 connectivity, this should fail
```

## Re-enable IPv6

```bash
# Re-enable automatic IPv6 on Wi-Fi
sudo networksetup -setv6automatic Wi-Fi

# Re-enable on Ethernet
sudo networksetup -setv6automatic Ethernet

# Replace enX with the device name for the service you changed
ifconfig enX | grep inet6
```

## Using scutil for Advanced IPv6 Control

```bash
# Check IPv6 DNS configuration via scutil
scutil --dns | grep -A 5 "resolver #"

# Check network configuration
scutil --nwi

# These are read-only views; use networksetup for changes
```

## Re-apply at Boot via launchd (Optional, for headless/server macOS)

```bash
# Create a LaunchDaemon to re-apply the IPv6 setting at boot
sudo tee /Library/LaunchDaemons/com.local.disable-ipv6.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.local.disable-ipv6</string>
    <key>RunAtLoad</key>
    <true/>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/sbin/networksetup</string>
        <string>-setv6off</string>
        <string>Wi-Fi</string>
    </array>
</dict>
</plist>
EOF

sudo launchctl load /Library/LaunchDaemons/com.local.disable-ipv6.plist
```

## Summary

Disable IPv6 on macOS via command line with `sudo networksetup -setv6off "Wi-Fi"` and `sudo networksetup -setv6off "Ethernet"`. Use `networksetup -listallnetworkservices` to find exact network service names. For partial disable keeping link-local, use `sudo networksetup -setv6linklocal`. Re-enable with `sudo networksetup -setv6automatic`. If you need the setting re-applied automatically at boot on headless or managed Macs, use a LaunchDaemon.
