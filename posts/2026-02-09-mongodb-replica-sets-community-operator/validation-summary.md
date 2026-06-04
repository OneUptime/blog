# Validation Summary: How to Deploy MongoDB Replica Sets Using the MongoDB Community Operator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB replica sets
- MongoDB Community Kubernetes Operator
- MongoDB Controllers for Kubernetes
- Kubernetes Custom Resource Definitions
- Kubernetes StatefulSets, Services, Secrets, ConfigMaps, and Pods
- Helm
- kubectl
- mongosh
- TLS and SCRAM authentication

## Sources Consulted
- MongoDB Community Kubernetes Operator repository and support status: https://github.com/mongodb/mongodb-kubernetes-operator
- MongoDB Controllers for Kubernetes repository and Community support notes: https://github.com/mongodb/mongodb-kubernetes
- MongoDB Community Operator install and upgrade documentation: https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/install-upgrade.md
- MongoDBCommunity deploy, scale, arbiter, connection string, and readiness probe documentation: https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/deploy-configure.md
- MongoDB Community Operator user and SCRAM documentation: https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/users.md
- MongoDB Community Operator TLS documentation: https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/secure.md
- MongoDBCommunity CRD schema: https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml
- MongoDB Shell documentation: https://www.mongodb.com/docs/mongodb-shell/
- MongoDB connection string options: https://www.mongodb.com/docs/manual/reference/connection-string-options/

## Issues Found
- The post presented the original MongoDB Community Operator as current production guidance. The repository is deprecated and archived, with MongoDB Controllers for Kubernetes now the replacement path. Added a caveat in the introduction.
- The kubectl install comment said "Add MongoDB Kubernetes repository" even though the command cloned a Git repository. Updated the comment.
- The advanced replica set example used `members: 5` plus `arbiters: 1`, producing six `mongod` instances while describing an arbiter for odd voting. Changed it to four data-bearing members plus one arbiter.
- The production example later connected as `app-user` but did not define `app-user` in the production MongoDBCommunity resource. Added the missing user definition.
- The production manifest included custom `mongo --eval` readiness and liveness probes in a TLS-enabled SCRAM deployment. Removed those probes because the legacy `mongo` shell is not appropriate for MongoDB 6.0 examples and the probes did not include TLS/authentication handling.
- Password secret commands and shell examples used unescaped `!`, which can break in interactive Bash. Switched secret literals to single quotes and quoted passwords in command examples.
- Connection examples manually built connection strings instead of using the operator-generated connection string secret. Updated the examples to use the documented secret naming pattern and `connectionString.standardSrv` key.
- The test client used `mongo` instead of `mongosh` and did not mount the CA needed for the TLS-enabled replica set. Updated the pod and command accordingly.
- Failover, scaling, and monitoring examples used `mongo`, omitted `--authenticationDatabase`, omitted TLS options for the TLS-enabled deployment, and sometimes omitted the `mongod` container selector. Updated the commands to use `mongosh`, SCRAM authentication, TLS flags, and `-c mongod`.

## Review Notes
- The examples still use MongoDB Server `6.0.5`, which is version-specific and old compared with current MongoDB releases, but the operator CRD requires a full image tag and the version is valid for the tutorial's legacy operator workflow.
- The TLS-enabled production example depends on pre-created `mongodb-tls-cert` and `mongodb-ca-cert` resources. The post now states that prerequisite, but a future revision could add a complete cert-manager workflow.
- Local validation confirmed that all YAML snippets parse and the monitoring script passes `bash -n`.
