# How to Set Up Split-Horizon DNS on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, Split-Horizon, CoreDNS, Kubernetes, Networking

Description: Implement split-horizon DNS on Talos Linux so internal and external clients resolve the same domain names to different IP addresses.

---

Split-horizon DNS (also called split-brain DNS) is a configuration where the same domain name resolves to different IP addresses depending on who is asking. Internal clients get internal IPs, external clients get external IPs. This is common in enterprise environments where you want `app.example.com` to resolve to a private IP within the network and a public IP for everyone else. On Talos Linux, you can implement this using CoreDNS with some thoughtful configuration.

## Why Split-Horizon DNS

Consider this scenario: you have a web application accessible both internally and externally. External users hit it through a public load balancer at 203.0.113.10. Internal pods and services should communicate through the internal service at 10.96.1.100 to avoid unnecessary NAT and to keep traffic on the fast internal network.

Without split-horizon DNS, you would need different hostnames for internal and external access, which complicates your application configuration and certificate management.

## Architecture for Split-Horizon on Talos

The approach involves configuring CoreDNS inside the cluster to serve internal responses for your domains while external DNS (Route53, Cloudflare, etc.) serves the public responses. Pods in the cluster query CoreDNS, which returns internal addresses. External clients query public DNS, which returns external addresses.

```
Internal pod -> CoreDNS -> Internal IP (10.96.1.100)
External user -> Public DNS -> External IP (203.0.113.10)
```

## Setting Up Internal DNS Records in CoreDNS

