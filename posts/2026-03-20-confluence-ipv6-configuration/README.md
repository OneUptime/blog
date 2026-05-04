# How to Configure Confluence with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confluence, IPv6, Atlassian, Wiki, Tomcat, Linux, Knowledge Base

Description: Configure Atlassian Confluence to accept connections from IPv6 clients by updating Tomcat server.xml connector settings and reverse proxy IPv6 listeners.

---

Confluence, like other Atlassian products, runs on Apache Tomcat. Enabling IPv6 access requires updating the Tomcat connector's `address` attribute to bind to `::` (all IPv6 interfaces) and ensuring any reverse proxy is also configured for IPv6.

## Confluence Tomcat IPv6 Configuration

```xml
<!-- /opt/atlassian/confluence/conf/server.xml -->

<Server port="8000" shutdown="SHUTDOWN">
  <Service name="Tomcat-Standalone">

    <!-- Main connector listening on IPv6 -->
    <Connector port="8090"
               connectionTimeout="20000"
               redirectPort="8443"
               maxThreads="48"
               minSpareThreads="10"
               enableLookups="false"
               acceptCount="10"
               URIEncoding="UTF-8"
               protocol="org.apache.coyote.http11.Http11NioProtocol"
               address="::"
               scheme="http"
               proxyName="confluence.example.com"
               proxyPort="443"
               secure="false"/>

  </Service>
</Server>
```

```bash
# Restart Confluence after changing server.xml

sudo systemctl restart confluence

# Verify IPv6 listening
ss -6 -tlnp | grep 8090

# Check Confluence startup log
sudo tail -f /opt/atlassian/confluence/logs/catalina.out
```

## Nginx Reverse Proxy for Confluence IPv6

```nginx
# /etc/nginx/sites-available/confluence
server {
    listen 80;
    listen [::]:80;
    server_name confluence.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name confluence.example.com;

    ssl_certificate /etc/ssl/certs/confluence.crt;
    ssl_certificate_key /etc/ssl/private/confluence.key;

    # Confluence specific settings
    client_max_body_size 100m;
    proxy_read_timeout 300;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## Confluence JVM IPv6 Settings

```bash
# /opt/atlassian/confluence/bin/setenv.sh

# JVM IPv6 preferences
JAVA_OPTS="$JAVA_OPTS -Djava.net.preferIPv6Addresses=true"

# For IPv6-only environments (disable IPv4 stack)
# JAVA_OPTS="$JAVA_OPTS -Djava.net.preferIPv4Stack=false"

# Memory settings (separate from IPv6)
CATALINA_OPTS="-Xms2048m -Xmx4096m"
```

## Confluence Database over IPv6

```xml
<!-- /opt/atlassian/confluence/confluence/WEB-INF/classes/confluence-init.properties -->
<!-- Points to confluence.cfg.xml -->

<!-- /var/atlassian/application-data/confluence/confluence.cfg.xml -->
<property name="hibernate.connection.url">
  jdbc:postgresql://[2001:db8::postgres]:5432/confluencedb
</property>
```

## Confluence Space Import/Export over IPv6

```bash
# When importing/exporting Confluence spaces over IPv6
# Ensure the URL in confluence.cfg.xml uses the correct FQDN
# <property name="confluence.webapp.context.path">/confluence</property>
# <property name="confluence.webapp.url">https://confluence.example.com</property>
```

## Firewall Configuration

```bash
# Allow Confluence port over IPv6
sudo ip6tables -A INPUT -p tcp --dport 8090 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# If using Nginx, restrict direct Confluence access
sudo ip6tables -A INPUT -p tcp \
  -s ::1 \
  --dport 8090 -j ACCEPT

sudo ip6tables -A INPUT -p tcp \
  -s 2001:db8:internal::/48 \
  --dport 8090 -j ACCEPT

sudo ip6tables-save > /etc/iptables/rules.v6
```

## Verify IPv6 Access

```bash
# Test Confluence is accessible over IPv6
curl -6 -L -o /dev/null -w "%{http_code}\n" \
  https://confluence.example.com/

# Direct access via IPv6
curl -6 http://[2001:db8::confluence]:8090/confluence/ -I

# Check for IPv6 connections in logs
sudo grep "2001:" /opt/atlassian/confluence/logs/catalina.out | tail -10
```

Confluence's Tomcat server IPv6 support via `address="::"` enables knowledge base access from IPv6 clients, with the best practice being to deploy a Nginx reverse proxy that handles SSL termination and IPv6 listening separately from the Confluence application server.
