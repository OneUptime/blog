# How to Configure Hosting Settings (advertiseEndpoint, dnsNames) in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Object Storage, DNS

Description: Learn how to configure advertiseEndpoint and dnsNames in Rook object store hosting settings for proper DNS resolution and multisite endpoint advertisement.

---

## What Hosting Settings Control

The `hosting` section of the `CephObjectStore` spec controls how the RGW advertises itself to clients and to other zones in a multisite setup. Two key fields:

- `advertiseEndpoint` - the publicly reachable address RGW uses when registering itself with the Ceph zone configuration
- `dnsNames` - additional DNS names for which RGW serves requests, used for virtual host-style bucket access

Without correct hosting settings, DNS-based bucket routing fails and multisite peers cannot find the right endpoint.

## Configuring advertiseEndpoint

The `advertiseEndpoint` tells Rook what address to register in the Ceph zone's endpoint list. This is what remote RGW instances and clients use to connect:

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
      dnsName: s3.mycompany.com
      port: 80
      useTls: false
```

After applying, Rook updates the Ceph zone configuration with this endpoint. Verify:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- radosgw-admin zone get | grep endpoints
```

## Configuring dnsNames for Virtual-Host-Style Access

Virtual host-style S3 access routes bucket names as subdomains: `bucket-name.s3.mycompany.com`. RGW needs to know all DNS names it should accept to properly route these requests:

```yaml
gateway:
  port: 80
  instances: 2
hosting:
  advertiseEndpoint:
    dnsName: s3.mycompany.com
    port: 80
    useTls: false
  dnsNames:
    - s3.mycompany.com
    - s3-internal.cluster.local
    - rgw.datacenter1.mycompany.com
```

RGW accepts connections for all listed DNS names and strips the bucket name from the subdomain.

## TLS with advertiseEndpoint

For HTTPS, set `useTls: true` and configure the `securePort`:

```yaml
gateway:
  port: 80
  securePort: 443
  sslCertificateRef: rgw-tls-secret
hosting:
  advertiseEndpoint:
    dnsName: s3.mycompany.com
    port: 443
    useTls: true
  dnsNames:
    - s3.mycompany.com
```

The TLS certificate in `rgw-tls-secret` must include `s3.mycompany.com` and ideally `*.s3.mycompany.com` as SANs for virtual-host-style bucket access.

## Verifying the Configuration

Check the zone endpoints after applying:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# View registered endpoints
radosgw-admin zone get --rgw-zone default | python3 -m json.tool | grep -A5 endpoints

# Verify RGW is accepting requests on the configured hostname
curl -H "Host: s3.mycompany.com" http://<cluster-ip>:80/
```

## Testing Virtual-Host-Style Access

Create a bucket and access it using the subdomain pattern:

```bash
aws s3 mb s3://my-test-bucket \
  --endpoint-url https://s3.mycompany.com

# Access via virtual-host style
curl https://my-test-bucket.s3.mycompany.com/
```

## Summary

The `hosting` settings in Rook's CephObjectStore spec control the advertised endpoint for multisite peering and the DNS names accepted for virtual-host-style bucket access. Set `advertiseEndpoint.dnsName` to the externally reachable address and populate `dnsNames` with all DNS aliases the gateway should respond to. Enable `useTls: true` when using HTTPS. These settings allow proper bucket URL routing and multisite zone discovery.
