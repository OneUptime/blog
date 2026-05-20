# Validation Summary: How to Deploy MongoDB Community Operator with ArgoCD

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- MongoDB Community Operator (Kubernetes)
- MongoDBCommunity CRD (`mongodbcommunity.mongodb.com/v1`)
- ArgoCD (`argoproj.io/v1alpha1` Application)
- Helm (community-operator chart)
- External Secrets Operator (`external-secrets.io/v1beta1`)
- Kubernetes StatefulSet overrides and PVC templates
- MongoDB replica sets, SCRAM authentication

## Sources Consulted
- MongoDB Community Operator repository: https://github.com/mongodb/mongodb-kubernetes-operator
- MongoDB Helm Charts index: https://mongodb.github.io/helm-charts/index.yaml
- community-operator chart values: https://github.com/mongodb/helm-charts/tree/main/charts/community-operator
- MongoDBCommunity CRD: `config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml`
- MongoDB Community Operator user docs: `docs/users.md`, `docs/deploy-configure.md`
- Sample CRs: `config/samples/mongodb.com_v1_mongodbcommunity_*.yaml`
- Operator source for label/volume defaults: `controllers/construct/mongodbstatefulset.go`, `api/v1/mongodbcommunity_types.go`
- ArgoCD custom health check docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- External Secrets Operator docs: https://external-secrets.io/

## Issues Found
- **ConfigMap vs Secret for connection string**: The post stated, "The operator creates a ConfigMap with the connection string that your applications can reference." This is incorrect — the MongoDB Community Operator creates a **Secret** (named `<resource-name>-<db>-<user>`) that holds both the connection strings (`connectionString.standard` and `connectionString.standardSrv`) and the user credentials. Fixed in the post to reference a Secret with the correct naming pattern.

## Review Notes
- The `community-operator` Helm chart at `https://mongodb.github.io/helm-charts` was verified; version `0.10.0` is a real published version (current latest is `0.13.0`). The chart's `operator.watchNamespace` and `operator.resources` keys used in the values block match the chart's `values.yaml`.
- The MongoDBCommunity CRD fields used (`members`, `type`, `version`, `security.authentication.modes`, `users[]` with `passwordSecretRef`/`roles`/`scramCredentialsSecretName`, `additionalMongodConfig`, `statefulSet`) all match the upstream CRD spec.
- `additionalMongodConfig` accepts both dotted and nested notation per the upstream sample, so the dot notation used in the post is valid.
- The default PVC template names `data-volume` and `logs-volume` match the operator's `DataVolumeName()`/`LogsVolumeName()` implementations.
- The pod label `app: <resource-name>-svc` used in the `podAntiAffinity` matches the label the operator applies to pods (`app: <ServiceName>` where `ServiceName` is `<resource-name>-svc`).
- The replica set connection string format (`<rs>-<i>.<rs>-svc.<ns>.svc.cluster.local:27017`) matches the format documented by MongoDB and the secret the operator generates.
- The ArgoCD `argocd-cm` custom health check key format (`resource.customizations.health.<group>_<kind>`) and the Lua script structure are valid; `obj.status.phase` and `obj.status.currentStatefulSetReplicas` are real fields on the MongoDBCommunity status.
- MongoDB versions referenced (`7.0.14`, `8.0.0`) are real released versions.
- `external-secrets.io/v1beta1` is still a supported API version (newer `v1` also exists but v1beta1 has not been removed).
- Minor caveat: chart `0.10.0` is reasonably old at validation time; readers may want to use a newer version (e.g., `0.13.0`) for new deployments, but the documented behavior is unchanged in the post's scope.
