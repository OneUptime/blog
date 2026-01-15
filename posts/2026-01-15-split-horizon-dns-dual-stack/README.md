# How to Configure Split-Horizon DNS for Dual-Stack Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, DNS, Dual-Stack, Networking, Infrastructure, DevOps

Description: A comprehensive guide to implementing split-horizon DNS in dual-stack IPv4/IPv6 environments, covering BIND and CoreDNS configurations, use cases, security considerations, and operational best practices.

---

The moment you run both IPv4 and IPv6 on the same network, DNS stops being a simple lookup table. Internal clients expect private addresses while external clients need public ones. Legacy systems speak only IPv4 while modern containers demand IPv6. Split-horizon DNS solves this by returning different answers based on who is asking and from where. When you combine it with dual-stack networking, you get a powerful mechanism for traffic steering, security isolation, and seamless IPv6 migration.

## What is Split-Horizon DNS?

Split-horizon DNS (also called split-brain DNS or split-view DNS) serves different DNS responses to different clients based on their source network, IP address, or other criteria. The same query for `api.example.com` might return:

- `10.0.1.50` for internal clients on the corporate network
- `203.0.113.50` for external clients on the internet
- `fd00::50` for internal IPv6-only clients
- `2001:db8::50` for external IPv6 clients

This technique has been around since the early days of NAT, but dual-stack environments introduce new complexity. You are no longer just splitting internal vs. external-you are also splitting by protocol version, client capability, and network topology.

## Why Split-Horizon Matters in Dual-Stack Environments

### Problem 1: Hairpin Routing

Without split-horizon, internal clients querying for public services often get routed out to the internet and back in through the firewall. This wastes bandwidth, adds latency, and can break stateful inspection rules.

```
Internal Client -> Corporate DNS -> Public IP (203.0.113.50)
                                         |
                                         v
                                    Firewall (NAT hairpin)
                                         |
                                         v
                                    Internal Server
```

With split-horizon:

```
Internal Client -> Corporate DNS -> Private IP (10.0.1.50)
                                         |
                                         v
                                    Internal Server (direct)
```

### Problem 2: IPv6 Transition Complexity

During IPv6 migration, some hosts are dual-stack, some are IPv4-only, and some are IPv6-only. Without careful DNS management:

- IPv6-only clients get AAAA records pointing to addresses they cannot reach
- Legacy IPv4 clients get A records for services that moved to IPv6-only
- Dual-stack clients might prefer the wrong protocol based on happy eyeballs timing

### Problem 3: Security Segmentation

Internal DNS should never leak private addressing to the internet. Similarly, internal clients should not resolve external-only services through different paths that bypass security controls.

## Architecture Overview

A typical split-horizon dual-stack deployment has these components:

```
                    +------------------+
                    |   External DNS   |
                    |   (Public View)  |
                    +--------+---------+
                             |
                    +--------+---------+
                    |    Firewall      |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                                       |
+--------+---------+                   +---------+--------+
|   Internal DNS   |                   |   Internal DNS   |
|   (IPv4 View)    |                   |   (IPv6 View)    |
+--------+---------+                   +---------+--------+
         |                                       |
         +-------------------+-------------------+
                             |
                    +--------+---------+
                    |  Internal Hosts  |
                    |  (Dual-Stack)    |
                    +------------------+
```

You can implement this with:

