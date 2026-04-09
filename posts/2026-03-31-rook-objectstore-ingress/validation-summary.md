# Validation Summary: How to Configure Object Store Ingress in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway)
- Kubernetes Ingress (networking.k8s.io/v1)
- nginx ingress controller
- cert-manager
- AWS CLI (S3-compatible endpoint configuration)
- TLS/SSL termination

## Sources Consulted
- Rook official documentation on CephObjectStore and Ingress: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Kubernetes Ingress API reference (networking.k8s.io/v1): https://kubernetes.io/docs/concepts/services-networking/ingress/
- nginx ingress controller annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- AWS CLI v2 S3 configuration reference: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html

## Issues Found
No technical issues found.

## Review Notes
- The `nginx.ingress.kubernetes.io/configuration-snippet` annotation used in the TLS example is disabled by default in nginx ingress controller v1.9.0+ (the `allow-snippet-annotations` option defaults to `false` for security reasons). Users may need to explicitly enable it in their ingress controller configuration. This is not an error in the post but is worth noting for readers using newer versions.
- The `aws configure set default.s3.endpoint_url` command is specific to AWS CLI v2 (introduced in v2.13.0+). Users on AWS CLI v1 would need to use the `--endpoint-url` flag per command instead, which the post also shows.
- The URL examples in the "Path-Style vs Virtual-Hosted Style" section use `yaml` code fences for plain URLs, which is a minor formatting choice but does not affect technical accuracy.
