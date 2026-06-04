# Validation Summary: How to Deploy OpenSearch with Data Streams for Kubernetes Log Analytics

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenSearch 2.11
- OpenSearch data streams
- OpenSearch Index State Management (ISM)
- Kubernetes StatefulSets and Services
- Fluent Bit OpenSearch output
- OpenSearch Dashboards

## Sources Consulted
- OpenSearch data streams documentation: https://docs.opensearch.org/latest/im-plugin/data-streams/
- OpenSearch Index State Management documentation: https://docs.opensearch.org/2.17/im-plugin/ism/index/
- OpenSearch ISM policies documentation for 2.11: https://docs.opensearch.org/2.11/im-plugin/ism/policies
- OpenSearch Docker security configuration documentation: https://docs.opensearch.org/latest/install-and-configure/install-opensearch/docker/
- Fluent Bit OpenSearch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/opensearch
- Fluent Bit Lua filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/lua
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The data stream index template used `kubernetes-logs-*`, which did not match the `kubernetes-logs` data stream created and queried later. Changed the template pattern to `kubernetes-logs`.
- The post used Elasticsearch ILM settings (`index.lifecycle.name` and `index.lifecycle.rollover_alias`) in an OpenSearch guide. Removed those settings and attached the OpenSearch ISM policy with an `ism_template` matching `.ds-kubernetes-logs-*` backing indexes.
- The post referred to ILM in OpenSearch-specific sections. Updated the wording to Index State Management (ISM).
- The Kubernetes StatefulSets referenced governing services but did not define the required headless services. Added `opensearch-master` and `opensearch-data` headless Services.
- The discovery seed hosts used bare Pod names. Updated them to StatefulSet DNS names under the headless service.
- The examples enabled OpenSearch security while using unauthenticated `curl` commands and no certificate configuration. Switched the tutorial snippets to disable the security plugin and use HTTP consistently.
- The general OpenSearch Service selected both cluster-manager and data nodes. Limited it to data nodes so Fluent Bit and Dashboards send indexing and search traffic to data/ingest-capable nodes.
- The Fluent Bit pipeline did not guarantee an `@timestamp` field, which OpenSearch data streams require. Added a Lua filter to set `@timestamp` from the Fluent Bit event timestamp.
- The Fluent Bit output enabled TLS while the corrected OpenSearch snippets use HTTP. Removed the TLS options from that output.

## Review Notes
The post is now technically consistent as a runnable internal tutorial. For a production deployment, the OpenSearch security plugin should be enabled with custom certificates, credentials, and Kubernetes Secrets rather than disabled for convenience.
