# Validation Summary: How to Use Kubernetes Operators from OperatorHub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Operators
- OperatorHub.io
- Operator Lifecycle Manager (OLM)
- OperatorGroup, Subscription, InstallPlan, ClusterServiceVersion, and CatalogSource resources
- Crunchy Postgres for Kubernetes / PostgresCluster CRD
- Prometheus Operator
- cert-manager
- Operator SDK

## Sources Consulted
- OLM QuickStart documentation: https://olm.operatorframework.io/docs/getting-started/
- OLM CatalogSource documentation: https://olm.operatorframework.io/docs/concepts/crds/catalogsource/
- OLM GitHub releases: https://github.com/operator-framework/operator-lifecycle-manager/releases
- OperatorHub community operators repository: https://github.com/k8s-operatorhub/community-operators
- OperatorHub PostgreSQL install manifest: https://operatorhub.io/install/postgresql.yaml
- Crunchy Postgres for Kubernetes PostgresCluster CRD reference: https://access.crunchydata.com/documentation/postgres-operator/latest/references/crd/5.0.x/postgrescluster
- Crunchy Postgres for Kubernetes components and compatibility reference: https://access.crunchydata.com/documentation/postgres-operator/latest/references/components
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- cert-manager OLM installation documentation: https://cert-manager.io/v1.9-docs/installation/operator-lifecycle-manager/
- Operator SDK installation documentation: https://sdk.operatorframework.io/docs/installation/

## Issues Found
- The OLM installation example used `v0.27.0`, which is stale. Updated it to the current documented release command for `v0.45.0`.
- The PostgreSQL operator examples used `postgresql.v5.4.0` as a ClusterServiceVersion name, but the current OperatorHub Crunchy package uses CSV names such as `postgresoperator.v5.8.4`. Updated `startingCSV`, expected output, and uninstall commands accordingly.
- The PostgreSQL cluster example used `postgresVersion: 15`, while the current OperatorHub Crunchy bundle defaults provide related images for newer supported majors. Updated the example to `postgresVersion: 17`.
- The PostgreSQL workflow applied resources into `production` and targeted `staging` without creating those namespaces. Added Namespace manifests for both.
- The Prometheus Operator example subscribed in an `operators` namespace but created the Prometheus resource in `monitoring`, without creating the namespace or an OperatorGroup. Updated the example to create `monitoring`, add an OperatorGroup, and place the Subscription there.
- The Prometheus resource specified `serviceAccountName: prometheus` without creating that ServiceAccount. Removed the field so the example does not depend on an undeclared resource.
- The cert-manager example subscribed in `cert-manager` without creating the namespace or required OperatorGroup. Added a Namespace and all-namespaces OperatorGroup, matching cert-manager's OperatorHub install mode.

## Review Notes
- All YAML snippets were parsed successfully after the edits.
- The cert-manager OLM installation path exists in OperatorHub, but the upstream cert-manager OLM packaging documentation is older and the OperatorHub listing marks the package as deprecated. For new production documentation, the cert-manager maintainers' current non-OLM installation method may be preferable.
