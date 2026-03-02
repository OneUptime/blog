# How to Configure Apache mod_proxy_balancer for Load Balancing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Load Balancing, Web Server, DevOps

Description: Configure Apache mod_proxy_balancer on Ubuntu to distribute traffic across multiple backend servers with health checks, sticky sessions, and monitoring.

---

Apache HTTP Server can act as a load balancer in front of your application servers using the `mod_proxy_balancer` module. This is a practical option when you already run Apache for SSL termination or static file serving and want to add load balancing without introducing a separate tool like HAProxy or Nginx upstream.

## Prerequisites

You need Apache 2.4 installed and running, plus at least two backend application servers to balance across.

```bash
# Install Apache if not already installed
sudo apt-get update
sudo apt-get install -y apache2

# Enable required modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_balancer
sudo a2enmod lbmethod_byrequests
sudo a2enmod lbmethod_bytraffic
sudo a2enmod lbmethod_bybusyness
sudo a2enmod headers
sudo a2enmod rewrite

# Restart Apache to load modules
sudo systemctl restart apache2

# Verify modules are loaded
apache2ctl -M | grep -E 'proxy|balancer'
```

## Basic Load Balancer Configuration

Create a virtual host configuration for the load balancer:

```bash
sudo nano /etc/apache2/sites-available/loadbalancer.conf
```

```apache
<VirtualHost *:80>
    ServerName lb.example.com

    # Define the backend cluster
    <Proxy "balancer://mycluster">
        # Backend server 1
        BalancerMember http://192.168.1.10:8080 route=node1
        # Backend server 2
        BalancerMember http://192.168.1.11:8080 route=node2
        # Backend server 3 (optional third node)
        BalancerMember http://192.168.1.12:8080 route=node3

        # Load balancing method: byrequests distributes evenly by request count
        ProxySet lbmethod=byrequests

        # Set a timeout for backend connections
        ProxySet timeout=60

        # Maximum number of requests before recycling the connection
        ProxySet maxattempts=3
    </Proxy>

    # Forward all requests to the balancer
    ProxyPass "/" "balancer://mycluster/"
    ProxyPassReverse "/" "balancer://mycluster/"

    # Preserve the original Host header
    ProxyPreserveHost On

    # Log format including which backend handled the request
    LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\" \"%{BALANCER_WORKER_ROUTE}e\"" combined_balancer
    CustomLog /var/log/apache2/lb-access.log combined_balancer
    ErrorLog /var/log/apache2/lb-error.log
    LogLevel warn
</VirtualHost>
```

```bash
# Enable the site and test the configuration
sudo a2ensite loadbalancer.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## Load Balancing Methods

Apache supports four built-in load balancing algorithms:

### byrequests (Round Robin)

Distributes requests evenly. Each worker gets an equal share. This is the default and works well when all backends have similar capacity.

```apache
ProxySet lbmethod=byrequests
```

You can weight requests to favor more powerful backends:

```apache
<Proxy "balancer://mycluster">
    # node1 gets 3x the traffic of node2
    BalancerMember http://192.168.1.10:8080 loadfactor=3
    BalancerMember http://192.168.1.11:8080 loadfactor=1
    ProxySet lbmethod=byrequests
</Proxy>
```

### bytraffic (Bandwidth-Based)

Routes based on total bytes transferred. Useful when requests vary significantly in response size.

```apache
ProxySet lbmethod=bytraffic
```

### bybusyness (Pending Request Count)

Routes to the backend with the fewest active requests. Good for backends with variable processing times.

```apache
# Requires mod_lbmethod_bybusyness
ProxySet lbmethod=bybusyness
```

### heartbeat

Routes based on heartbeat information from backends. Requires `mod_heartbeat` and `mod_heartmonitor` on the backend servers.

## Sticky Sessions

For applications that store session state on the application server (rather than a shared store like Redis), requests from the same client must consistently go to the same backend. This is called sticky sessions or session affinity.

```apache
<VirtualHost *:80>
    ServerName lb.example.com

    <Proxy "balancer://mycluster">
        BalancerMember http://192.168.1.10:8080 route=node1
        BalancerMember http://192.168.1.11:8080 route=node2

        # Use the JSESSIONID cookie to maintain affinity
        # The stickysession directive checks a cookie and a URL parameter
        ProxySet stickysession=JSESSIONID|jsessionid

        # If the sticky backend is unavailable, fall through to another
        ProxySet nofailover=Off

        ProxySet lbmethod=byrequests
    </Proxy>

    ProxyPass "/" "balancer://mycluster/"
    ProxyPassReverse "/" "balancer://mycluster/"
    ProxyPreserveHost On
