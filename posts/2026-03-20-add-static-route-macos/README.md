# How to Add a Static Route on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: macOS, Static Routes, Route, Networking, Routing, Network Configuration

Description: Add temporary and persistent static routes on macOS using the route command and System Preferences, or via networksetup for scripted configuration.

## Introduction

macOS supports temporary static routes through the `route` command (BSD-style). Routes added with `route add` are temporary and lost on reboot. For persistent routes, use a launch daemon or `networksetup` to configure per-service additional routes.

## Add a Temporary Static Route

```bash
# Add a route using BSD route command

# Syntax: route add -net <destination>/<prefix> <gateway>
sudo route add -net 192.168.2.0/24 10.0.0.1

# Add a host route (/32)
sudo route add -host 203.0.113.5 10.0.0.1
```

## View the Routing Table

```bash
# Show all routes
netstat -rn

# Show only IPv4 routes
netstat -rn -f inet
```

## Delete a Route

```bash
sudo route delete -net 192.168.2.0/24 10.0.0.1
```

## Add a Persistent Static Route (Launch Daemon)

Create a launch daemon that adds the route at boot:

```bash
# Create a shell script to add the route
cat > /usr/local/bin/add-static-routes.sh << 'EOF'
#!/bin/bash
/sbin/route add -net 192.168.2.0/24 10.0.0.1
/sbin/route add -net 172.16.0.0/16 10.0.0.1
EOF
chmod +x /usr/local/bin/add-static-routes.sh

# Create a LaunchDaemon plist
cat > /Library/LaunchDaemons/com.local.staticRoutes.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.local.staticRoutes</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/add-static-routes.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

# Load the launch daemon
sudo launchctl load /Library/LaunchDaemons/com.local.staticRoutes.plist
```

## Using networksetup for Per-Service Routes

```bash
# Set the additional route list on a specific service
sudo networksetup -setadditionalroutes "Wi-Fi" 192.168.2.0 255.255.255.0 10.0.0.1

# Show routes for a service
networksetup -getadditionalroutes "Wi-Fi"

# Clear all additional routes for the service
sudo networksetup -setadditionalroutes "Wi-Fi"
```

## Verify

```bash
# Check the route was added
netstat -rn -f inet | grep 192.168.2

# Test connectivity
ping 192.168.2.1

# Trace route to verify path
traceroute 192.168.2.1
```

## Conclusion

macOS uses BSD-style `route add` for temporary routes. For persistence, use a launch daemon that runs at boot, or `networksetup -setadditionalroutes` to configure per-service additional routes. The `netstat -rn -f inet` command shows the IPv4 routing table. macOS can also store additional routes per network service (Wi-Fi, Ethernet) through the System Configuration framework.
