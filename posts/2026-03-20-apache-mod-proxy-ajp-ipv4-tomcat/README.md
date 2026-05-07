# How to Set Up Apache mod_proxy_ajp for IPv4 Tomcat Backend Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, Tomcat, AJP, Mod_proxy_ajp, IPv4, Java, Web Server

Description: Learn how to configure Apache's mod_proxy_ajp module to forward requests to a Tomcat backend over the AJP protocol on an IPv4 network.

---

AJP (Apache JServ Protocol) is a binary protocol used for communication between Apache and Java application servers like Tomcat. It uses persistent TCP connections and a compact packet format for proxying between Apache and Tomcat.

## Enabling Required Modules

```bash
# Enable proxy and AJP proxy modules

a2enmod proxy proxy_ajp

# For the load balancing example, also enable the balancer modules
a2enmod proxy_balancer lbmethod_byrequests

# Verify they are loaded
apachectl -M | grep -E 'proxy|lbmethod'
```

## Configuring Tomcat to Listen on AJP

First, ensure Tomcat's AJP connector is enabled and listening on the IPv4 loopback or the specific internal IPv4 address that Apache will connect to.

```xml
<!-- /opt/tomcat/conf/server.xml - Uncomment and configure the AJP connector -->
<Connector protocol="AJP/1.3"
           address="127.0.0.1"
           port="8009"
           redirectPort="8443"
           secret="YOUR_AJP_SECRET" />
```

> In Tomcat 9.0.31+, the AJP connector requires a secret by default. Apache httpd 2.4.42+ can pass that secret with the `secret=` parameter on `ProxyPass` or `BalancerMember`.

## Basic Apache Proxy Configuration

```apacheconf
# /etc/apache2/sites-available/myapp.conf
<VirtualHost 192.168.1.10:80>
    ServerName myapp.example.com

    # Disable forward proxying (only allow reverse proxy to defined backend)
    ProxyRequests Off

    # Preserve the original Host header
    ProxyPreserveHost On

    # Forward all requests to the Tomcat AJP connector
    # ajp://127.0.0.1:8009 is the Tomcat backend on the same server
    ProxyPass        / ajp://127.0.0.1:8009/ secret=YOUR_AJP_SECRET
    ProxyPassReverse / ajp://127.0.0.1:8009/

    ErrorLog  ${APACHE_LOG_DIR}/myapp-error.log
    CustomLog ${APACHE_LOG_DIR}/myapp-access.log combined
</VirtualHost>
```

## Proxying to a Remote Tomcat Server

If Tomcat runs on a different host, replace `127.0.0.1` with its IPv4 address.

```apacheconf
<VirtualHost 192.168.1.10:80>
    ServerName myapp.example.com

    # Forward to a remote Tomcat on the internal network
    ProxyPass        / ajp://10.0.0.50:8009/ secret=YOUR_AJP_SECRET
    ProxyPassReverse / ajp://10.0.0.50:8009/
</VirtualHost>
```

## Load Balancing Across Multiple Tomcat Instances

```apacheconf
<Proxy "balancer://tomcat_cluster">
    BalancerMember ajp://10.0.0.51:8009 loadfactor=1 secret=YOUR_AJP_SECRET
    BalancerMember ajp://10.0.0.52:8009 loadfactor=1 secret=YOUR_AJP_SECRET
    BalancerMember ajp://10.0.0.53:8009 loadfactor=1 secret=YOUR_AJP_SECRET status=+H  # Hot standby
    ProxySet lbmethod=byrequests
</Proxy>

<VirtualHost 192.168.1.10:80>
    ServerName myapp.example.com
    ProxyPass        / balancer://tomcat_cluster/
    ProxyPassReverse / balancer://tomcat_cluster/
</VirtualHost>
```

## Securing the AJP Port

The AJP port (8009) should never be exposed publicly. Use firewall rules to restrict it.

```bash
# Allow AJP only from the Apache server's IP (e.g., 192.168.1.10)
iptables -A INPUT -p tcp --dport 8009 -s 192.168.1.10 -j ACCEPT
iptables -A INPUT -p tcp --dport 8009 -j DROP
```

## Key Takeaways

- Enable both `proxy` and `proxy_ajp` modules for AJP support in Apache. For load balancing, also enable `proxy_balancer` and `lbmethod_byrequests`.
- Configure Tomcat's AJP connector to bind to a specific IPv4 address, not `0.0.0.0`, and protect it with a shared AJP secret.
- Never expose Tomcat's AJP port to the public internet; restrict it with firewall rules.
- Use `ProxyRequests Off` to prevent Apache from acting as a forward proxy.
