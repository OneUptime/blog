# How to Use HAProxy resolvers Section for Dynamic IPv4 Server Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, DNS, Resolver, IPv4, Service Discovery, Dynamic Configuration

Description: Configure the HAProxy resolvers section to enable dynamic DNS-based server discovery, automatically updating IPv4 backend addresses when DNS records change.

## Introduction

The `resolvers` section in HAProxy enables runtime DNS resolution for backend servers. As services scale or fail over, HAProxy picks up new IPv4 addresses from DNS without requiring a configuration reload-ideal for containerized and cloud-native environments.

## Basic Resolvers Configuration

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 50000
    stats socket /run/haproxy/admin.sock mode 660 level admin

resolvers local_dns
    # DNS server addresses
    nameserver dns1 127.0.0.53:53     # systemd-resolved (Ubuntu)
    nameserver dns2 10.0.0.53:53      # Internal DNS server

    # Resolution settings
    resolve_retries 3                  # Retries before considering DNS down
    timeout resolve 1s                 # Timeout per DNS query
    timeout retry   1s                 # Timeout between retries

    # How long to hold different DNS response states
    hold valid    10s    # Valid-response cache for do-resolve actions
    hold other    30s    # Other DNS errors
    hold refused  30s
    hold nx       30s
    hold timeout  10s
    hold obsolete 30s    # Obsolete SRV records

    # Allow larger DNS responses with more returned addresses
    accepted_payload_size 8192
```

## Backend Using Dynamic DNS Resolution

```haproxy
backend microservices
    balance roundrobin

    # The 'init-addr' parameter controls initial address resolution:
    # - last: use the last known address from a server state file
    # - libc: use the OS resolver at startup
    # - none: start without an address and resolve it later at runtime
    server svc1 user-service.default.svc.cluster.local:8080 \
        check resolvers local_dns resolve-prefer ipv4 init-addr last,none

    server svc2 order-service.default.svc.cluster.local:8080 \
        check resolvers local_dns resolve-prefer ipv4 init-addr last,none
```

## Server Templates for Scale-Out Discovery

Use `server-template` to automatically create multiple servers from DNS results:

```haproxy
backend scalable_backend
    balance roundrobin

    # Create up to 10 server entries from DNS A records
    # HAProxy populates svc1 through svc10 from DNS responses
    server-template svc 1-10 myapp.service.consul:8080 \
        check resolvers local_dns resolve-prefer ipv4 init-addr none
```

## Consul Service Discovery Integration

For Consul-based service discovery with DNS:

```haproxy
resolvers consul_dns
    nameserver consul1 127.0.0.1:8600   # Consul DNS port
    hold valid    5s
    hold other    5s
    timeout resolve 2s

backend consul_services
    server-template web 1-5 web.service.consul:80 \
        check resolvers consul_dns resolve-prefer ipv4 init-addr none
```

## Monitoring DNS Resolution Activity

```bash
# View resolver statistics

echo "show resolvers" | sudo socat stdio unix-connect:/run/haproxy/admin.sock

# View server states and their current resolved IPs
echo "show servers state" | sudo socat stdio unix-connect:/run/haproxy/admin.sock

# Set a server's FQDN dynamically at runtime
echo "set server microservices/svc1 fqdn user-service.default.svc.cluster.local" | \
  sudo socat stdio unix-connect:/run/haproxy/admin.sock
```

## HAProxy Logs for DNS Events

```bash
# If your syslog setup writes HAProxy logs to /var/log/haproxy.log,
# monitor DNS resolution events with:
sudo tail -f /var/log/haproxy.log | grep -iE "resolv|dns|fqdn"

# You may see log entries similar to:
# Server microservices/svc1 changed its IP from 10.0.0.10 to 10.0.0.15
# health check for server microservices/svc1 succeeded
```

## Conclusion

The HAProxy `resolvers` section transforms static IP backends into dynamically discovered services. Configure sensible resolver timeouts and `hold` periods to balance fast updates with stable backend state changes. Use `server-template` for auto-scaling backends and `init-addr none` for container environments where services may not exist at HAProxy startup. This approach removes the need for config reloads when backend IPs change.
