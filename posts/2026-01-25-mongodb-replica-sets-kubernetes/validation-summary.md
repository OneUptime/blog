# Validation Summary: How to Deploy MongoDB Replica Sets on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB replica sets
- MongoDB Shell (mongosh)
- MongoDB Database Tools (mongodump)
- Kubernetes StatefulSets
- Kubernetes Services and headless Services
- Kubernetes Secrets and ConfigMaps
- Kubernetes PodDisruptionBudgets
- Kubernetes CronJobs
- Prometheus exporter sidecars

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes CronJob GA announcement: https://kubernetes.io/blog/2021/04/09/kubernetes-release-1.21-cronjob-ga/
- MongoDB Shell documentation: https://www.mongodb.com/docs/mongodb-shell/
- MongoDB keyfile authentication documentation: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/
- MongoDB internal authentication reference: https://www.mongodb.com/docs/v7.0/core/security-internal-authentication/
- MongoDB rs.initiate() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB rs.add() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.add/
- MongoDB rs.remove() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.remove/
- MongoDB connection string documentation: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB connection string options: https://www.mongodb.com/docs/manual/reference/connection-string-options/
- MongoDB mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/

## Issues Found
- The prerequisite listed Kubernetes 1.19+, but the post uses `batch/v1` CronJob and `policy/v1` PodDisruptionBudget examples. Both stable APIs are available from Kubernetes 1.21, so the prerequisite was updated to Kubernetes 1.21+.
- The initialization ConfigMap used the legacy `mongo` shell command. The post targets `mongo:7.0` and already uses `mongosh` elsewhere, so the ConfigMap commands were updated to `mongosh`.
- The connection string section presented the ClusterIP Service URI as a shorter application connection form. MongoDB replica set clients should use a seed list of replica set members for reliable discovery, so the Service URI was clarified as suitable for quick in-cluster testing while recommending the pod seed list for applications.
- The backup CronJob defined MongoDB credentials in environment variables but did not pass them to `mongodump`. The command now passes `--username`, `--password`, and `--authenticationDatabase=admin`.

## Review Notes
- The ConfigMap initialization script is still not mounted or executed by the StatefulSet in the post. The manual Step 8 initialization remains the effective initialization path.
- The production examples remain intentionally abbreviated. A production deployment should also consider TLS, NetworkPolicies, backup retention, restore testing, storage class behavior, and using a MongoDB Kubernetes Operator for lifecycle management.
