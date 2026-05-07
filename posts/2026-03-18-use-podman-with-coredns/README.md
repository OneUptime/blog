# How to Use Podman with CoreDNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, CoreDNS, DNS, Service Discovery, Networking

Description: Learn how to deploy and configure CoreDNS in Podman containers to provide DNS-based service discovery, custom DNS resolution, and flexible DNS serving for containerized environments.

---

> CoreDNS running in Podman containers gives you a flexible, plugin-based DNS server that can provide service discovery, custom zone management, and intelligent DNS routing for your container infrastructure.

CoreDNS is a fast, flexible DNS server written in Go. It serves as the default DNS server in Kubernetes, but it is equally useful as a standalone DNS service. Running CoreDNS in a Podman container lets you set up custom DNS resolution for development environments, implement service discovery for containerized applications, and manage internal DNS zones without modifying your host's DNS configuration.

---

## Deploying CoreDNS

Start with a basic CoreDNS deployment:

```bash
mkdir -p ~/coredns/config/zones
```

Create the Corefile (CoreDNS configuration):

```text
# ~/coredns/config/Corefile

.:53 {
    forward . 8.8.8.8 8.8.4.4
    log
    errors
    cache 30
    health :8080
    ready :8181
}
```

Run CoreDNS:

```bash
podman run -d \
  --name coredns \
  --restart always \
  -p 53:53/udp \
  -p 53:53/tcp \
  -p 8080:8080 \
  -p 8181:8181 \
  -p 9153:9153 \
  -v ~/coredns/config:/etc/coredns:ro,Z \
  coredns/coredns:latest \
  -conf /etc/coredns/Corefile
```

Test DNS resolution:

```bash
dig @localhost example.com
nslookup example.com localhost
```

## Custom DNS Zones

Define custom DNS zones for your internal services:

```text
# ~/coredns/config/Corefile

# Internal zone for your services
internal.example.com:53 {
    file /etc/coredns/zones/internal.example.com.db
    log
    errors
}

# Development zone
dev.example.test:53 {
    file /etc/coredns/zones/dev.example.test.db
    log
    errors
}

# Forward everything else to upstream DNS
.:53 {
    forward . 8.8.8.8 8.8.4.4
    log
    errors
    cache 120
    health :8080
}
```

Create the zone files:

```dns
; ~/coredns/config/zones/internal.example.com.db
$ORIGIN internal.example.com.
@       IN SOA  ns1.internal.example.com. admin.internal.example.com. (
            2024010101  ; Serial
            3600        ; Refresh
            600         ; Retry
            86400       ; Expire
            300         ; Minimum TTL
        )

@       IN NS   ns1.internal.example.com.
ns1     IN A    172.20.0.2

; Service records
api         IN A    172.20.0.10
web         IN A    172.20.0.11
db          IN A    172.20.0.12
cache       IN A    172.20.0.13
monitoring  IN A    172.20.0.14

; SRV records for service discovery
_http._tcp.api    IN SRV 10 100 8080 api.internal.example.com.
_http._tcp.web    IN SRV 10 100 3000 web.internal.example.com.
_postgres._tcp.db IN SRV 10 100 5432 db.internal.example.com.
```

```dns
; ~/coredns/config/zones/dev.example.test.db
$ORIGIN dev.example.test.
@       IN SOA  ns1.dev.example.test. admin.dev.example.test. (
            2024010101 3600 600 86400 300
        )

@       IN NS   ns1.dev.example.test.
ns1     IN A    127.0.0.1

; Local development services
app         IN A    127.0.0.1
api         IN A    127.0.0.1
database    IN A    127.0.0.1
```

## Service Discovery with CoreDNS and etcd

Use the etcd plugin for dynamic service discovery:

```text
# Corefile with etcd backend
services.example.test:53 {
    etcd {
        path /skydns
        endpoint http://etcd:2379
    }
    log
    errors
    cache 10
}

.:53 {
    forward . 8.8.8.8
    cache 120
    health :8080
}
```

Register services in etcd:

```bash
# Register an API service
podman exec etcd etcdctl put /skydns/test/example/services/api/instance1 \
  '{"host":"172.20.0.10","port":8080,"priority":10,"weight":100}'

podman exec etcd etcdctl put /skydns/test/example/services/api/instance2 \
  '{"host":"172.20.0.11","port":8080,"priority":10,"weight":100}'

# Register a database service
podman exec etcd etcdctl put /skydns/test/example/services/db/primary \
  '{"host":"172.20.0.20","port":5432,"priority":10}'

# Now query the service
dig @localhost api.services.example.test
# Returns: 172.20.0.10 and 172.20.0.11

dig @localhost api.services.example.test SRV
# Returns SRV records with port information
```

