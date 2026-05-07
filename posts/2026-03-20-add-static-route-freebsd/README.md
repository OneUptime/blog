# How to Add a Static Route on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FreeBSD, Static Routes, Route, Networking, Routing, Rc.conf

Description: Add temporary and persistent static routes on FreeBSD using the route command and /etc/rc.conf for boot-time route configuration.

## Introduction

FreeBSD uses the BSD `route` command for managing routes. Temporary routes are added with `route add`, while persistent routes are configured in `/etc/rc.conf` using the `static_routes` and `route_<name>` directives.

## Add a Temporary Static Route

```bash
# Add a network route

route add -net 192.168.2.0/24 10.0.0.1

# Add a host route
route add -host 203.0.113.5 10.0.0.1

# Add default gateway
route add default 10.0.0.1
```

## View the Routing Table

```bash
# Show all routes
netstat -rn

# Show only IPv4 routes
netstat -rn -f inet

# Show routes with wider interface name column
netstat -rnW -f inet
```

## Delete a Route

```bash
route delete -net 192.168.2.0/24 10.0.0.1
route delete default
```

## Persistent Static Routes via /etc/rc.conf

FreeBSD uses named routes in `/etc/rc.conf` for persistence:

```bash
# /etc/rc.conf

# Define route names
static_routes="route1 route2 mgmt"

# Define each named route
route_route1="-net 192.168.2.0/24 10.0.0.1"
route_route2="-net 172.16.0.0/16 10.0.0.1"
route_mgmt="-net 10.100.0.0/24 10.0.0.254"

# Also set the default gateway
defaultrouter="10.0.0.1"
```

Apply at runtime:

```bash
# Apply rc.conf routing changes without reboot
service routing start

# Or restart routing
service routing restart
```

## Verify Persistent Routes Are Applied

```bash
# After applying, check routing table
netstat -rn -f inet

# Check specific route
route show 192.168.2.100
```

## Add Route via /etc/rc.local (Alternative)

```bash
# /etc/rc.local (if using)
route add -net 192.168.2.0/24 10.0.0.1
route add -net 172.16.0.0/16 10.0.0.1
```

## Check a Route with route show

```bash
# Show route for a specific destination
route show 192.168.2.100

# Test connectivity
ping 192.168.2.1
traceroute 192.168.2.1
```

## Conclusion

FreeBSD static routes use the `route add -net` command for temporary routes and `/etc/rc.conf` with `static_routes` and `route_<name>` variables for persistence. The `defaultrouter` directive in `rc.conf` sets the default gateway. Routes persist across reboots when configured in `rc.conf` and are loaded by the `routing` rc script at boot.
