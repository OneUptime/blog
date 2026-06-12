# Validation Summary: How to Configure MinIO Multi-Tenancy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MinIO / AIStor object storage
- MinIO Client (`mc`)
- S3-compatible IAM policy documents
- OpenID Connect authentication
- Kubernetes StatefulSets, Services, NetworkPolicies, Secrets, and ResourceQuotas
- Bash scripting

## Sources Consulted
- MinIO AIStor `mc admin user add` documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-user/mc-admin-user-add/
- MinIO AIStor `mc admin accesskey create` documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-accesskey/mc-admin-accesskey-create/
- MinIO AIStor bucket quota documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-bucket-quota/
- MinIO AIStor policy-based access control documentation: https://docs.min.io/aistor/administration/iam/access/
- MinIO AIStor OpenID Connect access management documentation: https://docs.min.io/aistor/administration/iam/access/oidc-access/
- MinIO AIStor `mc idp openid` documentation: https://docs.min.io/aistor/reference/cli/mc-idp-openid/
- MinIO AIStor QoS rule documentation: https://docs.min.io/aistor/reference/cli/mc-qos-rule/mc-qos-rule-add/
- MinIO AIStor audit webhook settings documentation: https://docs.min.io/aistor/reference/aistor-server/settings/metrics-and-logging/webhook-audit-logs/
- Kubernetes API documentation for StatefulSet, Service, Secret, NetworkPolicy, and ResourceQuota: https://kubernetes.io/docs/reference/kubernetes-api/

## Issues Found
- The bucket quota examples used deprecated/incorrect `mc quota` syntax. Updated them to the documented `mc admin bucket quota ALIAS/BUCKET --hard SIZE`, status, and `--clear` forms.
- The setup script used the same outdated quota syntax. Updated it to use `mc admin bucket quota`.
- The service account examples used `mc admin user svcacct add`, while current MinIO documentation uses `mc admin accesskey create` for user-linked access keys. Updated both the examples and setup script.
- The rate-limit example used an undocumented `mc admin user ratelimit set` command. Replaced it with documented bucket/prefix QoS syntax using `mc qos rule add`.
- The group admin policy included `admin:DeleteServiceAccount`, which is not a documented action, and attempted to scope admin IAM permissions with `arn:minio:iam:::user/tenant-alpha-*`, which is not supported by the cited policy docs. Removed that invalid admin statement while keeping group-based S3 access control.
- The OIDC example used generic `mc admin config set identity_openid` snippets and a separate claim-userinfo update that did not actually map groups to policies. Updated it to use the current `mc idp openid add` command with `role_policy`, and clarified the shape of a claim-based policy mapping.
- Quoted the sample password containing `!` in the shell command to avoid interactive shell history expansion issues.

## Review Notes
- The Kubernetes YAML is structurally valid for the referenced Kubernetes resource kinds, but the MinIO StatefulSet is a simple single-pod example and not a production distributed MinIO topology.
- The OIDC section remains a high-level example. Exact claim names and scopes depend on the identity provider configuration.