Deploy the combined stack:

```yaml
# dns-stack.yml
version: "3"
services:
  coredns:
    image: coredns/coredns:latest
    restart: always
    ports:
      - "53:53/udp"
      - "53:53/tcp"
      - "8080:8080"
    volumes:
      - ./coredns/config:/etc/coredns:ro
    command: -conf /etc/coredns/Corefile
    depends_on:
      - etcd

  etcd:
    image: quay.io/coreos/etcd:v3.5.21
    restart: always
    command:
      - /usr/local/bin/etcd
      - --data-dir=/etcd-data
      - --listen-client-urls=http://0.0.0.0:2379
      - --advertise-client-urls=http://etcd:2379
    volumes:
      - etcd-data:/etcd-data

volumes:
  etcd-data:
```

## CoreDNS Plugins

CoreDNS is highly extensible through plugins. Here are useful configurations:

```text
# Rewrite queries
.:53 {
    rewrite name old-api.example.com new-api.example.com
    forward . 8.8.8.8
}

# Load balancing
lb.example.com:53 {
    loadbalance round_robin
    file /etc/coredns/zones/lb.example.com.db
}

# Split-horizon DNS
example.com:53 {
    view internal {
        expr incidr(client_ip(), '10.0.0.0/8')
    }
    file /etc/coredns/zones/internal.db
}

example.com:53 {
    file /etc/coredns/zones/external.db
}

# DNS over TLS forwarding
.:53 {
    forward . tls://1.1.1.1 tls://1.0.0.1 {
        tls_servername cloudflare-dns.com
    }
    cache 60
}
```

## Using CoreDNS with Podman Networks

Configure containers to use CoreDNS for resolution:

```bash
# Create a network with custom DNS
podman network create \
  --dns 172.20.0.2 \
  --subnet 172.20.0.0/16 \
  app-network

# Run CoreDNS on the network
podman run -d \
  --name coredns \
  --network app-network \
  --ip 172.20.0.2 \
  -v ~/coredns/config:/etc/coredns:ro,Z \
  coredns/coredns:latest \
  -conf /etc/coredns/Corefile

# Run application containers using CoreDNS
podman run -d \
  --name api-service \
  --network app-network \
  --dns 172.20.0.2 \
  myapp:latest
```

## DNS-Based Health Checking

CoreDNS does not include a built-in plugin for application-level health checking of backend services. However, you can implement health-aware DNS resolution by combining etcd-based service discovery with an external health-check script that updates DNS records based on service availability.

A custom health-check script:

```bash
#!/bin/bash
# update-dns-health.sh

ETCD_ENDPOINT="http://localhost:2379"
SERVICES=("api:172.20.0.10:8080" "web:172.20.0.11:3000")

for entry in "${SERVICES[@]}"; do
    IFS=: read -r name ip port <<< "$entry"

    if curl -sf "http://${ip}:${port}/health" > /dev/null 2>&1; then
        # Service is healthy, ensure DNS record exists
        podman exec etcd etcdctl --endpoints="${ETCD_ENDPOINT}" put "/skydns/test/example/services/${name}/active" \
          "{\"host\":\"${ip}\",\"port\":${port}}"
    else
        # Service is unhealthy, remove DNS record
        podman exec etcd etcdctl --endpoints="${ETCD_ENDPOINT}" del "/skydns/test/example/services/${name}/active"
        echo "WARNING: ${name} at ${ip}:${port} is unhealthy"
    fi
done
```

## Monitoring CoreDNS

CoreDNS exposes Prometheus metrics:

```text
# Add to Corefile
.:53 {
    prometheus :9153
    forward . 8.8.8.8
    cache 120
    log
}
```

```bash
# View metrics
curl -s http://localhost:9153/metrics | head -30

# Key metrics:
# coredns_dns_requests_total - Total DNS requests
# coredns_dns_responses_total - Total DNS responses by code
# coredns_dns_request_duration_seconds - Query latency
# coredns_cache_hits_total - Cache hits
# coredns_cache_requests_total - Total cache lookups
```

Add to your Prometheus configuration:

```yaml
scrape_configs:
  - job_name: 'coredns'
    static_configs:
      - targets: ['coredns:9153']
```

## Conclusion

CoreDNS in Podman containers provides a versatile DNS solution for containerized environments. Whether you need custom internal zones for development, dynamic service discovery backed by etcd, or intelligent DNS routing with load balancing and health checking, CoreDNS delivers through its modular plugin architecture. The combination of CoreDNS with Podman networks gives your containers a proper DNS-based service discovery mechanism without requiring a full orchestration platform. Its Prometheus metrics integration makes monitoring straightforward, and the declarative Corefile configuration keeps DNS management simple and version-controllable.
