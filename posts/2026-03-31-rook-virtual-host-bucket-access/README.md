# How to Enable Virtual Host-Style Bucket Access in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, S3, Object Storage

Description: Learn how to enable virtual host-style bucket access in Rook so clients can use subdomain-based S3 URLs like bucket-name.s3.example.com.

---

## Path-Style vs Virtual Host-Style S3 Access

S3-compatible object stores support two URL formats:

- Path-style: `http://s3.example.com/bucket-name/object-key`
- Virtual host-style: `http://bucket-name.s3.example.com/object-key`

AWS deprecated path-style access for new buckets in 2020, and many modern S3 clients and SDKs default to virtual host-style. Enabling this in Rook requires DNS wildcard configuration and RGW hostname settings.

## DNS Requirements

For virtual host-style to work, DNS must resolve `*.s3.example.com` (wildcard) to the RGW endpoint. Configure this in your DNS server:

```text
s3.example.com        A    <RGW IP or Load Balancer IP>
*.s3.example.com      A    <RGW IP or Load Balancer IP>
```

With a wildcard entry, `mybucket.s3.example.com` automatically resolves to the RGW endpoint.

## Configuring Rook for Virtual Host-Style Access

Set the `dnsNames` and `advertiseEndpoint` in the `hosting` section of the CephObjectStore spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
  hosting:
    advertiseEndpoint:
      dnsName: s3.example.com
      port: 80
      useTls: false
    dnsNames:
      - s3.example.com
```

This tells RGW to accept requests coming in on `s3.example.com` and route virtual host-style requests by extracting the bucket name from the subdomain.

## Enabling in RGW Configuration

RGW has a configuration option to explicitly allow virtual-hosted buckets. Apply this via the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

ceph config set client.rgw rgw_dns_name s3.example.com
ceph config set client.rgw rgw_resolve_cname true
```

Restart RGW pods to apply:

```bash
kubectl -n rook-ceph rollout restart deployment -l app=rook-ceph-rgw
```

## TLS with Wildcard Certificates

For HTTPS virtual host-style access, your TLS certificate must include a wildcard SAN:

```text
Subject Alternative Names:
  DNS: s3.example.com
  DNS: *.s3.example.com
```

Create the secret:

```bash
kubectl -n rook-ceph create secret tls rgw-wildcard-tls \
  --cert=/path/to/wildcard-cert.pem \
  --key=/path/to/wildcard-key.pem
```

Reference it in the object store:

```yaml
gateway:
  securePort: 443
  sslCertificateRef: rgw-wildcard-tls
hosting:
  advertiseEndpoint:
    dnsName: s3.example.com
    port: 443
    useTls: true
  dnsNames:
    - s3.example.com
```

## Testing Virtual Host-Style Access

Create a bucket and access it using the subdomain format:

```bash
aws s3 mb s3://my-test-bucket \
  --endpoint-url http://s3.example.com

# Virtual host-style access
aws s3 ls s3://my-test-bucket \
  --endpoint-url http://s3.example.com

# Direct URL test
curl http://my-test-bucket.s3.example.com/
```

## Summary

Enabling virtual host-style bucket access in Rook requires DNS wildcard configuration pointing to the RGW endpoint, setting `dnsNames` in the `CephObjectStore` hosting spec, and configuring `rgw_dns_name` in the Ceph config. For HTTPS, a wildcard TLS certificate covering `*.s3.example.com` is required. Once configured, clients can use `bucket-name.s3.example.com` URLs, which is the modern default for S3-compatible SDKs.
