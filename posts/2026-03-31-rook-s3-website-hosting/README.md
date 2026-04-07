# How to Set Up S3 Website Hosting with Rook Object Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Object Store, S3, Website

Description: Learn how to enable and configure S3 static website hosting with Rook Ceph object store to serve HTML files directly from buckets.

---

## What Is S3 Website Hosting

S3 website hosting allows you to serve static content - HTML, CSS, JavaScript, and assets - directly from a bucket through a web-friendly URL, without requiring signed requests. Ceph RGW supports the same S3 website APIs as AWS, meaning you can configure index documents, error documents, and redirect rules. With Rook, this feature is enabled via `rgwCommandFlags` and accessed via a dedicated website DNS endpoint configured with `rgw_dns_s3website_name`.

## Enabling Website Hosting in Rook

First, enable the static website feature in the `CephObjectStore`:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    instances: 1
    rgwCommandFlags:
      rgw_enable_static_website: "true"
      rgw_dns_s3website_name: "s3-website.example.com"
```

The `rgw_enable_static_website` flag enables the S3 website configuration APIs (PutBucketWebsite, GetBucketWebsite, DeleteBucketWebsite), and `rgw_dns_s3website_name` tells RGW the DNS domain to use for routing website requests. This domain must be different from the standard `rgw_dns_name`. After applying this, the RGW daemon will respond to website-style requests when accessed via the configured website hostname.

## Configuring the Bucket for Website Hosting

Use the AWS CLI to configure website settings on a bucket:

```bash
aws s3 website s3://my-site-bucket/ \
  --index-document index.html \
  --error-document error.html \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

Or use the S3 API directly with a JSON config:

```bash
aws s3api put-bucket-website \
  --bucket my-site-bucket \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "error.html"}
  }' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Making Objects Publicly Readable

Website hosting serves objects publicly. Set the bucket ACL and object ACLs accordingly:

```bash
aws s3api put-bucket-acl \
  --bucket my-site-bucket \
  --acl public-read \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

aws s3 sync ./public-site/ s3://my-site-bucket/ \
  --acl public-read \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Accessing the Website

The website endpoint URL format differs from the standard S3 API endpoint. For Ceph RGW, the website endpoint runs on the same RGW instance and port, but requests are routed by the hostname matching the `rgw_dns_s3website_name` pattern. The bucket name is prepended as a subdomain. Access your site via a browser or curl:

```bash
curl -H "Host: my-site-bucket.s3-website.example.com" \
  http://rook-ceph-rgw-my-store.rook-ceph.svc:80/
```

Here `my-site-bucket.s3-website.example.com` matches the `rgw_dns_s3website_name` pattern configured earlier. You can expose this via an Ingress that routes based on the site hostname to the RGW service, with DNS records pointing `*.s3-website.example.com` to the Ingress.

## Configuring Redirect Rules

For single-page applications, redirect all 404s back to index.html:

```bash
aws s3api put-bucket-website \
  --bucket my-site-bucket \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "RoutingRules": [
      {
        "Condition": {"HttpErrorCodeReturnedEquals": "404"},
        "Redirect": {"ReplaceKeyWith": "index.html"}
      }
    ]
  }' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Summary

S3 website hosting on Rook requires enabling `rgw_enable_static_website` and setting `rgw_dns_s3website_name` via `rgwCommandFlags`, then configuring individual buckets with index and error documents via the standard S3 website API. Combined with public-read ACLs and an Ingress for external access, this turns a Rook object store bucket into a fully functional static site host.
