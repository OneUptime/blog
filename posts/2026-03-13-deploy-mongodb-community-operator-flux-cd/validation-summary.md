# Validation Summary: How to Deploy MongoDB Community Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- MongoDB Community Kubernetes Operator
- MongoDB Community Server
- cert-manager
- SCRAM authentication
- TLS

## Sources Consulted
- MongoDB Community Kubernetes Operator repository and documentation: https://github.com/mongodb/mongodb-kubernetes-operator
- MongoDB Community Operator install and upgrade documentation: https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/install-upgrade.md
- MongoDBCommunity resource deployment documentation: https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/deploy-configure.md
- MongoDB Community Operator user documentation: https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/users.md
- MongoDB Community Operator TLS documentation: https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/secure.md
- MongoDB Helm chart repository: https://mongodb.github.io/helm-charts/
- MongoDB Community Operator chart values and chart metadata: https://github.com/mongodb/helm-charts/tree/main/charts/community-operator
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- MongoDB 7.0 TLS configuration documentation: https://www.mongodb.com/docs/v7.0/tutorial/configure-ssl/
- MongoDB 7.0 release notes: https://www.mongodb.com/docs/v7.0/release-notes/7.0/
- cert-manager Certificate documentation: https://cert-manager.io/v1.14-docs/usage/certificate/

## Issues Found
- The post described the MongoDB Community Operator as actively maintained. The upstream GitHub repository is archived/read-only as of December 12, 2025, so the introduction now states that lifecycle status.
- The prerequisites pinned Kubernetes v1.26+, which is unnecessarily specific and stale for a 2026 production guide. It now says to use a supported Kubernetes cluster with Flux CD bootstrapped.
- The HelmRelease pinned the older `community-operator` chart `0.10.0`. Updated it to `0.13.0`, the latest chart version present in MongoDB's Helm repository during review.
- The Helm values placed operator resources under `values.resources.operator`, but the chart expects `values.operator.resources`. Corrected the values structure.
- The MongoDB server version was pinned to `7.0.11`, which is stale. Updated the example to `7.0.28`, matching MongoDB 7.0 release notes consulted during review.
- The MongoDBCommunity TLS CA reference pointed at `mongodb-ca-cert`, but the cert-manager example only created `mongodb-tls-cert`. Updated the reference and added a note that the referenced Secret must contain `tls.crt`, `tls.key`, and `ca.crt`.
- The TLS certificate SANs only covered pod hostnames via wildcards. Added the headless Service DNS names used by the generated SRV connection string.
- The MongoDB configuration used `net.ssl.mode: requireSSL`. Updated it to the current `net.tls.mode: requireTLS` form from MongoDB 7.0 documentation.
- The connection string command used the wrong generated Secret name. The operator's documented naming convention is `<metadata.name>-<auth-db>-<username>`, so it is now `my-mongodb-admin-my-user`.

## Review Notes
YAML code blocks were parsed successfully after edits. The local environment did not have `helm`, `kubectl`, or `flux` installed, so CLI validation was performed against official documentation rather than local command help.
