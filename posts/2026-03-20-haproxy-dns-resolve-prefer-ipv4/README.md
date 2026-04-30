# How to Set Up HAProxy DNS Resolution with resolve-prefer ipv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, DNS, IPv4, Resolve-prefer, Dynamic Resolution, Service Discovery

Description: Configure HAProxy to resolve backend hostnames dynamically and prefer IPv4 addresses when both A and AAAA records exist using the resolve-prefer parameter.

## Introduction

HAProxy supports dynamic DNS resolution for backend servers, allowing it to automatically update server IPs when DNS changes. The `resolve-prefer ipv4` parameter instructs HAProxy to prefer A records over AAAA records when both exist-critical for IPv4-only backend networks.

## Configuring the Resolvers Section

Define DNS resolvers HAProxy should use for name resolution:

```haproxy
# /etc/haproxy/haproxy.cfg

global
    maxconn 50000
    log /dev/log local0

resolvers my_dns
    # Primary DNS server
    nameserver dns1 8.8.8.8:53
    nameserver dns2 8.8.4.4:53

    # How often to re-query DNS for changes
    resolve_retries 3
    timeout resolve 1s
    timeout retry   1s

    # Resolver status hold periods
    hold valid      60s
    hold other      30s    # Keep non-NXDOMAIN error statuses for 30s
    hold refused    30s
    hold nx         30s
    hold timeout    30s
    hold obsolete   30s
```

## Using resolve-prefer ipv4 on Backend Servers

Apply the resolver and IPv4 preference to servers using hostnames:

```haproxy
backend app_servers
    balance roundrobin

    # Resolve hostname and prefer IPv4 (A record) over IPv6 (AAAA record)
    server app1 app1.service.internal:8080 check resolvers my_dns resolve-prefer ipv4
    server app2 app2.service.internal:8080 check resolvers my_dns resolve-prefer ipv4
    server app3 app3.service.internal:8080 check resolvers my_dns resolve-prefer ipv4
```

## Dynamic Backend Discovery with DNS SRV

For service discovery via DNS SRV records:

```haproxy
backend microservice_backend
    balance roundrobin

    # Discover servers via DNS SRV record; SRV answers provide the ports
    server-template svc 1-5 _http._tcp.myservice.consul check resolvers my_dns resolve-prefer ipv4
    # This creates up to 5 server entries from DNS SRV responses
```

## Internal DNS Server Configuration

For private/internal hostnames, point to your internal DNS:

```haproxy
resolvers internal_dns
    # Use internal DNS for private service names
    nameserver internal1 10.0.0.53:53
    nameserver internal2 10.0.0.54:53

    resolve_retries 5
    timeout resolve 2s
    timeout retry   1s
    hold valid      30s

resolvers public_dns
    # Use public DNS for external service names
    nameserver google   8.8.8.8:53
    nameserver cloudflare 1.1.1.1:53
    resolve_retries 3
    timeout resolve 1s
    hold valid 60s

backend internal_service
    server svc1 myservice.internal:8080 resolvers internal_dns resolve-prefer ipv4

backend external_api
    server ext1 api.partner.com:443 resolvers public_dns resolve-prefer ipv4
```

## Monitoring DNS Resolution

Check which IPs have been resolved for servers:

```bash
# View server states and resolved IPs

echo "show servers state" | sudo socat stdio /run/haproxy/admin.sock | column -t

# View DNS resolver statistics
echo "show resolvers" | sudo socat stdio /run/haproxy/admin.sock

# Change a server's FQDN at runtime
echo "set server app_servers/app1 fqdn app1.service.internal" | \
  sudo socat stdio /run/haproxy/admin.sock
```

## Testing DNS Failover

```bash
# Check current resolved IP for a backend server
echo "show servers state app_servers" | sudo socat stdio /run/haproxy/admin.sock

# Simulate DNS change (update your DNS record)
# HAProxy should pick up the new address during a later runtime resolution cycle

# Check HAProxy logs for DNS resolution events
sudo journalctl -u haproxy -f | grep -i dns
```

## Conclusion

HAProxy's dynamic DNS resolution with `resolve-prefer ipv4` makes your load balancer prefer IPv4 addresses for backend servers when both A and AAAA records are available in dual-stack environments. Configure the `resolvers` section with appropriate timeouts and hold values, apply `resolvers` and `resolve-prefer ipv4` to each server definition using hostnames, and monitor resolution via the admin socket for operational visibility.
