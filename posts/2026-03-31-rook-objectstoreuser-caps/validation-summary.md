# Validation Summary: How to Set Up CephObjectStoreUser with Capability Grants in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RADOS Gateway (RGW)
- Kubernetes CRDs (CephObjectStoreUser)
- S3-compatible object storage
- radosgw-admin CLI
- Kubernetes Secrets and Deployments

## Sources Consulted
- Rook CephObjectStoreUser CRD source code (`pkg/apis/ceph.rook.io/v1/types.go` in github.com/rook/rook) — verified `ObjectUserCapSpec` fields, `ObjectUserQuotaSpec` fields, and kubebuilder validation enums
- Rook object store user controller source (`pkg/operator/ceph/object/user/controller.go` in github.com/rook/rook) — verified secret naming convention (`rook-ceph-object-user-<store>-<username>`) and secret key names (`AccessKey`, `SecretKey`, `Endpoint`)
- Rook official documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/) — verified CRD examples and capability usage
- Ceph radosgw-admin documentation (https://docs.ceph.com/en/latest/radosgw/admin/) — verified CLI command syntax and capability name conventions (plural forms: `users`, `buckets`)
- Rook toolbox deployment YAML (`deploy/examples/toolbox.yaml` in github.com/rook/rook) — verified `deploy/rook-ceph-tools` is the correct resource reference

## Issues Found
No technical issues found. All code examples, YAML configurations, CLI commands, and technical explanations are accurate.

## Review Notes
- The CRD actually supports 16 capability keys (including `roles`, `info`, `amz-cache`, `bilog`, `mdlog`, `datalog`, `user-policy`, `oidc-provider`, `ratelimit`), but the blog only documents the 5 most commonly used ones (`user`, `bucket`, `usage`, `metadata`, `zone`). This is a reasonable editorial choice for a focused tutorial, not an error.
- The CRD accepts both singular (`user`, `bucket`) and plural (`users`, `buckets`) forms for capability field names. The blog consistently uses singular forms in the YAML, which is valid. The Mermaid diagram uses plural forms in its labels, which is a minor stylistic inconsistency but not technically incorrect since both are valid.
- The `radosgw-admin caps add` command correctly uses the plural Ceph capability names (`buckets=*;users=read`), which is the native format for the CLI (distinct from the CRD field names). This is correct.
- The generated secret also includes an optional `SSLCertSecretName` key when TLS is configured, which the blog does not mention. This is a reasonable omission for a general tutorial.
