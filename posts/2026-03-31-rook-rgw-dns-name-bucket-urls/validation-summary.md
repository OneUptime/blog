# Validation Summary: How to Configure rgw_dns_name for RGW Bucket URLs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3-compatible object storage
- Kubernetes Ingress (networking.k8s.io/v1)
- DNS wildcard configuration
- AWS CLI

## Sources Consulted
- Ceph official documentation on RGW configuration options (`rgw_dns_name`): https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph source code for `rgw_dns_name` parsing behavior (supports multiple space-separated values)
- Kubernetes Ingress specification for wildcard host rules: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Rook documentation on Ceph config overrides via ConfigMap: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/

## Issues Found
1. **Line 39: Incorrect `/etc/hosts` reference in comment** — The comment stated "`/etc/hosts` or DNS zone entry for testing" but the syntax shown (`*.s3.example.com IN A 10.0.0.100`) is DNS zone file format. `/etc/hosts` does not support wildcard entries. Fixed the comment to clarify that wildcards are not supported in `/etc/hosts`.

## Review Notes
- The `ceph config` commands use `client.rgw` as the daemon type, which is correct for global RGW settings.
- The Rook `rook-config-override` ConfigMap approach with section `[client.rgw.my-store.a]` is a valid way to apply per-daemon configuration overrides.
- The claim that `rgw_dns_name` supports multiple space-separated DNS names is correct — the Ceph RGW source code splits this value to allow multiple hostnames.
- The Kubernetes Ingress YAML is well-structured and correct for `networking.k8s.io/v1`, including both the wildcard and base domain host rules needed for virtual-hosted-style and path-style access.
- The AWS CLI testing examples are functional, though in practice most S3 clients handle virtual-hosted-style routing automatically when configured with the base endpoint URL.
