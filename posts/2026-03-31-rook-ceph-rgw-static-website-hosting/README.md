# How to Use Ceph RGW for Static Website Hosting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Static Website, Object Storage, S3, Web Hosting

Description: Host static websites directly from Ceph RGW using S3-compatible static website hosting with index and error page configuration.

---

## Introduction

Ceph RGW supports S3 static website hosting, allowing you to serve HTML, CSS, JavaScript, and other static assets directly from object storage. This is useful for internal documentation portals, dashboards, or developer tools hosted entirely on your Kubernetes infrastructure.

## Configuring the Bucket for Website Hosting

Create a bucket and enable website hosting:

```bash
aws s3api create-bucket \
  --bucket my-static-site \
  --endpoint-url http://rook-ceph-rgw-store.rook-ceph:80

aws s3 website s3://my-static-site/ \
  --endpoint-url http://rook-ceph-rgw-store.rook-ceph:80 \
  --index-document index.html \
  --error-document error.html
```

Or use the XML API directly:

```bash
aws s3api put-bucket-website \
  --bucket my-static-site \
  --endpoint-url http://rook-ceph-rgw-store.rook-ceph:80 \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "error.html"}
  }'
```

## Making the Bucket Publicly Readable

```bash
aws s3api put-bucket-acl \
  --bucket my-static-site \
  --endpoint-url http://rook-ceph-rgw-store.rook-ceph:80 \
  --acl public-read
```

Or set a bucket policy:

```bash
aws s3api put-bucket-policy \
  --bucket my-static-site \
  --endpoint-url http://rook-ceph-rgw-store.rook-ceph:80 \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-static-site/*"
    }]
  }'
```

## Uploading Website Files

```bash
# Upload with correct content types
aws s3 cp ./dist/ s3://my-static-site/ \
  --endpoint-url http://rook-ceph-rgw-store.rook-ceph:80 \
  --recursive \
  --exclude "*.DS_Store"

# Set cache-control headers for assets
aws s3 cp ./dist/assets/ s3://my-static-site/assets/ \
  --endpoint-url http://rook-ceph-rgw-store.rook-ceph:80 \
  --recursive \
  --cache-control "max-age=31536000"
```

## Exposing via Kubernetes Ingress

Create an Ingress pointing to the RGW service to serve the static site with a friendly hostname:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: static-site-ingress
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /my-static-site/$2
spec:
  rules:
  - host: docs.internal.example.com
    http:
      paths:
      - path: /()(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: rook-ceph-rgw-store
            port:
              number: 80
```

## Automating Deployments

Use a CI pipeline to sync your build output:

```bash
#!/bin/bash
# deploy.sh
npm run build
aws s3 sync ./dist/ s3://my-static-site/ \
  --endpoint-url http://rook-ceph-rgw-store.rook-ceph:80 \
  --delete \
  --acl public-read
echo "Deployed successfully"
```

## Summary

Ceph RGW's static website hosting feature enables teams to serve HTML and JavaScript applications directly from S3-compatible object storage without a separate web server. By combining public bucket ACLs, index document configuration, and Kubernetes Ingress, you can host internal documentation sites or developer portals entirely within your on-premises Rook-Ceph cluster.
