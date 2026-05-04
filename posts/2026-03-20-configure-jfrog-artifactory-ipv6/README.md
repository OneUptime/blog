# How to Configure JFrog Artifactory with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JFrog Artifactory, IPv6, Container Registry, Maven, Artifact Management, DevOps

Description: Configure JFrog Artifactory to accept connections over IPv6 for storing Docker images, Maven artifacts, and other package types in IPv6-enabled environments.

---

JFrog Artifactory is a universal artifact repository supporting Docker, Maven, npm, PyPI, and many other package types. Configuring it for IPv6 involves updating the Nginx/Tomcat listener configuration and ensuring the Artifactory service binds to IPv6 interfaces.

## Installing Artifactory

```bash
# Docker-based installation (recommended)

docker run -d \
  --name artifactory \
  -p 8081:8081 \
  -p 8082:8082 \
  -v /data/artifactory:/var/opt/jfrog/artifactory \
  releases-docker.jfrog.io/jfrog/artifactory-oss:latest

# Or using Docker Compose
```

## Docker Compose with IPv6 Support

```yaml
# docker-compose.yml
version: '3.8'

services:
  artifactory:
    image: releases-docker.jfrog.io/jfrog/artifactory-oss:7.71.5
    container_name: artifactory
    ports:
      # Bind to both IPv4 and IPv6
      - "8081:8081"
      - "[::]:8081:8081"
      - "8082:8082"
      - "[::]:8082:8082"
    volumes:
      - artifactory-data:/var/opt/jfrog/artifactory
    environment:
      - JF_SHARED_DATABASE_TYPE=derby  # Use external DB in production

networks:
  default:
    enable_ipv6: true
    ipam:
      config:
        - subnet: "2001:db8:a17f::/64"
        - subnet: "172.30.0.0/16"

volumes:
  artifactory-data:
```

## Configuring Artifactory Nginx Proxy for IPv6

When using an external Nginx reverse proxy:

```nginx
# /etc/nginx/sites-available/artifactory
upstream artifactory {
    server 127.0.0.1:8082;
}

server {
    # Listen on both IPv4 and IPv6
    listen 80;
    listen [::]:80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name artifactory.example.com;

    ssl_certificate     /etc/letsencrypt/live/artifactory.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/artifactory.example.com/privkey.pem;

    # Docker registry API
    client_max_body_size 10G;

    # Proxy to Artifactory
    location / {
        proxy_pass http://artifactory/;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
    }
}
```

## Configuring Artifactory System Settings for IPv6

```yaml
# /var/opt/jfrog/artifactory/etc/system.yaml
shared:
  node:
    id: "art1"
    # Bind Artifactory to all interfaces including IPv6
    ip: "::"

  database:
    type: "derby"

router:
  entrypoints:
    # Router service listening addresses
    internalAddress: "127.0.0.1:8046"
    externalAddress: "[::]:8082"
```

## Using Docker with Artifactory over IPv6

```bash
# Login to Artifactory Docker registry
docker login artifactory.example.com \
  -u admin \
  -p password

# Tag and push image
docker tag myapp:latest \
  artifactory.example.com/docker-local/myapp:latest
docker push \
  artifactory.example.com/docker-local/myapp:latest

# Pull image
docker pull artifactory.example.com/docker-local/myapp:latest

# Test IPv6 connectivity to Artifactory
curl -6 https://artifactory.example.com/artifactory/api/system/ping
```

## Configuring Maven to Use Artifactory over IPv6

```xml
<!-- ~/.m2/settings.xml -->
<settings>
  <mirrors>
    <mirror>
      <id>artifactory-maven</id>
      <mirrorOf>*</mirrorOf>
      <!-- Artifactory URL with IPv6 hostname (AAAA record) -->
      <url>https://artifactory.example.com/artifactory/maven-public</url>
      <name>Artifactory Maven Mirror</name>
    </mirror>
  </mirrors>

  <servers>
    <server>
      <id>artifactory-maven</id>
      <username>admin</username>
      <password>password</password>
    </server>
  </servers>
</settings>
```

## Firewall Configuration for Artifactory IPv6

```bash
# Open Artifactory ports for IPv6
sudo ip6tables -A INPUT -p tcp --dport 8081 -j ACCEPT  # Artifactory UI
sudo ip6tables -A INPUT -p tcp --dport 8082 -j ACCEPT  # Artifactory API
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT    # HTTP (redirect)
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT   # HTTPS

sudo ip6tables-save > /etc/iptables/rules.v6
```

JFrog Artifactory's support for IPv6 through its configurable network binding and reverse proxy integration makes it deployable in modern IPv6 infrastructure for all artifact types including Docker, Maven, npm, and PyPI.
