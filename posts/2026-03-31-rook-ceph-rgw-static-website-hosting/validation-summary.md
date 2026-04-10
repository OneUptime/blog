# Validation Summary: How to Use Ceph RGW for Static Website Hosting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook-Ceph (Kubernetes operator for Ceph)
- AWS CLI (S3-compatible commands)
- S3 static website hosting
- Kubernetes Ingress (nginx ingress controller)
- S3 bucket policies and ACLs

## Sources Consulted
- AWS CLI v2 `s3 website` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/website.html
- AWS CLI v2 `s3api put-bucket-website` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-website.html
- AWS CLI v2 `s3api put-bucket-acl` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-acl.html
- AWS CLI v2 `s3api put-bucket-policy` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-policy.html
- AWS CLI v2 `s3 cp` and `s3 sync` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Ceph RGW S3 static website documentation: https://docs.ceph.com/en/latest/radosgw/s3/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-v1/
- NGINX Ingress Controller annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#rewrite

## Issues Found

### 1. Missing `use-regex` annotation on Kubernetes Ingress
- **What was wrong:** The Ingress resource used regex capture groups in the path (`/()(.*)`), and referenced `$2` in the `rewrite-target` annotation, but was missing the required `nginx.ingress.kubernetes.io/use-regex: "true"` annotation. Without this annotation, the nginx ingress controller treats the path as a literal string rather than a regex, so the capture groups and rewrite-target substitution would not work.
- **What was changed:** Added `nginx.ingress.kubernetes.io/use-regex: "true"` to the Ingress annotations.
- **Why:** The nginx ingress controller requires explicit opt-in to regex path matching via this annotation.

### 2. Incorrect `pathType` for regex path in Ingress
- **What was wrong:** The Ingress used `pathType: Prefix` with a regex path pattern. Regex paths are not part of the standard Kubernetes Ingress spec -- `Prefix` and `Exact` pathTypes expect literal path strings.
- **What was changed:** Changed `pathType: Prefix` to `pathType: ImplementationSpecific`.
- **Why:** When using regex patterns with the nginx ingress controller, `ImplementationSpecific` is the correct pathType, as regex path interpretation is an implementation-specific behavior of the nginx controller, not part of the standard Kubernetes Ingress specification.

## Review Notes
- The post does not mention that Ceph RGW may need `rgw_enable_static_website = true` in the Ceph configuration for the static website hosting feature to work. Users following this tutorial should ensure this option is enabled in their Ceph cluster configuration.
- The Ingress rewrite approach maps requests to path-style object access (`/bucket-name/object-key`). For the S3 static website features (like automatic index.html serving for directory paths) to work, RGW typically needs virtual-host-style access. The Ingress configuration shown will work for direct object retrieval but may not trigger index document behavior for subdirectory paths. Users may need to adjust their RGW or Ingress configuration accordingly.
- All AWS CLI commands use correct syntax and flags. The `--endpoint-url` global option is properly used throughout for pointing to the Ceph RGW endpoint.
- The bucket policy JSON structure is correct and follows standard S3 policy format.
