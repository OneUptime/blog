# Validation Summary: How to Deploy StatefulSets via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes StatefulSets
- Kubernetes Services
- PersistentVolumeClaims
- PostgreSQL
- Redis

## Sources Consulted
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes scaling StatefulSets: https://kubernetes.io/docs/tasks/run-application/scale-stateful-set/
- Kubernetes API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.33/
- Portainer manifest deployment docs: https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer application inspection docs: https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Portainer API docs: https://docs.portainer.io/sts/api/docs
- Portainer CE API spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer source, Kubernetes proxy transport: https://github.com/portainer/portainer/blob/develop/api/http/proxy/factory/kubernetes/transport.go
- Portainer source, API handler routing: https://github.com/portainer/portainer/blob/develop/api/http/handler/handler.go
- Portainer source, StatefulSet REST client: https://github.com/portainer/portainer/blob/develop/app/kubernetes/rest/statefulSet.js
- PostgreSQL `pg_isready` docs: https://www.postgresql.org/docs/current/app-pg-isready.html
- Redis cluster docs: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/

## Issues Found
- The PostgreSQL manifest referenced `postgres-secret` but did not define it. I added an `Opaque` Secret so the manifest is self-consistent and deployable.
- The PostgreSQL manifest hard-coded `storageClassName: standard`, which is not portable across clusters. I removed that field so the example can use the cluster default storage class instead of assuming a specific name.
- The Redis example was labeled as a Redis Cluster but did not configure Redis cluster mode. Redis cluster requires settings such as `cluster-enabled yes`, cluster state files, and at least three master nodes. I corrected this by changing the section to a plain Redis StatefulSet example.
- The Redis example referenced `redis-headless` as the StatefulSet service name without defining the required headless Service. I added the missing Service.
- The Redis example used three standalone replicas with no clustering or replication setup, which would create unrelated Redis instances rather than a working cluster. I changed the example to a single-replica StatefulSet.
- The Portainer API scaling example used `PUT` on the Kubernetes `/scale` subresource with a partial body. Kubernetes expects a full `Scale` object for `PUT /scale`, and Portainer’s own StatefulSet client patches the StatefulSet resource directly. I replaced the example with a JSON Patch `PATCH` request to the proxied StatefulSet resource.
- The Portainer UI notes said scaling happens via a slider. Current Portainer documentation and source show editing and patch-based updates rather than a documented StatefulSet-specific slider workflow. I updated the text to describe editing the manifest or patching `.spec.replicas`.
- The rolling update YAML snippet declared `updateStrategy` twice in the same mapping, which is invalid YAML. I split the examples into separate `RollingUpdate` and `OnDelete` snippets.

## Review Notes
- The examples assume the `production` namespace already exists in the target cluster.
- The PVC examples use `ReadWriteOnce`, which is valid. Current Kubernetes docs note that `ReadWriteOncePod` is recommended for production use when supported by the cluster.
