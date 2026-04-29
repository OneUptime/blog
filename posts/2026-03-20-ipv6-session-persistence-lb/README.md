# How to Configure IPv6 Session Persistence in Load Balancers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Session Persistence, Load Balancing, Sticky Sessions, HAProxy, Nginx

Description: A guide to configuring session persistence (sticky sessions) for IPv6 clients in HAProxy, nginx, and IPVS to ensure requests from the same client go to the same backend server.

Session persistence ensures that multiple requests from the same IPv6 client are consistently routed to the same backend server. This is important for stateful applications that store session data on specific servers.

## IPv6 Session Persistence Challenges

IPv6 presents unique challenges for source IP-based persistence:
- Privacy extensions rotate temporary addresses over time
- Users may have multiple IPv6 addresses (stable + temporary)
- A single user may appear with different IPv6 addresses mid-session

This makes cookie-based persistence more reliable than source-IP persistence for IPv6.

## Method 1: Cookie-Based Persistence (Recommended for IPv6)

Cookie-based persistence is unaffected by IPv6 address rotation:

### HAProxy Cookie Persistence

```text
# /etc/haproxy/haproxy.cfg

frontend ipv6_frontend
    bind [::]:443 ssl crt /etc/ssl/certs/combined.pem
    default_backend ipv6_web

backend ipv6_web
    balance roundrobin

    # Insert a cookie that identifies which server the client was assigned
    cookie SERVER insert indirect nocache httponly secure

    server web1 [2001:db8::11]:8080 check cookie web1
    server web2 [2001:db8::12]:8080 check cookie web2
    server web3 [2001:db8::13]:8080 check cookie web3
```

### nginx Sticky Sessions (nginx 1.29.6+ or NGINX Plus)

```nginx
upstream ipv6_backends {
    # Issue a cookie to bind a client to the same upstream server
    sticky cookie srv_id expires=1h domain=.example.com path=/ httponly secure;

    server [2001:db8::11]:8080;
    server [2001:db8::12]:8080;
}
```

## Method 2: Source IP Persistence

Source IP persistence maps a client IP to a backend. Less reliable for IPv6 due to address rotation:

### HAProxy Source IP

```text
backend ipv6_web
    balance source
    hash-type consistent    # Consistent hashing

    server web1 [2001:db8::11]:8080 check
    server web2 [2001:db8::12]:8080 check
```

### IPVS Source IP Persistence

```bash
# Enable persistence with 5-minute timeout

sudo ipvsadm -A -t [2001:db8::100]:443 -s sh -p 300

# -s sh = Source Hash scheduler
# -p 300 = 300 second persistence timeout

# All connections from same IPv6 source go to same server for 300s
sudo ipvsadm -a -t [2001:db8::100]:443 -r [2001:db8::11]:443 -m
sudo ipvsadm -a -t [2001:db8::100]:443 -r [2001:db8::12]:443 -m
```

### nginx ip_hash

```nginx
upstream ipv6_backends {
    ip_hash;    # Uses first 3 octets of IPv4, or full IPv6 address

    server [2001:db8::11]:8080;
    server [2001:db8::12]:8080;
}
```

## Method 3: TLS Session ID Persistence

For HTTPS traffic, TLS session ID can be used for persistence:

```text
# HAProxy: TLS session-based persistence
backend ipv6_ssl
    balance roundrobin
    stick-table type binary len 32 size 1m expire 1h
    stick on ssl_fc_session_id

    server web1 [2001:db8::11]:443 ssl check ca-file /etc/ssl/ca.pem
    server web2 [2001:db8::12]:443 ssl check ca-file /etc/ssl/ca.pem
```

## Handling IPv6 Address Rotation in Persistence

IPv6 clients with privacy extensions can change their temporary address over time. If you still need source-IP affinity, you can mask to a /64 prefix, understanding that this groups every client on the same subnet together:

```text
# HAProxy: Use /64 prefix for persistence (subnet-level)
# This groups all addresses from the same /64 subnet together
backend ipv6_prefix_persist
    balance roundrobin

    # Persist based on /64 prefix (first 64 bits)
    stick-table type ipv6 size 1m expire 30m
    stick on src,ipmask(24,64)    # Uses a /64 mask for IPv6

    server web1 [2001:db8::11]:8080 check
    server web2 [2001:db8::12]:8080 check
```

## Testing Session Persistence

```bash
# Test that multiple requests go to same backend
for i in {1..5}; do
  curl -6 -s -c cookies.txt -b cookies.txt https://example.com/session-info
done

# With HAProxy stats: compare server session counters before and after the test
curl -s http://localhost:8404/stats?csv | awk -F',' 'NR > 1 && $2 != "BACKEND" {print $1, $2, $8}'

# For IPVS: check connection table shows same backend
sudo ipvsadm -Lnc | grep "2001:db8::1000"
```

## Best Practice for IPv6 Session Persistence

1. **Prefer cookie-based persistence** - immune to IPv6 address rotation
2. **For source IP persistence**, a /64 prefix can reduce breakage from temporary-address rotation, but it groups all hosts on the same subnet
3. **Set appropriate timeouts** - temporary-address lifetimes vary by OS and configuration
4. **Consider stateless applications** - design services to not require session affinity

Cookie-based session persistence is the most reliable approach for IPv6 because it is unaffected by temporary-address rotation and avoids the subnet-grouping tradeoffs of source-IP affinity.
