# How to Redirect Traffic to a Different Port with iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Redirect, NAT, Linux, Port Forwarding, Networking

Description: Use iptables REDIRECT to transparently redirect traffic from one port to another on the same host, enabling non-privileged applications to bind to low ports.

Port redirection solves a common problem: applications can't bind to privileged ports (< 1024) without root, but need to be accessible on standard ports like 80 or 443. REDIRECT transparently routes traffic from port 80 to port 8080 where the app actually runs.

## Basic Port Redirect with REDIRECT

```bash
# Redirect incoming TCP port 80 to port 8080 on the same host

sudo iptables -t nat -A PREROUTING \
  -p tcp --dport 80 \
  -j REDIRECT --to-ports 8080

# Now connections to port 80 arrive at port 8080
# The app doesn't need to run as root to listen on port 80
```

## Redirect Localhost Traffic Too

PREROUTING only handles packets arriving from the network. For local connections:

```bash
# Redirect port 80 → 8080 for BOTH incoming AND local connections
sudo iptables -t nat -A PREROUTING \
  -p tcp --dport 80 \
  -j REDIRECT --to-ports 8080

sudo iptables -t nat -A OUTPUT \
  -o lo \
  -p tcp --dport 80 \
  -j REDIRECT --to-ports 8080
# The OUTPUT rule handles: curl http://127.0.0.1
```

## Redirect HTTPS (443 → 8443)

```bash
# Redirect HTTPS traffic for a non-root application
sudo iptables -t nat -A PREROUTING \
  -p tcp --dport 443 \
  -j REDIRECT --to-ports 8443

sudo iptables -t nat -A OUTPUT \
  -o lo \
  -p tcp --dport 443 \
  -j REDIRECT --to-ports 8443
```

## Restrict Redirect to Specific Interface or IP

```bash
# Only redirect on the public interface (not on internal interfaces)
sudo iptables -t nat -A PREROUTING \
  -i eth0 \
  -p tcp --dport 80 \
  -j REDIRECT --to-ports 8080

# Only redirect connections to a specific IP
sudo iptables -t nat -A PREROUTING \
  -d 203.0.113.10 \
  -p tcp --dport 80 \
  -j REDIRECT --to-ports 8080
```

## Use DNAT Instead for More Control

For more complex scenarios, DNAT gives you explicit control over destination:

```bash
# DNAT to a specific local IP on the same host
sudo iptables -t nat -A PREROUTING \
  -d 203.0.113.10 \
  -p tcp --dport 80 \
  -j DNAT --to-destination 203.0.113.10:8080

# DNAT to a different host (forward to another server; requires IP forwarding and correct return-path routing)
sudo iptables -t nat -A PREROUTING \
  -p tcp --dport 80 \
  -j DNAT --to-destination 192.168.1.100:80
```

## Verify the Redirect

```bash
# Check the NAT rule is in place
sudo iptables -t nat -L -n -v

# Test the redirect from outside
curl http://your-server-ip:80
# Should reach the app on port 8080

# Test localhost redirect
curl http://127.0.0.1:80
# Should reach the app on port 8080

# Verify app is listening on 8080, not 80
sudo ss -tlnp | grep ':8080\|:80 '
```

## Remove the Redirect

```bash
# Find the rule line number
sudo iptables -t nat -L PREROUTING -n --line-numbers

# Delete by line number
sudo iptables -t nat -D PREROUTING 1

# Or delete by exact specification
sudo iptables -t nat -D PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 8080

# If you added the loopback rule for local traffic, delete that too
sudo iptables -t nat -D OUTPUT -o lo -p tcp --dport 80 -j REDIRECT --to-ports 8080
```

Port redirection with iptables is a lightweight alternative to running applications as root or using capabilities - a single rule enables secure deployment of web servers and other services.
