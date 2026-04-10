# Validation Summary: How to Configure Ceph Storage for Elastic APM on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph orchestrator for Kubernetes)
- Ceph RBD (RADOS Block Device) storage
- Elastic Cloud on Kubernetes (ECK) operator v2.12.1
- Elasticsearch 8.13.0
- Elastic APM Server 8.13.0
- Elastic APM Python agent (`elastic-apm`)
- Kubernetes StorageClass and PersistentVolumeClaims

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Ceph RBD StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- ECK quickstart and installation guide: https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-deploy-eck.html
- ECK Elasticsearch CRD reference: https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-elasticsearch-specification.html
- ECK ApmServer CRD reference: https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-apm-server.html
- Elastic APM Python agent documentation: https://www.elastic.co/guide/en/apm/agent/python/current/api.html
- ECK TLS configuration: https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-tls-certificates.html

## Issues Found

### 1. Python APM code missing transaction context
**What was wrong:** The Python example used `elasticapm.capture_span("test-span")` without first starting a transaction via `client.begin_transaction()`. In the `elastic-apm` Python agent, spans must be created within an active transaction. Without a transaction, `capture_span` is a silent no-op and no APM data is sent to the server.

**What was changed:** Added `client.begin_transaction("request")` before the span and `client.end_transaction("test-transaction", "success")` after it. Also added `client.close()` to ensure buffered data is flushed to the APM Server.

### 2. Elasticsearch curl command used HTTP instead of HTTPS and lacked authentication
**What was wrong:** The curl command `curl -s http://localhost:9200/_cat/indices?v` would fail because ECK enables TLS on the Elasticsearch HTTP layer by default (self-signed certificates). Additionally, ECK requires authentication — the `elastic` user password is stored in a Kubernetes secret.

**What was changed:** Updated the command to first retrieve the `elastic` user password from the ECK-managed secret (`apm-elasticsearch-es-elastic-user`), then use `https://` with `-k` (skip certificate verification) and `-u "elastic:$PASSWORD"` for authentication.

## Review Notes
- The CephBlockPool sets `parameters.pg_num: "128"` manually. In modern Ceph (Pacific and later), the `pg_autoscaler` module is enabled by default. Setting `pg_num` explicitly without also setting `pg_autoscale_mode: "off"` may cause the autoscaler to override the value or produce a health warning. This is not incorrect but could be misleading for readers using current Ceph versions.
- The APM Server URL in the Python example uses `http://` while ECK also enables TLS on APM Server by default. In a production setup, this would need to be `https://` with appropriate certificate handling or `verify_server_cert=False`. The blog post may assume TLS is disabled on the APM Server for simplicity.
- The ECK `ApmServer` kind is still supported but Elastic is moving toward Fleet-managed Elastic Agent for APM data collection in newer versions. Readers using Elastic 8.x+ may want to consider the Fleet-based approach for new deployments.
