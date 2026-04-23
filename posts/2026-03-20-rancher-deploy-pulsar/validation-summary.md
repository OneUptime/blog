# Validation Summary: How to Deploy Apache Pulsar on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Apache Pulsar
- Apache BookKeeper
- Apache ZooKeeper
- Pulsar Manager
- AWS S3

## Sources Consulted
- Apache Pulsar Helm Chart repository: https://github.com/apache/pulsar-helm-chart
- Apache Pulsar Helm chart values: https://raw.githubusercontent.com/apache/pulsar-helm-chart/master/charts/pulsar/values.yaml
- Apache Pulsar Helm chart templates: https://github.com/apache/pulsar-helm-chart/tree/master/charts/pulsar/templates
- Deploy a Pulsar cluster on Kubernetes: https://pulsar.apache.org/docs/3.3.x/helm-deploy/
- Run a standalone Pulsar cluster in Kubernetes: https://pulsar.apache.org/docs/3.3.x/getting-started-helm/
- Pulsar admin CLI reference: https://pulsar.apache.org/docs/3.3.x/reference-pulsar-admin/
- Message retention and expiry: https://pulsar.apache.org/docs/3.3.x/cookbooks-retention-expiry/
- Use AWS S3 offloader with Pulsar: https://pulsar.apache.org/docs/2.10.x/tiered-storage-aws/
- Apache Pulsar broker configuration source: https://raw.githubusercontent.com/apache/pulsar/master/conf/broker.conf
- Apache BookKeeper CLI reference: https://bookkeeper.apache.org/docs/reference/cli/

## Issues Found
- The prerequisites were too broad for the current official chart. I updated them from generic `Helm 3.x` and unspecified `kubectl`/Kubernetes versions to the current chart requirements: Kubernetes 1.25+, `kubectl` 1.25+, and Helm 3.12+.
- The tenant creation example used `--allowed-clusters standalone`, which is incorrect for this guide. With `helm install pulsar ...`, the default Pulsar cluster name is `pulsar`, so I changed the cluster references accordingly.
- The topic creation command used `pulsar-admin topics create ... --partitions 12`, which is not the correct CLI for partitioned topics. I changed it to `topics create-partitioned-topic`.
- The Kubernetes `Deployment` example was invalid for `apps/v1` because it omitted `spec.selector` and matching pod labels. I added the required selector/labels and switched the client connection example to the proxy service, which is the documented access point for Pulsar on Kubernetes.
- The tiered storage example claimed it would offload data after 30 days while setting `managedLedgerOffloadAutoTriggerSizeThresholdBytes: "0"`, which triggers offload as soon as possible. I changed the size threshold to `-1`, kept the 30-day time threshold, aligned the S3 endpoint with the configured region, and clarified that credentials still need to be supplied separately.
- Several monitoring and troubleshooting comments did not match what the commands actually do, and one broker command again used the wrong cluster name. I corrected the cluster name and adjusted the descriptions to reflect the actual command behavior.

## Review Notes
- Pulsar Manager is still available in the official chart, but the current chart values warn that it has been poorly maintained and suggest Dekaf as a newer UI option.
- The guide is Rancher-compatible, but the actual deployment steps are standard Kubernetes and Helm operations rather than Rancher-specific UI or API workflows.
- The `8GB RAM per Pulsar node` prerequisite reads as a practical sizing guideline rather than an official hard minimum; real sizing depends on workload and retention/offload settings.
