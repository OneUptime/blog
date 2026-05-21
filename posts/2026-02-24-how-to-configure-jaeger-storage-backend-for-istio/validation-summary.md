# Validation Summary: How to Configure Jaeger Storage Backend for Istio

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Istio distributed tracing
- Istio Telemetry API
- Jaeger collector and query services
- Elasticsearch storage for Jaeger
- Cassandra storage for Jaeger
- Kubernetes Deployments, StatefulSets, Services, and CronJobs
- kubectl and istioctl commands

## Sources Consulted
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio trace sampling documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Jaeger integration documentation: https://istio.io/latest/docs/ops/integrations/jaeger/
- Jaeger 1.76 deployment and storage documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger 2.18 Elasticsearch storage documentation: https://www.jaegertracing.io/docs/2.18/storage/elasticsearch/
- Jaeger 2.18 Cassandra storage documentation: https://www.jaegertracing.io/docs/2.18/storage/cassandra/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Elasticsearch discovery and cluster formation settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/discovery-cluster-formation-settings

## Issues Found
- The description mentioned Kafka setups even though the article does not provide a Kafka setup. Removed Kafka from the description.
- The Istio sample addon URL used the older `release-1.20` path. Updated it to the current Istio sample path shown in the official Istio integration docs.
- The Elasticsearch StatefulSet configured three replicas while also setting `discovery.type=single-node`, which would create independent single-node clusters rather than a three-node cluster. Replaced that with cluster discovery settings and a headless Service suitable for a StatefulSet.
- The Jaeger examples used older `1.53` images. Updated Jaeger collector, query, Cassandra schema, Elasticsearch index cleaner, and rollover images to the current Jaeger 1.x archive release used by the official 1.x deployment docs.
- The Istio tracing configuration pointed to `jaeger-collector.istio-system:9411`, but the Jaeger collector manifest did not enable or expose the Zipkin receiver on port 9411. Replaced the snippet with the current Istio extension provider pattern that sends OTLP to Jaeger on port 4317, exposed port 4317 on the collector Service, and added the Telemetry resource with `randomSamplingPercentage`.
- The Elasticsearch ILM example created a policy named `jaeger-traces` but did not connect it to Jaeger's rollover/ILM support, so it would not manage Jaeger indices as described. Reworked the section to use Jaeger's index cleaner for default daily indices and added the required ILM policy name, rollover initialization step, and Jaeger flags for ILM usage.

## Review Notes
The article still uses Jaeger 1.x component images and command-line flags because the existing post is written around the 1.x collector/query deployment model. Jaeger 2.x is the current major line and uses a different configuration-file-based model, so a future larger refresh should migrate the guide instead of only updating the 1.x snippets.
