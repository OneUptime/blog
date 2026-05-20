# Validation Summary: How to Deploy MongoDB Community Operator with ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Controllers for Kubernetes Operator
- MongoDBCommunity custom resources
- ArgoCD Applications and custom health checks
- Kubernetes StatefulSets and Secrets
- External Secrets Operator
- Helm charts
- Prometheus metrics

## Sources Consulted
- MongoDB Helm charts index: https://mongodb.github.io/helm-charts/
- MongoDB Controllers for Kubernetes Operator Helm settings: https://www.mongodb.com/docs/kubernetes/current/reference/helm-operator-settings/
- MongoDB Controllers for Kubernetes Operator migration guide: https://www.mongodb.com/docs/kubernetes/current/tutorial/migrate-to-mck/
- MongoDB Community Kubernetes Operator repository and deployment docs: https://github.com/mongodb/mongodb-kubernetes-operator
- MongoDB Controllers for Kubernetes Operator repository: https://github.com/mongodb/mongodb-kubernetes
- Argo CD custom health checks documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- MongoDB 8.0 replica set upgrade documentation: https://www.mongodb.com/docs/manual/release-notes/8.0-upgrade-replica-set/
- MongoDB 7.0 and 8.0 release notes: https://www.mongodb.com/docs/manual/release-notes/7.0/ and https://www.mongodb.com/docs/manual/release-notes/8.0/

## Issues Found
- The install example used the deprecated standalone `community-operator` Helm chart at `0.10.0`. Updated it to the current `mongodb-kubernetes` chart at `1.8.0`, which is the MongoDB Controllers for Kubernetes Operator and includes support for `MongoDBCommunity` resources.
- The post described the old operator naming in the description, introduction, and conclusion. Updated those references to clarify that current Community resources are managed through MongoDB Controllers for Kubernetes Operator.
- The MongoDB examples used older patch releases, including `7.0.14` and `8.0.0`. Updated them to current 7.0 and 8.0 patch examples and adjusted the upgrade note to point readers to MongoDB's upgrade path and compatibility checklist.
- The monitoring section implied compatibility with the Prometheus MongoDB exporter. Updated it to the operator-supported `spec.prometheus` metrics endpoint.

## Review Notes
The YAML snippets parse successfully. The generated connection-string Secret wording was already correct in the checked file. The manual connection string remains illustrative; applications should prefer the operator-created Secret because it includes the generated connection strings and credentials.
