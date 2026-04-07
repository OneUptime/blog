# Validation Summary: How to Set Up S3 Website Hosting with Rook Object Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway)
- S3 static website hosting API
- AWS CLI (s3 and s3api subcommands)
- Kubernetes CRDs (CephObjectStore)

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://github.com/rook/rook/blob/master/Documentation/CRDs/Object-Storage/ceph-object-store-crd.md
- Ceph RGW configuration reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph RGW static website hosting reference: https://gist.github.com/robbat2/ec0a66eed28e5f0e1ef7018e9c77910c
- AWS CLI `s3 website` and `s3api put-bucket-website` help documentation

## Issues Found

### 1. Missing `rgw_dns_s3website_name` configuration (Critical)
**What was wrong:** The CephObjectStore YAML only set `rgw_enable_static_website: "true"` but omitted the required `rgw_dns_s3website_name` setting. Without this, RGW cannot route incoming requests to the s3website handler because it has no DNS pattern to match against. The feature would not work as described.

**What was changed:** Added `rgw_dns_s3website_name: "s3-website.example.com"` to the `rgwCommandFlags` in the YAML example, and added an explanation of what both flags do and why they must differ from the standard `rgw_dns_name`.

### 2. Incomplete explanation of website endpoint routing
**What was wrong:** The "Accessing the Website" section stated requests are "routed by hostname pattern" but did not connect this to the `rgw_dns_s3website_name` configuration, making it unclear how the routing actually works.

**What was changed:** Updated the explanation to reference `rgw_dns_s3website_name`, explained how the bucket name is prepended as a subdomain, and added a note about wildcard DNS records for the Ingress.

### 3. Summary section incomplete
**What was wrong:** The summary only mentioned `rgw_enable_static_website` as the required config.

**What was changed:** Updated to mention both `rgw_enable_static_website` and `rgw_dns_s3website_name`.

## Review Notes
- The `aws s3 website` command syntax, `aws s3api put-bucket-website` JSON structure, ACL commands, and RoutingRules configuration are all correct and match the AWS S3 API (which Ceph RGW implements).
- The `rgwCommandFlags` field at `spec.gateway.rgwCommandFlags` is a valid Rook CephObjectStore CRD field and the map format used is correct.
- The `s3website` API is included in the default `rgw_enable_apis` list, so no explicit addition is needed for that setting in most deployments.
- For production use, operators should also consider bucket policies as an alternative to ACLs for public access, since ACLs are considered legacy in newer S3/Ceph versions.
