# Validation Summary: How to Deploy Apache Pulsar with BookKeeper and Functions on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Pulsar
- Apache BookKeeper
- Pulsar Functions
- Kubernetes
- Helm
- Python Pulsar client and Functions SDK
- Go Pulsar client
- VictoriaMetrics / PodMonitor-based metrics scraping

## Sources Consulted
- Apache Pulsar Helm Chart README: https://github.com/apache/pulsar-helm-chart
- Apache Pulsar Helm deployment docs: https://pulsar.apache.org/docs/4.2.x/deploy-kubernetes/
- Apache Pulsar Helm values.yaml: https://raw.githubusercontent.com/apache/pulsar-helm-chart/master/charts/pulsar/values.yaml
- Apache Pulsar Functions management docs: https://pulsar.apache.org/docs/4.1.x/admin-api-functions/
- Apache Pulsar Functions CLI and YAML config docs: https://pulsar.apache.org/docs/4.1.x/functions-cli/
- Apache Pulsar Python Function packaging docs: https://pulsar.apache.org/docs/4.1.x/functions-package-python/
- Apache Pulsar Python Function Context API: https://pulsar.apache.org/api/python/3.7.x/pulsar.functions.context.Context.html
- Apache BookKeeper configuration reference: https://bookkeeper.apache.org/docs/next/reference/config/

## Issues Found
- The Helm repository alias and chart reference used `apache/pulsar`; updated them to the current documented `apachepulsar/pulsar` convention.
- The production values used `persistence.enabled` and a global `storageClass`, which do not match the current chart values schema. Updated the snippet to use `volumes.persistence` and per-volume `storageClassName` values.
- The values file treated Pulsar Functions as a separately replicated component with `functions.enabled`, `replicaCount`, and resources. The current chart embeds the function worker in brokers and enables it through `components.functions`; updated the snippet and enabled BookKeeper-backed function state with `functions.useBookieAsStateStore`.
- The BookKeeper config snippet included ledger ensemble and quorum keys under `bookkeeper.configData`; those are managed ledger broker settings in this context, not bookie server config. Removed those keys from the BookKeeper-specific snippet.
- The local port-forward targeted the broker service. Updated it to the proxy service, which is the chart-supported client entry point when the proxy component is enabled.
- The Python Function packaging example zipped a single file at the ZIP root, which does not match Pulsar's documented ZIP package structure. Updated the examples to deploy single Python files with `--py`.
- The Function YAML used `ram: 512M`, but Pulsar Function resources expect RAM as a byte count. Updated it to `536870912`.
- The WordCount Function split raw input without handling byte payloads. Added UTF-8 decoding when the input is bytes.
- The stateful Function used generic `get_state` / `put_state` with an integer value. Updated it to use the documented counter state APIs for a running sum.
- The stream-processing Function snippet inherited from `Function` without importing it. Added the missing import.
- The enrichment Function used a nonexistent `context.get_partition_id()` method and placed a non-JSON-serializable message ID object into the output. Updated it to use `get_message_partition_index()` and stringify the message ID.
- The pipeline deployment commands omitted `--tenant`, `--namespace`, and `--classname`, and referenced ZIP files without a valid package layout. Added the required metadata and changed the commands to single-file Python Function deployment.
- The monitoring YAML deployed a Prometheus container without a configuration file or valid chart integration. Replaced it with the chart's built-in metrics scraping configuration using `victoria-metrics-k8s-stack` and component `podMonitor` settings.
- The post claimed "infinite retention" and said the guide configured storage tiers, but no tiered-storage configuration was provided. Adjusted the wording to long-term retention with tiered storage configured and general storage configuration.

## Review Notes
The tutorial is now technically consistent with current Apache Pulsar Helm chart and Pulsar Functions documentation. Future improvements could add authentication/TLS examples for production and a concrete tiered-storage offload configuration if the post wants to cover long-term object-store retention in depth.