</VirtualHost>
```

The `route` parameter on each `BalancerMember` is used with the cookie value. When your application sets a session cookie, append the route like `JSESSIONID=abc123.node1`. Apache reads the suffix and routes subsequent requests from that session to node1.

## Health Checks

Without health checks, Apache continues sending traffic to a backend that has crashed. Enable the health check module:

```bash
sudo a2enmod proxy_hcheck
sudo systemctl restart apache2
```

Configure health checks in the virtual host:

```apache
<Proxy "balancer://mycluster">
    BalancerMember http://192.168.1.10:8080 route=node1 \
        hcmethod=GET hcuri=/health hcinterval=10 hcpasses=2 hcfails=3
    BalancerMember http://192.168.1.11:8080 route=node2 \
        hcmethod=GET hcuri=/health hcinterval=10 hcpasses=2 hcfails=3

    ProxySet lbmethod=byrequests
</Proxy>
```

Parameters:
- `hcmethod=GET` - HTTP method for health check requests
- `hcuri=/health` - path to check on each backend
- `hcinterval=10` - seconds between health checks
- `hcpasses=2` - how many consecutive passes before marking healthy
- `hcfails=3` - how many consecutive failures before marking unhealthy

## Balancer Manager Interface

Apache includes a web interface for monitoring and managing the load balancer in real time:

```apache
# Add this inside your VirtualHost or a separate management VirtualHost
<Location "/balancer-manager">
    SetHandler balancer-manager

    # Restrict access to management IPs only
    Require ip 127.0.0.1
    Require ip 192.168.1.0/24
</Location>
```

After adding this and reloading Apache, visit `http://lb.example.com/balancer-manager` to:
- See current status of each backend
- Temporarily disable a backend for maintenance
- Adjust load factors without restarting Apache
- View request counts and error rates per backend

## Hot Standby Configuration

Configure a backend as a hot standby that only receives traffic when all primary backends are down:

```apache
<Proxy "balancer://mycluster">
    BalancerMember http://192.168.1.10:8080 route=node1
    BalancerMember http://192.168.1.11:8080 route=node2

    # Standby server - only used when all others are unavailable
    BalancerMember http://192.168.1.20:8080 route=standby status=+H

    ProxySet lbmethod=byrequests
</Proxy>
```

The `status=+H` flag marks the worker as a hot standby.

## SSL Termination with Load Balancing

Terminate SSL at the load balancer and forward plain HTTP to backends:

```apache
# Install certbot for SSL if needed
# sudo certbot --apache -d lb.example.com

<VirtualHost *:443>
    ServerName lb.example.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/lb.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/lb.example.com/privkey.pem

    <Proxy "balancer://mycluster">
        BalancerMember http://192.168.1.10:8080 route=node1
        BalancerMember http://192.168.1.11:8080 route=node2
        ProxySet lbmethod=byrequests
    </Proxy>

    ProxyPass "/" "balancer://mycluster/"
    ProxyPassReverse "/" "balancer://mycluster/"

    # Pass SSL metadata to backends
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"

    ProxyPreserveHost On
</VirtualHost>
```

## Test the Load Balancer

```bash
# Send requests and observe which backend responds
for i in {1..10}; do
    curl -s http://lb.example.com/ -I | grep -E 'Server|X-Backend'
done

# Watch the Apache access log to verify distribution
sudo tail -f /var/log/apache2/lb-access.log | grep BALANCER_WORKER
```

Apache mod_proxy_balancer is a solid choice for medium-traffic sites that need load balancing without adding a dedicated appliance. For very high traffic or advanced routing, a dedicated load balancer like HAProxy will offer better performance and more features, but for many environments Apache handles the job without any additional infrastructure.
