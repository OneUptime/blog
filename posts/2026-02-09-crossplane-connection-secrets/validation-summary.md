# Validation Summary: How to Configure Crossplane Connection Secrets Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane managed resources and connection details
- Crossplane Compositions and Function Patch and Transform
- Kubernetes Secrets, RBAC, Deployments, and kubectl
- Upbound AWS provider resources for RDS, EC2, S3, and ElastiCache
- Crossplane External Secret Stores
- Prometheus alerting rules

## Sources Consulted
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane connection details composition guide: https://docs.crossplane.io/master/guides/connection-details-composition/
- Crossplane v1.20 connection details documentation: https://docs.crossplane.io/v1.20/concepts/connection-details/
- Crossplane external secret stores / Vault guide: https://docs.crossplane.io/v1.20/guides/vault-as-secret-store/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Upbound AWS RDS Instance marketplace reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v0.47.0/resources/rds.aws.upbound.io/Instance/v1beta1
- Upbound AWS ElastiCache Cluster API reference: https://pkg.go.dev/github.com/upbound/provider-aws/apis/elasticache/v1beta1

## Issues Found
- The post described S3 buckets as generating access keys. Updated the introduction to use IAM access keys as the credential-generating example and describe RDS as exposing connection details instead of full connection strings.
- The standalone managed resource explanation implied Crossplane always writes connection secrets. Updated it to state that a connection secret target must be configured.
- The key customization section used non-existent `ConnectionDetailsConfig` and `writeConnectionDetailsToConfigRef` APIs. Replaced it with the supported Composition `connectionDetails` mapping pattern.
- Several Composition snippets used legacy resource-mode structure and omitted `mode: Pipeline`, `function-patch-and-transform`, and per-resource `writeConnectionSecretToRef` settings required for aggregation. Updated the snippets to current pipeline-mode examples.
- Several `connectionDetails` entries omitted explicit `type` fields. Added `FromConnectionSecretKey`, `FromFieldPath`, and `FromValue` types to match the documented API.
- The Redis example used the wrong API group and secret-key names that were not supported by the referenced resource. Updated it to `elasticache.aws.upbound.io/v1beta1` and used observed `cacheNodes` field paths.
- The transform section showed unsupported transforms directly on `connectionDetails`. Rewrote it to explain that Function Patch and Transform can select, rename, and add static values, but does not transform values read from a composed resource connection secret.
- The RBAC example combined `resourceNames` with `list` and `watch`, which only works for list/watch requests that include a matching `metadata.name` field selector. Changed the example to `get` for direct secret reads.
- The rotation section claimed that updating the input password secret automatically changes the RDS password and reflected secret. Qualified the behavior as provider/resource-dependent and directed readers to check conditions and provider docs.
- The external secrets section used External Secrets Operator in the wrong direction and included an unsupported sync annotation. Replaced it with Crossplane External Secret Stores using `StoreConfig` and `publishConnectionDetailsTo`, noting the alpha/provider-dependent nature.
- The cleanup section used a non-existent `crossplane.io/connection-secret-deletion-policy` annotation. Replaced it with the supported `deletionPolicy` behavior for external resources and clarified that it does not control connection-secret deletion.

## Review Notes
- The managed resource examples use cluster-scoped Upbound AWS API groups. Crossplane v2 also has namespaced managed resource API groups such as `rds.aws.m.upbound.io`; readers should align examples with the provider package and Crossplane version installed in their control plane.
