# Validation Summary: How to Deploy Applications to Edge Nodes That Operate in Offline-First Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- K3s
- Kubelet configuration
- StatefulSets, Deployments, Services, CronJobs, Secrets, and ConfigMaps
- PostgreSQL
- Python, Flask, psycopg2, Requests, and Gunicorn
- Docker
- NATS JetStream
- Prometheus / Grafana dashboard queries
- K3s container image pre-import

## Sources Consulted
- K3s configuration options and kubelet drop-in configuration: https://docs.k3s.io/installation/configuration
- K3s image import documentation: https://docs.k3s.io/add-ons/import-images
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Service and headless Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubelet configuration file documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Flask development server documentation: https://flask.palletsprojects.com/en/stable/server/
- NATS server flags documentation: https://docs.nats.io/running-a-nats-service/introduction/flags
- Prometheus PromQL basics: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The K3s install command tainted the node with `CriticalAddonsOnly=true:NoExecute`, but the sample application pods did not define a matching toleration. On a single-node edge cluster, that would prevent or evict the workload being deployed. Removed the taint from the install command.
- The kubelet configuration snippet was shown as a standalone file without explaining how K3s loads it. Updated the text and filename to use the K3s kubelet drop-in directory supported by current K3s releases.
- The PostgreSQL and application manifests referenced a `postgres-credentials` Secret that the post never created. Added an idempotent `kubectl create secret ... --dry-run=client -o yaml | kubectl apply -f -` command before applying the database manifest.
- The Python sync helper leaked database cursors/connections on early returns and reported every sync attempt as successful. Updated it to close resources in `finally`, return a success boolean, and count only successful syncs.
- The Dockerfile ran Flask's development server for a deployed container. Replaced it with Gunicorn while preserving the existing schema initialization behavior before the WSGI server starts.
- The NATS StatefulSet referenced `serviceName: nats`, but the matching Service was not headless. Added `clusterIP: None`, matching Kubernetes StatefulSet requirements for stable network identity.
- The Grafana dashboard example used a SQL query in an `expr` field alongside Prometheus-style `rate()` expressions. Replaced the SQL with PromQL-style metric names and clarified that the dashboard assumes the app exports those metrics.
- The image pre-cache script used a bare `crictl pull`, which is not the documented K3s pre-import workflow and may not be configured on K3s nodes. Replaced it with the current K3s image pre-import text-file method under `/var/lib/rancher/k3s/agent/images`.

## Review Notes
The examples are now syntactically valid as Markdown code blocks, and the Python/YAML snippets were parsed successfully. The post still uses simplified demo code for conflict resolution and metrics; a production version should add authentication, input validation, explicit metric instrumentation, retry backoff, and a stronger conflict-resolution strategy than last-write-wins.