The simplest approach uses the `hosts` plugin in CoreDNS to override specific domains with internal addresses:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lazystart
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }

        # Split-horizon: internal overrides for public domains
        hosts {
            10.96.1.100  app.example.com
            10.96.1.101  api.example.com
            10.96.1.102  dashboard.example.com
            10.96.2.50   db.example.com
            fallthrough
        }

        prometheus :9153
        forward . 8.8.8.8 1.1.1.1 {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

With this configuration, when a pod inside the cluster looks up `app.example.com`, it gets `10.96.1.100`. When someone outside the cluster looks up the same domain through public DNS, they get the public IP.

## Dynamic Split-Horizon with a Custom ConfigMap

Managing static host entries gets tedious. A better approach uses a separate ConfigMap that you can update independently:

```yaml
# split-horizon-records.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: split-horizon-dns
  namespace: kube-system
data:
  hosts: |
    # Internal overrides for split-horizon DNS
    # Format: IP  FQDN
    10.96.1.100  app.example.com
    10.96.1.101  api.example.com
    10.96.1.102  dashboard.example.com
    10.96.2.50   db.example.com
    10.96.3.10   redis.example.com
    10.96.3.11   rabbitmq.example.com
```

Mount this ConfigMap in the CoreDNS deployment and reference it in the Corefile:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lazystart
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }

        hosts /etc/coredns/split-horizon/hosts {
            fallthrough
            reload 30s
        }

        prometheus :9153
        forward . 8.8.8.8 1.1.1.1 {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

Update the CoreDNS deployment to mount the additional ConfigMap:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: coredns
        volumeMounts:
        - name: config-volume
          mountPath: /etc/coredns
          readOnly: true
        - name: split-horizon
          mountPath: /etc/coredns/split-horizon
          readOnly: true
      volumes:
      - name: config-volume
        configMap:
          name: coredns
      - name: split-horizon
        configMap:
          name: split-horizon-dns
```

Now you can update DNS records by editing the `split-horizon-dns` ConfigMap without touching the main CoreDNS configuration.

## Using the File Plugin for Zone Management

For more complex setups, use CoreDNS's `file` plugin to serve a full DNS zone internally:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-zone-data
  namespace: kube-system
data:
  example.com.zone: |
    $ORIGIN example.com.
    @   3600 IN SOA  ns1.example.com. admin.example.com. (
            2026030301 ; serial
            3600       ; refresh
            900        ; retry
            604800     ; expire
            86400 )    ; minimum TTL

    @       300 IN A     10.96.1.100
    app     300 IN A     10.96.1.100
    api     300 IN A     10.96.1.101
    dashboard 300 IN A   10.96.1.102
    db      300 IN A     10.96.2.50
    redis   300 IN A     10.96.3.10
    *.dev   300 IN A     10.96.5.1
```

Reference the zone file in the Corefile:

```
# Internal zone for split-horizon
example.com:53 {
    errors
    file /etc/coredns/zones/example.com.zone
    cache 300
    reload 30s
}

.:53 {
    errors
    health {
       lazystart
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    prometheus :9153
    forward . 8.8.8.8 1.1.1.1 {
       max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}
```

The `example.com` server block takes priority over the catch-all `.` block for queries matching that domain. Queries for any other domain pass through to the public DNS forwarders.

## Automating Record Updates

You can automate the split-horizon records based on Kubernetes service state:

```bash
#!/bin/bash
# update-split-horizon.sh
# Generates split-horizon DNS records from Kubernetes services

OUTPUT_FILE="/tmp/split-horizon-hosts"

echo "# Auto-generated split-horizon DNS records" > "$OUTPUT_FILE"
echo "# Generated: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Get all services with the split-horizon annotation
kubectl get services --all-namespaces -o json | jq -r '
    .items[] |
    select(.metadata.annotations["dns.example.com/split-horizon"] == "true") |
    "\(.spec.clusterIP)  \(.metadata.annotations["dns.example.com/hostname"])"
' >> "$OUTPUT_FILE"

# Update the ConfigMap
kubectl create configmap split-horizon-dns \
    --namespace kube-system \
    --from-file=hosts="$OUTPUT_FILE" \
    --dry-run=client -o yaml | kubectl apply -f -

echo "Split-horizon records updated"
```

Services opt in to split-horizon DNS with annotations:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: production
  annotations:
    dns.example.com/split-horizon: "true"
    dns.example.com/hostname: "app.example.com"
spec:
  type: ClusterIP
  ports:
  - port: 80
  selector:
    app: my-app
```

## Testing Split-Horizon Resolution

Verify that internal and external resolution differ:

```bash
# Test from inside the cluster
kubectl run dns-test --rm -it --restart=Never --image=alpine -- sh -c '
    apk add --no-cache bind-tools > /dev/null 2>&1

    echo "=== Internal Resolution ==="
    dig app.example.com +short
    echo ""
    dig api.example.com +short
'

# Test from outside the cluster
dig @8.8.8.8 app.example.com +short

# Compare the results - they should be different
echo "Internal pods should see 10.96.x.x addresses"
echo "External queries should see 203.0.113.x addresses"
```

## Handling TLS Certificates

One challenge with split-horizon DNS is TLS certificate validation. The certificate for `app.example.com` must be valid regardless of which IP the client connects to. If you are using cert-manager on your Talos cluster, the DNS-01 challenge type works best because it does not depend on which IP the domain resolves to:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
  namespace: production
spec:
  secretName: app-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - app.example.com
  - api.example.com
```

## Monitoring Split-Horizon DNS

Add monitoring to make sure both internal and external resolution are working:

```yaml
# Blackbox exporter probes for DNS
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata:
  name: internal-dns-probe
  namespace: monitoring
spec:
  interval: 30s
  module: dns_internal
  targets:
    staticConfig:
      static:
      - app.example.com
      - api.example.com
  prober:
    url: blackbox-exporter.monitoring:9115
```

## Wrapping Up

Split-horizon DNS on Talos Linux keeps your internal traffic internal while presenting a clean single-domain experience to both internal and external users. Start with the simple hosts plugin for a handful of records, and graduate to zone files or automated ConfigMap generation as your needs grow. The key is making sure your monitoring covers both the internal and external resolution paths so you catch issues before your users do.
