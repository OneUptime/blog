# Validation Summary: How to Configure PostgreSQL Clusters with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- CloudNativePG
- PostgreSQL
- PgBouncer
- Kubernetes CustomResourceDefinitions

## Sources Consulted
- CloudNativePG 1.29 API Reference: https://cloudnative-pg.io/docs/1.29/cloudnative-pg.v1/
- CloudNativePG 1.29 Service management: https://cloudnative-pg.io/docs/1.29/service_management/
- CloudNativePG 1.29 Connection Pooling: https://cloudnative-pg.io/docs/1.29/connection_pooling/
- CloudNativePG 1.29 PostgreSQL Role management: https://cloudnative-pg.io/docs/1.29/declarative_role_management/
- CloudNativePG 1.29 Rolling updates: https://cloudnative-pg.io/docs/1.29/rolling_update/
- CloudNativePG 1.29 Labels and Annotations: https://cloudnative-pg.io/docs/1.29/labels_annotations/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux getting started CLI examples: https://fluxcd.io/flux/get-started/
- Kubernetes API patch concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- PostgreSQL release notes: https://www.postgresql.org/docs/release/

## Issues Found
- The CloudNativePG cluster example used `kubectl.kubernetes.io/last-applied-configuration` as a restart trigger. That annotation is not a CloudNativePG rolling restart mechanism, so it was removed.
- The PostgreSQL image tag used `16.3`, which is outdated for PostgreSQL 16 as of the validation date. Updated it to `16.13`, the current PostgreSQL 16 minor release listed by PostgreSQL release notes.
- The `managed.services.additional` example omitted the required `serviceTemplate` and service names. Added valid `serviceTemplate.metadata.name` and `spec.type` examples for read-write and read-only LoadBalancer services.
- The post described `managed.services` as PgBouncer connection pooling. CloudNativePG provides PgBouncer through the `Pooler` CRD, so the service comment was corrected and a valid `Pooler` manifest was added.
- The CloudNativePG cluster example used deprecated automatic `monitoring.enablePodMonitor`. Removed the deprecated field from the example.
- The Kustomize section described the patch as a strategic merge patch. Strategic merge patch is not supported by Kubernetes for CRD-defined APIs, so the wording was changed to "Kustomize patches."
- The user-management example showed a duplicate `Cluster` resource in a separate `users.yaml` and used bootstrap SQL for day-2 user management. Replaced it with CloudNativePG `.spec.managed.roles` plus a `kubernetes.io/basic-auth` Secret, matching current declarative role management.
- The repository layout still described `users.yaml` as user grants and did not list the PgBouncer pooler manifest. Updated the comments to match the corrected examples.

## Review Notes
- The remaining examples are CloudNativePG-focused even though the introduction mentions other PostgreSQL operators. That is acceptable because the post explicitly provides a CloudNativePG example, but a future post could add operator-specific notes for Zalando, CrunchyData PGO, and Percona.
- Object-level grants such as `GRANT SELECT ON ALL TABLES` are not fully handled by CloudNativePG declarative role management; they should be handled with bootstrap SQL for initial setup or a database migration tool for ongoing changes.
