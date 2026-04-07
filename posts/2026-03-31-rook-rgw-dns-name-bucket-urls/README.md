# How to Configure rgw_dns_name for RGW Bucket URLs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, DNS, Object Storage, S3

Description: Configure rgw_dns_name in Ceph RGW to enable path-style and virtual-hosted-style bucket URL access for S3-compatible clients.

---

S3 clients can access buckets using two URL styles: path-style (`http://s3.example.com/mybucket`) and virtual-hosted-style (`http://mybucket.s3.example.com`). Configuring `rgw_dns_name` enables both.

## What rgw_dns_name Does

`rgw_dns_name` tells RGW what the base DNS name is for the gateway. When set, RGW parses incoming `Host` headers to extract the bucket name from the subdomain for virtual-hosted-style requests.

```bash
# View current DNS name setting
ceph config get client.rgw rgw_dns_name
```

## Setting rgw_dns_name

```bash
# Set the base domain name
ceph config set client.rgw rgw_dns_name s3.example.com

# For a wildcard domain setup (DNS must also have *.s3.example.com)
ceph config set client.rgw rgw_dns_name "s3.example.com s3-internal.example.com"
```

Multiple space-separated names are supported to handle internal vs. external access.

## DNS Configuration Requirements

For virtual-hosted-style access to work, your DNS must resolve wildcard subdomains:

```bash
# DNS zone entry for testing (wildcards are not supported in /etc/hosts)
*.s3.example.com  IN  A  10.0.0.100
s3.example.com    IN  A  10.0.0.100
```

Or in a Kubernetes environment, configure an Ingress with wildcard support:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rgw-ingress
  namespace: rook-ceph
spec:
  rules:
  - host: "*.s3.example.com"
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rook-ceph-rgw-my-store
            port:
              number: 80
  - host: "s3.example.com"
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rook-ceph-rgw-my-store
            port:
              number: 80
```

## Applying in Rook via Config Override

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_dns_name = s3.example.com
```

Then restart RGW:

```bash
kubectl -n rook-ceph rollout restart deployment rook-ceph-rgw-my-store-a
```

## Testing Virtual-Hosted-Style Access

```bash
# Path-style access (always works)
aws s3 ls --endpoint-url http://s3.example.com s3://mybucket

# Virtual-hosted-style access
aws s3 ls --endpoint-url http://mybucket.s3.example.com s3://mybucket

# With curl
curl -H "Host: mybucket.s3.example.com" http://10.0.0.100/
```

## Summary

`rgw_dns_name` enables virtual-hosted-style S3 bucket URLs by telling RGW which domain name to parse for bucket extraction. Set it to your public domain, configure a wildcard DNS entry, and if using Kubernetes, set up an Ingress with wildcard host rules. Restart RGW pods after applying the configuration.
