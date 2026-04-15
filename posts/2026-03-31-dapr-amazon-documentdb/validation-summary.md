# Validation Summary: How to Use Dapr with Amazon DocumentDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (state management, MongoDB state store component)
- Amazon DocumentDB
- AWS (VPC, Security Groups, RDS TLS certificates)
- Kubernetes (ConfigMaps, Secrets, volume mounts)
- MongoDB (connection string parameters, mongosh)
- AWS CLI (ec2 authorize-security-group-ingress)

## Sources Consulted
- [Dapr MongoDB State Store Component](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-mongodb/) — verified component type, metadata fields, params format
- [Dapr Component Schema](https://docs.dapr.io/reference/resource-specs/component-schema/) — verified apiVersion `dapr.io/v1alpha1`
- [Dapr Secret References](https://docs.dapr.io/operations/components/component-secrets/) — verified `secretKeyRef` structure
- [Dapr State Management API](https://docs.dapr.io/reference/api/state_api/) — verified save/get state endpoints
- [AWS DocumentDB Encrypting Data in Transit](https://docs.aws.amazon.com/documentdb/latest/developerguide/security.encryption.ssl.html) — verified TLS requirement and CA bundle URL
- [AWS DocumentDB Functional Differences from MongoDB](https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html) — verified retryable writes limitation
- [AWS DocumentDB Transactions](https://docs.aws.amazon.com/documentdb/latest/developerguide/transactions.html) — verified multi-document transaction support in 4.0+
- [AWS DocumentDB Connecting from Outside a VPC](https://docs.aws.amazon.com/documentdb/latest/developerguide/connect-from-outside-a-vpc.html) — verified VPC-only connectivity
- [AWS DocumentDB Connecting Programmatically](https://docs.aws.amazon.com/documentdb/latest/developerguide/connect_programmatically.html) — verified connection string format, replicaSet=rs0, authSource=admin, port 27017

## Issues Found
1. **Incorrect claim about transaction support in the "DocumentDB Limitations vs MongoDB" section.**
   - **What was wrong:** The post stated "Transactions across multiple documents (retryWrites=false is required)" as an unsupported feature. This conflated two separate concepts: retryable writes (not supported by DocumentDB) and multi-document transactions (supported since DocumentDB 4.0+). The parenthetical also incorrectly linked `retryWrites=false` to transactions rather than to retryable writes.
   - **What was changed:** Replaced the incorrect bullet with "Retryable writes (retryWrites=false is required in the connection string)" and added a clarifying note that DocumentDB 4.0+ does support multi-document transactions within a replica set. Also added version context to the change streams limitation.
   - **Why:** Retryable writes and multi-document transactions are distinct MongoDB features. DocumentDB lacks the former but supports the latter (since 4.0 compatibility). Conflating them could lead readers to incorrectly believe transactions are unavailable.

## Review Notes
- The TLS certificate is mounted into the application pod, but the Dapr sidecar is the process that connects to DocumentDB. In a Kubernetes Dapr setup, the sidecar shares the pod's volumes, so the volume mount on the application container is accessible to the sidecar as well. This is correct but could benefit from a brief clarification for readers unfamiliar with Dapr's sidecar architecture.
- The `kubectl run` connectivity test mounts no TLS volume, so the `tlsCAFile=/tls/rds-ca.pem` path in the test connection string would not resolve in the ephemeral pod. This is a practical limitation of the test command as written, though it serves as a conceptual illustration.
- The post uses placeholder values (sg-documentdb, sg-eks-nodes, my-cluster.cluster-abc123) which is appropriate for a tutorial.
