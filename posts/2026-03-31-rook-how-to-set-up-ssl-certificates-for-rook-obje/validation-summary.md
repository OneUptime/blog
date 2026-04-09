# Validation Summary: How to Set Up SSL Certificates for Rook Object Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph Operator for Kubernetes)
- Ceph RGW (RADOS Gateway / Object Store)
- Kubernetes Secrets (TLS and generic)
- cert-manager (cert-manager.io/v1 API)
- OpenSSL (self-signed certificate generation)
- AWS CLI (S3-compatible client configuration)
- kubectl CLI

## Sources Consulted
- Rook official CephObjectStore CRD source code (`pkg/apis/ceph.rook.io/v1/types.go`) — confirms `sslCertificateRef`, `securePort`, `port`, and `instances` field names
- Rook example manifests (`deploy/examples/object.yaml`) — confirms gateway SSL configuration pattern
- Rook RGW operator source (`pkg/operator/ceph/object/rgw.go`, `spec.go`) — confirms deployment naming convention `rook-ceph-rgw-<store-name>-a` and replica handling
- Rook controller watch logic (`pkg/operator/ceph/object/controller.go`) — confirms TLS secret changes are NOT automatically reconciled, validating the manual restart advice
- cert-manager API registration source (`pkg/apis/certmanager/v1/register.go`) — confirms `cert-manager.io/v1` is the current stable API version
- OpenSSL `req` command documentation — confirms `-addext` flag validity (available since OpenSSL 1.1.1)
- AWS Signature Version 4 specification — confirms `AWS4-HMAC-SHA256` as the correct algorithm identifier in Authorization headers
- kubectl documentation — confirms `--dry-run=client -o yaml | kubectl apply -f -` as a valid idempotent update pattern

## Issues Found
No technical issues found.

## Review Notes
- The `openssl req -addext` flag requires OpenSSL 1.1.1 or later (released September 2018). This is available on all modern systems but could be noted for users on very old distributions.
- Rook does NOT automatically detect changes to the TLS secret referenced by `sslCertificateRef`. The blog correctly advises manually restarting the RGW deployment after rotating certificates. This is important because while Kubernetes will eventually sync the secret volume contents to disk, RGW reads TLS certificates at startup and does not dynamically reload them.
- The RGW deployment naming convention `rook-ceph-rgw-my-store-a` is correct. Modern Rook versions create a single deployment (with the `-a` suffix) and use the `gateway.instances` value as the replica count, rather than creating multiple deployments.
- The `curl -H "Authorization: AWS4-HMAC-SHA256 ..."` example is illustrative only — a real request would need a fully formed Signature Version 4 Authorization header, which is non-trivial to construct manually. This is fine for a blog post example.