- **Two separate DNS servers** (simplest but most infrastructure)
- **Single server with views** (BIND's approach)
- **Policy-based responses** (CoreDNS plugins)
- **DNS proxy with rewriting** (useful for containerized workloads)

## BIND Configuration for Split-Horizon Dual-Stack

BIND has native support for views, making it the traditional choice for split-horizon deployments. Here is a complete configuration for a dual-stack environment.

### Main Configuration (named.conf)

```bind
// /etc/bind/named.conf

// ACLs define which clients see which view
acl "internal-ipv4" {
    10.0.0.0/8;
    172.16.0.0/12;
    192.168.0.0/16;
    127.0.0.0/8;
};

acl "internal-ipv6" {
    fd00::/8;           // Unique local addresses
    fe80::/10;          // Link-local
    ::1/128;            // Loopback
};

acl "trusted-external" {
    // Partner networks that get special treatment
    198.51.100.0/24;
    2001:db8:1000::/48;
};

// Logging configuration
logging {
    channel default_log {
        file "/var/log/named/default.log" versions 5 size 50m;
        severity info;
        print-time yes;
        print-severity yes;
        print-category yes;
    };

    channel query_log {
        file "/var/log/named/queries.log" versions 10 size 100m;
        severity debug;
        print-time yes;
    };

    category default { default_log; };
    category queries { query_log; };
};

// Options that apply to all views
options {
    directory "/var/cache/bind";

    // Listen on both IPv4 and IPv6
    listen-on port 53 { any; };
    listen-on-v6 port 53 { any; };

    // Security settings
    dnssec-validation auto;
    auth-nxdomain no;

    // Disable recursion by default (enable per-view)
    recursion no;

    // Rate limiting to prevent amplification attacks
    rate-limit {
        responses-per-second 10;
        window 5;
    };

    // Response policy zones for additional filtering
    response-policy { zone "rpz.local"; };
};

// Internal IPv4 View
view "internal-ipv4" {
    match-clients { internal-ipv4; };
    match-destinations { any; };

    recursion yes;
    allow-recursion { internal-ipv4; };

    // Forward unknown queries to upstream resolvers
    forwarders {
        8.8.8.8;
        8.8.4.4;
    };
    forward only;

    // Internal zone with private IPv4 addresses
    zone "example.com" {
        type master;
        file "/etc/bind/zones/internal-ipv4/example.com.zone";
        allow-query { internal-ipv4; };
        allow-transfer { none; };
    };

    // Reverse DNS for internal IPv4
    zone "0.10.in-addr.arpa" {
        type master;
        file "/etc/bind/zones/internal-ipv4/10.0.rev";
        allow-query { internal-ipv4; };
        allow-transfer { none; };
    };

    // Include standard zones
    include "/etc/bind/zones.rfc1918";
};

// Internal IPv6 View
view "internal-ipv6" {
    match-clients { internal-ipv6; };
    match-destinations { any; };

    recursion yes;
    allow-recursion { internal-ipv6; };

    // IPv6 upstream resolvers
    forwarders {
        2001:4860:4860::8888;
        2001:4860:4860::8844;
    };
    forward only;

    // Internal zone with private IPv6 addresses
    zone "example.com" {
        type master;
        file "/etc/bind/zones/internal-ipv6/example.com.zone";
        allow-query { internal-ipv6; };
        allow-transfer { none; };
    };

    // Reverse DNS for internal IPv6 (ULA)
    zone "0.0.d.f.ip6.arpa" {
        type master;
        file "/etc/bind/zones/internal-ipv6/fd00.rev";
        allow-query { internal-ipv6; };
        allow-transfer { none; };
    };
};

// External View (public internet)
view "external" {
    match-clients { any; };
    match-destinations { any; };

    // No recursion for external clients
    recursion no;

    // Public zone with external addresses
    zone "example.com" {
        type master;
        file "/etc/bind/zones/external/example.com.zone";
        allow-query { any; };
        allow-transfer {
            // Secondary DNS servers
            198.51.100.10;
            2001:db8:100::10;
        };
    };

    // Reverse DNS for public IPv4
    zone "113.0.203.in-addr.arpa" {
        type master;
        file "/etc/bind/zones/external/203.0.113.rev";
        allow-query { any; };
    };

    // Reverse DNS for public IPv6
    zone "8.b.d.0.1.0.0.2.ip6.arpa" {
        type master;
        file "/etc/bind/zones/external/2001-db8.rev";
        allow-query { any; };
    };
};
```

### Internal IPv4 Zone File

```bind
; /etc/bind/zones/internal-ipv4/example.com.zone
$TTL 3600
@       IN      SOA     ns1.example.com. admin.example.com. (
                        2026011501  ; Serial (YYYYMMDDNN)
                        3600        ; Refresh (1 hour)
                        900         ; Retry (15 minutes)
                        604800      ; Expire (1 week)
                        300         ; Negative TTL (5 minutes)
                        )

; Name servers (internal addresses)
@       IN      NS      ns1.example.com.
@       IN      NS      ns2.example.com.

; Internal name server addresses
ns1     IN      A       10.0.1.10
ns2     IN      A       10.0.1.11

; Web services - internal addresses
www     IN      A       10.0.1.50
api     IN      A       10.0.1.51
app     IN      A       10.0.1.52

; Database servers (internal only, no external record)
db-primary      IN      A       10.0.2.10
db-replica-1    IN      A       10.0.2.11
db-replica-2    IN      A       10.0.2.12

; Cache servers
redis-1         IN      A       10.0.3.10
redis-2         IN      A       10.0.3.11
memcached       IN      A       10.0.3.20

; Message queue
rabbitmq        IN      A       10.0.4.10
kafka-1         IN      A       10.0.4.20
kafka-2         IN      A       10.0.4.21
kafka-3         IN      A       10.0.4.22

; Kubernetes cluster
k8s-api         IN      A       10.0.10.100
k8s-ingress     IN      A       10.0.10.200

; Monitoring and observability
prometheus      IN      A       10.0.5.10
grafana         IN      A       10.0.5.11
oneuptime       IN      A       10.0.5.20

; Mail services
mail            IN      A       10.0.6.10
@               IN      MX      10 mail.example.com.

; Service discovery CNAMEs
postgres        IN      CNAME   db-primary
cache           IN      CNAME   redis-1
queue           IN      CNAME   rabbitmq

; SRV records for service discovery
_http._tcp.api  IN      SRV     10 50 80 api.example.com.
_https._tcp.api IN      SRV     10 50 443 api.example.com.
```

### Internal IPv6 Zone File

```bind
; /etc/bind/zones/internal-ipv6/example.com.zone
$TTL 3600
@       IN      SOA     ns1.example.com. admin.example.com. (
                        2026011501  ; Serial
                        3600        ; Refresh
                        900         ; Retry
                        604800      ; Expire
                        300         ; Negative TTL
                        )

; Name servers
@       IN      NS      ns1.example.com.
@       IN      NS      ns2.example.com.

; Name server IPv6 addresses
ns1     IN      AAAA    fd00::1:10
ns2     IN      AAAA    fd00::1:11

; Web services - internal IPv6 addresses
www     IN      AAAA    fd00::1:50
api     IN      AAAA    fd00::1:51
app     IN      AAAA    fd00::1:52

; Dual-stack services get both A and AAAA
; (clients use happy eyeballs to pick)
www     IN      A       10.0.1.50
api     IN      A       10.0.1.51
app     IN      A       10.0.1.52

; Database servers
db-primary      IN      AAAA    fd00::2:10
db-replica-1    IN      AAAA    fd00::2:11
db-replica-2    IN      AAAA    fd00::2:12

; Cache servers
redis-1         IN      AAAA    fd00::3:10
redis-2         IN      AAAA    fd00::3:11

; Kubernetes cluster (IPv6-native)
k8s-api         IN      AAAA    fd00::10:100
k8s-ingress     IN      AAAA    fd00::10:200

; Monitoring
prometheus      IN      AAAA    fd00::5:10
grafana         IN      AAAA    fd00::5:11
oneuptime       IN      AAAA    fd00::5:20

; Mail with IPv6
mail            IN      AAAA    fd00::6:10
@               IN      MX      10 mail.example.com.
```

### External Zone File

```bind
; /etc/bind/zones/external/example.com.zone
$TTL 3600
@       IN      SOA     ns1.example.com. admin.example.com. (
                        2026011501  ; Serial
                        3600        ; Refresh
                        900         ; Retry
                        604800      ; Expire
                        300         ; Negative TTL
                        )

; Name servers with public addresses
@       IN      NS      ns1.example.com.
@       IN      NS      ns2.example.com.

ns1     IN      A       203.0.113.10
ns1     IN      AAAA    2001:db8::10
ns2     IN      A       203.0.113.11
ns2     IN      AAAA    2001:db8::11

; Public web services (dual-stack)
@       IN      A       203.0.113.50
@       IN      AAAA    2001:db8::50
www     IN      A       203.0.113.50
www     IN      AAAA    2001:db8::50
api     IN      A       203.0.113.51
api     IN      AAAA    2001:db8::51
app     IN      A       203.0.113.52
app     IN      AAAA    2001:db8::52

; Note: No database or internal service records exposed

; Mail services
mail    IN      A       203.0.113.60
mail    IN      AAAA    2001:db8::60
@       IN      MX      10 mail.example.com.

; SPF, DKIM, DMARC records
@       IN      TXT     "v=spf1 mx ip4:203.0.113.60 ip6:2001:db8::60 -all"
_dmarc  IN      TXT     "v=DMARC1; p=reject; rua=mailto:dmarc@example.com"

; CAA records for certificate issuance
@       IN      CAA     0 issue "letsencrypt.org"
@       IN      CAA     0 issuewild "letsencrypt.org"

; HTTPS/SVCB records for modern clients
@       IN      HTTPS   1 . alpn="h2,h3" ipv4hint="203.0.113.50" ipv6hint="2001:db8::50"
www     IN      HTTPS   1 . alpn="h2,h3" ipv4hint="203.0.113.50" ipv6hint="2001:db8::50"
```

## CoreDNS Configuration for Split-Horizon Dual-Stack

CoreDNS is the default DNS server in Kubernetes and offers a plugin-based architecture that is easier to extend. Here is how to configure split-horizon with CoreDNS.

### Main Corefile

```corefile
# /etc/coredns/Corefile

# Internal view for IPv4 private ranges
(internal-ipv4) {
    bind 10.0.1.10

    # Log all queries
    log

    # Enable error logging
    errors

    # Prometheus metrics
    prometheus :9153

    # Health endpoint
    health :8080

    # Ready endpoint
    ready :8181
}

# Internal view for IPv6 private ranges
(internal-ipv6) {
    bind fd00::1:10

    log
    errors
    prometheus :9154
    health :8081
    ready :8182
}

# External view
(external) {
    bind 203.0.113.10 2001:db8::10

    log
    errors
    prometheus :9155

    # Rate limiting for external queries
    ratelimit 100
}

# Internal IPv4 zone
example.com:53 {
    import internal-ipv4

    # ACL plugin to restrict by source IP
    acl {
        allow net 10.0.0.0/8
        allow net 172.16.0.0/12
        allow net 192.168.0.0/16
        allow net 127.0.0.0/8
        block
    }

    # Serve zone from file
    file /etc/coredns/zones/internal-ipv4/example.com.zone

    # Forward unknown queries
    forward . 8.8.8.8 8.8.4.4 {
        max_concurrent 1000
    }

    # Cache responses
    cache 3600

    # Reload zone files automatically
    reload 30s
}

# Internal IPv6 zone
example.com:53 {
    import internal-ipv6

    acl {
        allow net fd00::/8
        allow net fe80::/10
        allow net ::1/128
        block
    }

    file /etc/coredns/zones/internal-ipv6/example.com.zone

    forward . 2001:4860:4860::8888 2001:4860:4860::8844 {
        max_concurrent 1000
    }

    cache 3600
    reload 30s
}

# External zone
example.com:53 {
    import external

    # No recursion for external - authoritative only
    file /etc/coredns/zones/external/example.com.zone

    # No forwarding

    cache 300
    reload 30s
}

# Kubernetes integration (internal only)
cluster.local:53 {
    import internal-ipv4
    import internal-ipv6

    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }

    cache 30
}

# Catch-all for recursion (internal only)
.:53 {
    import internal-ipv4

    acl {
        allow net 10.0.0.0/8
        allow net 172.16.0.0/12
        allow net 192.168.0.0/16
        block
    }

    forward . 8.8.8.8 8.8.4.4 {
        max_concurrent 1000
        health_check 30s
    }

    cache 3600
}
```

### CoreDNS with View Plugin

For more sophisticated view selection, use the `view` plugin (requires CoreDNS 1.11+):

```corefile
# /etc/coredns/Corefile with view plugin

(common) {
    log
    errors
    prometheus :9153
    cache 3600
}

example.com:53 {
    import common

    view internal-ipv4 {
        expr incidr(client_ip(), '10.0.0.0/8') ||
             incidr(client_ip(), '172.16.0.0/12') ||
             incidr(client_ip(), '192.168.0.0/16')
    } {
        file /etc/coredns/zones/internal-ipv4/example.com.zone
        forward . 8.8.8.8
    }

    view internal-ipv6 {
        expr incidr(client_ip(), 'fd00::/8') ||
             incidr(client_ip(), 'fe80::/10')
    } {
        file /etc/coredns/zones/internal-ipv6/example.com.zone
        forward . 2001:4860:4860::8888
    }

    view external {
        expr true  # Catch-all
    } {
        file /etc/coredns/zones/external/example.com.zone
    }
}
```

### CoreDNS with Rewrite Plugin for Dual-Stack Steering

```corefile
# Traffic steering based on client capability

example.com:53 {
    log
    errors

    # Detect IPv6-capable clients and prefer AAAA
    rewrite stop {
        name regex (.*)\.example\.com {1}.v6.example.com
        answer name (.*)\.v6\.example\.com {1}.example.com
        cond client_ip() matches fd00::/8
    }

    # Force IPv4 for legacy clients
    rewrite stop {
        name regex (.*)\.example\.com {1}.v4.example.com
        answer name (.*)\.v4\.example\.com {1}.example.com
        cond client_ip() matches 10.0.0.0/8
    }

    file /etc/coredns/zones/example.com.zone
    cache 300
}
```

## Kubernetes Deployment for CoreDNS Split-Horizon

```yaml
# coredns-split-horizon.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  Corefile: |
    # Internal services zone
    internal.example.com:53 {
        log
        errors

        # Only allow cluster-internal queries
        acl {
            allow net 10.0.0.0/8
            allow net fd00::/8
            block
        }

        # Serve from configmap
        file /etc/coredns/zones/internal.zone

        cache 60
    }

    # External forwarding
    .:53 {
        log
        errors

        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
        }

        forward . /etc/resolv.conf {
            max_concurrent 1000
        }

        cache 30
        loop
        reload
        loadbalance
    }

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-zones
  namespace: kube-system
data:
  internal.zone: |
    $TTL 60
    @       IN      SOA     ns.internal.example.com. admin.example.com. (
                            2026011501 3600 900 604800 60 )
    @       IN      NS      ns.internal.example.com.

    ; Internal services with cluster IPs
    api         IN      A       10.96.100.10
    api         IN      AAAA    fd00::96:100:10
    database    IN      A       10.96.100.20
    cache       IN      A       10.96.100.30

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns-split
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: coredns-split
  template:
    metadata:
      labels:
        app: coredns-split
    spec:
      serviceAccountName: coredns
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: coredns-split
                topologyKey: kubernetes.io/hostname
      containers:
        - name: coredns
          image: coredns/coredns:1.11.1
          args: ["-conf", "/etc/coredns/Corefile"]
          ports:
            - containerPort: 53
              name: dns
              protocol: UDP
            - containerPort: 53
              name: dns-tcp
              protocol: TCP
            - containerPort: 9153
              name: metrics
          resources:
            limits:
              memory: 256Mi
              cpu: 200m
            requests:
              memory: 128Mi
              cpu: 100m
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 60
            timeoutSeconds: 5
          readinessProbe:
            httpGet:
              path: /ready
              port: 8181
            initialDelaySeconds: 10
          volumeMounts:
            - name: config
              mountPath: /etc/coredns
            - name: zones
              mountPath: /etc/coredns/zones
      volumes:
        - name: config
          configMap:
            name: coredns-custom
        - name: zones
          configMap:
            name: coredns-zones
```

## Use Cases and Patterns

### Use Case 1: Hybrid Cloud with On-Premises IPv6

Organizations running workloads both on-premises (IPv6-native) and in cloud (IPv4/NAT) need DNS that bridges both worlds.

```bind
// BIND configuration for hybrid cloud
view "onprem-ipv6" {
    match-clients { fd00::/8; 2001:db8:corp::/48; };

    zone "example.com" {
        type master;
        file "/etc/bind/zones/onprem-ipv6.zone";
    };

    // Forward cloud-specific queries to cloud DNS
    zone "cloud.example.com" {
        type forward;
        forward only;
        forwarders { 10.100.0.2; };  // Cloud DNS endpoint
    };
};

view "cloud-ipv4" {
    match-clients { 10.100.0.0/16; 172.20.0.0/16; };

    zone "example.com" {
        type master;
        file "/etc/bind/zones/cloud-ipv4.zone";
    };

    // Forward on-prem queries to on-prem DNS
    zone "onprem.example.com" {
        type forward;
        forward only;
        forwarders { fd00::1:10; };  // On-prem DNS over IPv6 tunnel
    };
};
```

### Use Case 2: Gradual IPv6 Migration

When migrating services to IPv6, use DNS to control rollout:

```bind
// Zone file with weighted records for gradual migration

; Stage 1: IPv4 primary, IPv6 canary (10%)
api     IN      A       10.0.1.51       ; Weight: 90%
api     IN      A       10.0.1.51
api     IN      A       10.0.1.51
api     IN      A       10.0.1.51
api     IN      A       10.0.1.51
api     IN      A       10.0.1.51
api     IN      A       10.0.1.51
api     IN      A       10.0.1.51
api     IN      A       10.0.1.51
api     IN      AAAA    fd00::1:51      ; Weight: 10%

; Stage 2: 50/50 split
api     IN      A       10.0.1.51
api     IN      AAAA    fd00::1:51

; Stage 3: IPv6 primary, IPv4 fallback
api     IN      AAAA    fd00::1:51
api     IN      AAAA    fd00::1:51
api     IN      AAAA    fd00::1:51
api     IN      A       10.0.1.51       ; Fallback only
```

### Use Case 3: Geographic and Protocol-Based Steering

```corefile
# CoreDNS with geoip and protocol steering

example.com:53 {
    log

    # North America - prefer IPv4 (legacy infrastructure)
    view na-ipv4 {
        geoip {
            country US CA MX
        }
    } {
        template IN A {
            answer "{{ .Name }} 300 IN A 198.51.100.50"
        }
        template IN AAAA {
            answer "{{ .Name }} 300 IN AAAA 2001:db8:na::50"
        }
    }

    # Europe - prefer IPv6 (modern infrastructure)
    view eu-ipv6 {
        geoip {
            country DE FR GB NL
        }
    } {
        template IN AAAA {
            answer "{{ .Name }} 300 IN AAAA 2001:db8:eu::50"
        }
        template IN A {
            answer "{{ .Name }} 300 IN A 203.0.113.50"
        }
    }

    # Asia-Pacific - both protocols
    view apac {
        geoip {
            country JP SG AU
        }
    } {
        template IN A {
            answer "{{ .Name }} 300 IN A 203.0.113.100"
        }
        template IN AAAA {
            answer "{{ .Name }} 300 IN AAAA 2001:db8:apac::50"
        }
    }
}
```

### Use Case 4: Development/Staging/Production Separation

```bind
// Separate views for each environment

acl "dev-network" { 10.10.0.0/16; fd00:10::/32; };
acl "staging-network" { 10.20.0.0/16; fd00:20::/32; };
acl "prod-network" { 10.30.0.0/16; fd00:30::/32; };

view "development" {
    match-clients { dev-network; };

    zone "example.com" {
        type master;
        file "/etc/bind/zones/dev.zone";
    };

    // Dev can see staging and prod (read-only access)
    zone "staging.example.com" {
        type forward;
        forwarders { 10.20.0.10; };
    };
};

view "staging" {
    match-clients { staging-network; };

    zone "example.com" {
        type master;
        file "/etc/bind/zones/staging.zone";
    };

    // Staging cannot see dev
};

view "production" {
    match-clients { prod-network; };

    zone "example.com" {
        type master;
        file "/etc/bind/zones/prod.zone";
    };

    // Production is completely isolated
};
```

## Security Considerations

### 1. Prevent Zone Leakage

Never allow zone transfers between views:

```bind
// Bad - allows internal zone to leak
zone "example.com" {
    type master;
    file "/etc/bind/zones/internal.zone";
    allow-transfer { any; };  // DANGEROUS
};

// Good - explicit deny
zone "example.com" {
    type master;
    file "/etc/bind/zones/internal.zone";
    allow-transfer { none; };
    // Or specific secondary servers only
    // allow-transfer { 10.0.1.11; };
};
```

### 2. DNSSEC for External Zones

```bind
// Enable DNSSEC signing for external zones
zone "example.com" {
    type master;
    file "/etc/bind/zones/external/example.com.zone";

    // DNSSEC configuration
    dnssec-policy default;
    inline-signing yes;

    // Key management
    key-directory "/etc/bind/keys";
};
```

### 3. Response Rate Limiting

```bind
options {
    rate-limit {
        responses-per-second 10;     // Per-client limit
        referrals-per-second 5;
        nodata-per-second 5;
        nxdomains-per-second 5;
        errors-per-second 5;
        all-per-second 100;          // Total limit
        window 5;                     // Averaging window
        log-only no;                  // Actually enforce limits
        qps-scale 250;               // Scale factor
        ipv4-prefix-length 24;       // Aggregate by /24
        ipv6-prefix-length 56;       // Aggregate by /56
    };
};
```

### 4. Query Logging and Monitoring

```corefile
# CoreDNS with detailed logging

example.com:53 {
    log {
        class denial error
        format combined
    }

    # Export to OneUptime
    prometheus :9153 {
        per_zone_stats true
    }

    # Custom metrics
    metadata

    file /etc/coredns/zones/example.com.zone
}
```

## Monitoring and Observability

### Prometheus Metrics for CoreDNS

```yaml
# prometheus-rules.yaml for DNS monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: coredns-alerts
spec:
  groups:
    - name: coredns
      rules:
        - alert: CoreDNSDown
          expr: absent(coredns_dns_requests_total)
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "CoreDNS is down"

        - alert: CoreDNSHighLatency
          expr: histogram_quantile(0.99, sum(rate(coredns_dns_request_duration_seconds_bucket[5m])) by (le, server)) > 0.1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "DNS query latency is high"

        - alert: CoreDNSHighErrorRate
          expr: sum(rate(coredns_dns_responses_total{rcode=~"SERVFAIL|REFUSED"}[5m])) / sum(rate(coredns_dns_responses_total[5m])) > 0.01
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "DNS error rate exceeds 1%"

        - alert: CoreDNSCacheMissHigh
          expr: sum(rate(coredns_cache_misses_total[5m])) / (sum(rate(coredns_cache_hits_total[5m])) + sum(rate(coredns_cache_misses_total[5m]))) > 0.5
          for: 15m
          labels:
            severity: info
          annotations:
            summary: "DNS cache miss rate exceeds 50%"
```

### Grafana Dashboard Queries

```promql
# Query rate by view
sum by (view) (rate(coredns_dns_requests_total[5m]))

# Response time percentiles
histogram_quantile(0.50, sum(rate(coredns_dns_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.90, sum(rate(coredns_dns_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(coredns_dns_request_duration_seconds_bucket[5m])) by (le))

# Error rate by type
sum by (rcode) (rate(coredns_dns_responses_total[5m]))

# Cache effectiveness
sum(rate(coredns_cache_hits_total[5m])) /
(sum(rate(coredns_cache_hits_total[5m])) + sum(rate(coredns_cache_misses_total[5m])))

# Forward latency to upstream
histogram_quantile(0.99, sum(rate(coredns_forward_request_duration_seconds_bucket[5m])) by (le, to))
```

## Testing Split-Horizon Configuration

### Validation Script

```bash
#!/bin/bash
# test-split-horizon.sh

DNS_SERVER="10.0.1.10"
DOMAIN="api.example.com"

echo "=== Testing Split-Horizon DNS ==="

# Test from IPv4 internal network
echo -e "\n--- IPv4 Internal View ---"
dig @${DNS_SERVER} ${DOMAIN} A +short -b 10.0.0.100
dig @${DNS_SERVER} ${DOMAIN} AAAA +short -b 10.0.0.100

# Test from IPv6 internal network
echo -e "\n--- IPv6 Internal View ---"
dig @${DNS_SERVER} ${DOMAIN} A +short -b fd00::100
dig @${DNS_SERVER} ${DOMAIN} AAAA +short -b fd00::100

# Test from external (if accessible)
echo -e "\n--- External View ---"
dig @${DNS_SERVER} ${DOMAIN} A +short -b 203.0.113.100 2>/dev/null || echo "External test skipped"

# Verify no zone leakage
echo -e "\n--- Zone Transfer Test (should fail) ---"
dig @${DNS_SERVER} example.com AXFR +short

# Test DNSSEC validation
echo -e "\n--- DNSSEC Validation ---"
dig @${DNS_SERVER} ${DOMAIN} +dnssec +short

# Response time measurement
echo -e "\n--- Latency Test ---"
for i in {1..10}; do
    dig @${DNS_SERVER} ${DOMAIN} | grep "Query time"
done

echo -e "\n=== Tests Complete ==="
```

### Integration Test with DNS Client Libraries

```python
#!/usr/bin/env python3
# test_split_horizon.py

import dns.resolver
import socket
import sys

def test_view(resolver_ip, source_ip, domain, expected_v4, expected_v6):
    """Test DNS resolution from a specific source IP."""
    resolver = dns.resolver.Resolver()
    resolver.nameservers = [resolver_ip]

    print(f"\nTesting from {source_ip}:")

    # Test A record
    try:
        answers = resolver.resolve(domain, 'A')
        a_records = [str(r) for r in answers]
        print(f"  A records: {a_records}")
        assert expected_v4 in a_records, f"Expected {expected_v4} in A records"
        print(f"  A record test: PASS")
    except Exception as e:
        print(f"  A record test: FAIL - {e}")
        return False

    # Test AAAA record
    try:
        answers = resolver.resolve(domain, 'AAAA')
        aaaa_records = [str(r) for r in answers]
        print(f"  AAAA records: {aaaa_records}")
        assert expected_v6 in aaaa_records, f"Expected {expected_v6} in AAAA records"
        print(f"  AAAA record test: PASS")
    except Exception as e:
        print(f"  AAAA record test: FAIL - {e}")
        return False

    return True

def main():
    domain = "api.example.com"
    dns_server = "10.0.1.10"

    tests = [
        # (source_ip, expected_v4, expected_v6)
        ("10.0.0.100", "10.0.1.51", "fd00::1:51"),      # Internal IPv4 view
        ("fd00::100", "10.0.1.51", "fd00::1:51"),       # Internal IPv6 view
    ]

    results = []
    for source_ip, expected_v4, expected_v6 in tests:
        result = test_view(dns_server, source_ip, domain, expected_v4, expected_v6)
        results.append(result)

    print(f"\n{'='*50}")
    print(f"Results: {sum(results)}/{len(results)} tests passed")

    sys.exit(0 if all(results) else 1)

if __name__ == "__main__":
    main()
```

## Troubleshooting Common Issues

### Issue 1: Wrong View Selection

**Symptom:** Clients get external addresses when they should get internal ones.

**Diagnosis:**
```bash
# Check which view is being matched
dig @10.0.1.10 api.example.com +subnet=10.0.0.100/32

# Enable query logging in BIND
rndc querylog on
tail -f /var/log/named/queries.log
```

**Solution:** Verify ACL ordering in BIND (first match wins) or view expressions in CoreDNS.

### Issue 2: IPv6 Clients Falling Back to IPv4

**Symptom:** Dual-stack clients always use IPv4 even when IPv6 is available.

**Diagnosis:**
```bash
# Check AAAA records are present
dig @10.0.1.10 api.example.com AAAA

# Verify client can reach IPv6 address
ping6 fd00::1:51

# Check happy eyeballs behavior
curl -v --ipv6 https://api.example.com
```

**Solution:** Ensure AAAA records have appropriate TTLs and the IPv6 path is working end-to-end.

### Issue 3: Zone Transfer Failures Between Views

**Symptom:** Secondary DNS servers have stale zone data.

**Diagnosis:**
```bash
# Check zone transfer status
dig @secondary-ns.example.com example.com AXFR

# Verify serial numbers match
dig @primary-ns example.com SOA +short
dig @secondary-ns example.com SOA +short
```

**Solution:** Ensure `allow-transfer` includes secondary servers and they query the correct view.

### Issue 4: DNSSEC Validation Failures

**Symptom:** Queries return SERVFAIL for signed zones.

**Diagnosis:**
```bash
# Check DNSSEC chain
delv @10.0.1.10 api.example.com

# Verify signatures
dig @10.0.1.10 example.com DNSKEY +dnssec
dig @10.0.1.10 example.com RRSIG
```

**Solution:** Ensure DS records are published in parent zone and keys have not expired.

## Best Practices Summary

### Configuration Best Practices

| Area | Recommendation | Rationale |
|------|----------------|-----------|
| **ACL Ordering** | Most specific first, then broader ranges | BIND uses first-match; prevent accidental external exposure |
| **View Separation** | Maintain separate zone files per view | Easier auditing, prevents copy-paste errors |
| **TTL Strategy** | Internal: 300-900s, External: 3600s | Internal changes more frequently; external needs stability |
| **Recursion** | Enable only for internal views | Prevents open resolver abuse |
| **Zone Transfers** | Explicit allow-list or `none` | Prevents information leakage |
| **DNSSEC** | Sign external zones, optional for internal | External needs trust chain; internal is controlled |
| **Logging** | Log queries for internal, responses for all | Debug without overwhelming storage |
| **Rate Limiting** | Apply to external view | Prevent amplification attacks |

### Operational Best Practices

| Area | Recommendation | Rationale |
|------|----------------|-----------|
| **Deployment** | Blue-green with DNS cutover | Test new config before production traffic |
| **Monitoring** | Track latency, error rate, cache hit ratio | Early warning for issues |
| **Testing** | Automate view selection tests | Catch misconfigurations before production |
| **Documentation** | Maintain IP-to-view mapping | On-call needs quick reference |
| **Backup** | Version control all zone files | Quick rollback on bad changes |
| **Alerting** | Alert on SERVFAIL rate increase | Indicates configuration or upstream issues |
| **Capacity** | Monitor query rate trends | Plan scaling before hitting limits |
| **DR** | Test failover to secondary | Ensure continuity during primary outage |

### Dual-Stack Specific Best Practices

| Area | Recommendation | Rationale |
|------|----------------|-----------|
| **Record Ordering** | AAAA before A in zone files | Some resolvers prefer first record |
| **Happy Eyeballs** | Keep IPv4/IPv6 latency similar | Prevent protocol preference flapping |
| **Fallback** | Always provide both A and AAAA | Support all client capabilities |
| **Migration** | Use weighted records for gradual rollout | Control IPv6 adoption rate |
| **Testing** | Test from IPv4-only, IPv6-only, dual-stack | Verify all client scenarios |
| **Monitoring** | Track query rate by record type | Understand IPv6 adoption progress |

## Summary

Split-horizon DNS in dual-stack environments requires careful planning but delivers significant benefits: reduced hairpin routing, protocol-aware traffic steering, security isolation, and controlled IPv6 migration. Both BIND and CoreDNS provide the building blocks-BIND through views and ACLs, CoreDNS through plugins and expressions.

Key takeaways:

1. **Define clear network boundaries** with ACLs before configuring views
2. **Maintain separate zone files** for each view to simplify auditing
3. **Test extensively** from all client perspectives (IPv4-only, IPv6-only, dual-stack, internal, external)
4. **Monitor DNS metrics** and set alerts for latency spikes and error rate increases
5. **Document IP-to-view mappings** for faster troubleshooting during incidents
6. **Plan for IPv6 migration** using DNS as the control mechanism for gradual rollout

Split-horizon DNS is not just about returning different IP addresses-it is about controlling how traffic flows through your network based on who is asking and what protocols they support. Get it right, and your dual-stack migration becomes a controlled process instead of a chaotic scramble.

For monitoring your DNS infrastructure and tracking the health of your split-horizon configuration, OneUptime provides comprehensive observability tools that integrate with both BIND and CoreDNS metrics endpoints. Set up synthetic monitors to verify view selection from different network vantage points, and configure alerts to catch configuration drift before it affects production traffic.
