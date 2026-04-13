# Validation Summary: How to Use the MongoDB Community Operator on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Kubernetes
- MongoDB Community Operator (mongodb-kubernetes-operator)
- Helm 3
- MongoDBCommunity Custom Resource Definition (CRD)
- SCRAM authentication
- TLS/SSL
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Community Kubernetes Operator GitHub repository (https://github.com/mongodb/mongodb-kubernetes-operator)
- MongoDBCommunity CRD definition (https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml)
- MongoDB Community Operator deploy/configure docs (https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/deploy-configure.md)
- MongoDB Community Operator TLS/security docs (https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/secure.md)
- MongoDB Community Operator user management docs (https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/users.md)
- MongoDB Helm Charts repository (https://github.com/mongodb/helm-charts)

## Issues Found
1. **TLS CA certificate field name was incorrect.** The post used `caCertificateSecretRef` (which implies a Secret) but the MongoDB Community Operator CRD uses `caConfigMapRef` (which references a ConfigMap). Changed `caCertificateSecretRef` to `caConfigMapRef`.
2. **Missing CA ConfigMap creation command.** The post only showed creating the TLS secret for the server certificate/key but did not show how to create the CA certificate ConfigMap that `caConfigMapRef` references. Added the `kubectl create configmap mongodb-ca-cert --from-file=ca.crt` command.

## Review Notes
- All other technical details verified as correct: Helm repo URL, chart name, CRD apiVersion, spec fields (members, type, version, security, users, additionalMongodConfig, statefulSet overrides), connection string secret naming convention (`{resource-name}-{user}-{db}`), container name (`mongod`), and volume claim template name (`data-volume`).
- The `operator.watchNamespace="*"` Helm value for cluster-wide scope is correct.
- The JavaScript example defines `main()` but does not call it. This is a common tutorial pattern and not a technical error.
- The Kubernetes version prerequisite of 1.21+ is reasonable, though the operator's latest releases may require newer versions. Users should check the operator's compatibility matrix for their specific version.
