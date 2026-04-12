# Validation Summary: How to Scale MongoDB on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica sets, sharded clusters)
- Kubernetes (StatefulSets, kubectl, rolling updates)
- MongoDB Community Operator (MongoDBCommunity CRD)
- MongoDB Node.js Driver (read preferences)
- mongosh (shell commands: rs.add, rs.status, sh.addShard, sh.status)

## Sources Consulted
- MongoDB documentation on replica set configuration: https://www.mongodb.com/docs/manual/reference/method/rs.add/
- MongoDB documentation on read preferences: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- MongoDB documentation on sharding: https://www.mongodb.com/docs/manual/reference/method/sh.addShard/
- Kubernetes documentation on StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes kubectl reference for scale and rollout: https://kubernetes.io/docs/reference/kubectl/
- MongoDB Community Operator documentation: https://github.com/mongodb/mongodb-kubernetes-operator

## Issues Found
No technical issues found.

## Review Notes
- The sharded cluster section mixes bash and mongosh commands in a single code block. A comment (`# In mongosh`) clarifies the boundary, but readers copying the full block into a terminal would encounter errors. This is a common blog convention and not a technical error.
- The `kubectl rollout restart` after `kubectl apply` with changed resource specs is redundant since the apply itself triggers a rolling update with the default `RollingUpdate` strategy. However, it is not incorrect and serves as a useful explicit step for readers who may have other update strategies configured.
- The MongoDB Community Operator version `7.0.0` in the example is valid. As newer MongoDB versions are released, the example version may need updating to stay current.
