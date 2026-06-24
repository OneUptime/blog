# How to Set Up Apache Load Balancing with mod_proxy_balancer on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, Mod_proxy_balancer, Load Balancing, IPv4, High Availability, HTTP

Description: Configure Apache mod_proxy_balancer to distribute HTTP traffic across multiple IPv4 backend servers with round-robin, traffic-weighted, and session-sticky algorithms.

## Introduction

Apache's `mod_proxy_balancer` adds load balancing capabilities on top of `mod_proxy`. It supports multiple scheduling algorithms and session persistence through sticky sessions. Dynamic health checks are provided separately by `mod_proxy_hcheck`.

## Enabling Required Modules

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_balancer
sudo a2enmod lbmethod_byrequests   # Request-count scheduling
sudo a2enmod lbmethod_bytraffic    # Traffic-based
sudo a2enmod lbmethod_bybusyness   # Pending-request based
sudo a2enmod headers
sudo a2enmod status                # Required for balancer-manager
sudo a2enmod slotmem_shm           # Shared memory provider for balancer state

sudo systemctl reload apache2
```

## Basic Request-Count Load Balancer

```apache
# /etc/apache2/sites-available/load-balancer.conf

<VirtualHost *:80>
    ServerName app.example.com
    ProxyRequests Off

    # Define the backend cluster
    <Proxy "balancer://app_cluster">
        # Add IPv4 backend members
        BalancerMember http://192.168.1.10:8080
        BalancerMember http://192.168.1.11:8080
        BalancerMember http://192.168.1.12:8080

        # Balancing algorithm: distribute by request count
        ProxySet lbmethod=byrequests
    </Proxy>

    # Forward all traffic to the cluster
    ProxyPass        / balancer://app_cluster/
    ProxyPassReverse / balancer://app_cluster/
</VirtualHost>
```

## Weighted Load Balancing

Assign more traffic to higher-capacity backends with `loadfactor`:

```apache
<Proxy "balancer://weighted_cluster">
    # High-capacity server: receives ~50% of requests
    BalancerMember http://192.168.1.10:8080 loadfactor=5

    # Medium server: ~30%
    BalancerMember http://192.168.1.11:8080 loadfactor=3

    # Low-capacity server: ~20%
    BalancerMember http://192.168.1.12:8080 loadfactor=2

    ProxySet lbmethod=byrequests
</Proxy>
```

## Sticky Sessions for Session Persistence

Route clients back to the same backend using cookies:

```apache
<VirtualHost *:80>
    ServerName app.example.com
    ProxyRequests Off

    # Enable mod_headers for sticky session cookie
    Header add Set-Cookie "ROUTEID=.%{BALANCER_WORKER_ROUTE}e; path=/" env=BALANCER_ROUTE_CHANGED

    <Proxy "balancer://sticky_cluster">
        BalancerMember http://192.168.1.10:8080 route=server1
        BalancerMember http://192.168.1.11:8080 route=server2
        BalancerMember http://192.168.1.12:8080 route=server3

        # Use ROUTEID cookie for stickiness
        ProxySet stickysession=ROUTEID
    </Proxy>

    ProxyPass        / balancer://sticky_cluster/
    ProxyPassReverse / balancer://sticky_cluster/
</VirtualHost>
```

## Balancer Manager Web Interface

Monitor and manage backends in real-time:

```apache
<VirtualHost *:80>
    ServerName app.example.com

    # Enable the balancer manager UI
    <Location "/balancer-manager">
        SetHandler balancer-manager

        # Restrict access to admin IPs only
        Require ip 192.168.1.0/24
        Require ip 10.0.0.5
    </Location>

    <Proxy "balancer://app_cluster">
        BalancerMember http://192.168.1.10:8080
        BalancerMember http://192.168.1.11:8080
    </Proxy>

    ProxyPass /balancer-manager !   # Don't proxy the manager URL
    ProxyPass / balancer://app_cluster/
    ProxyPassReverse / balancer://app_cluster/
</VirtualHost>
```

## Hot Standby (Backup) Members

Add a backup server used only when all primary members fail:

```apache
<Proxy "balancer://ha_cluster">
    BalancerMember http://192.168.1.10:8080
    BalancerMember http://192.168.1.11:8080

    # Backup: only activated when primary members are all down
    BalancerMember http://192.168.1.12:8080 status=+H
</Proxy>
```

## Testing Load Balancing

```bash
# Send 20 requests and check distribution

for i in $(seq 1 20); do
    curl -s http://app.example.com/server-id
done | sort | uniq -c

# Check balancer status via manager
curl http://app.example.com/balancer-manager
```

## Conclusion

Apache `mod_proxy_balancer` provides flexible load balancing with multiple algorithms, weights, and session persistence. Use `byrequests` for request-count-based distribution across similar backends, `loadfactor` for capacity-weighted distribution, and `stickysession` for stateful applications. The balancer-manager interface enables runtime monitoring and member management without reloading Apache.
