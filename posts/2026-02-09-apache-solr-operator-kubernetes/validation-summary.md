# Validation Summary: How to Deploy Apache Solr on Kubernetes Using the Solr Operator

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Solr
- Apache SolrCloud
- Apache Solr Operator
- Kubernetes custom resources, StatefulSets, Services, Ingress, probes, and secrets
- ZooKeeper
- Helm
- kubectl
- Solr Collections API and Schema API
- pysolr
- SolrJ
- Prometheus exporter
- AWS S3 backup repositories

## Sources Consulted
- Apache Solr Operator running/install documentation: https://apache.github.io/solr-operator/docs/running-the-operator.html
- Apache Solr Operator SolrCloud CRD documentation: https://apache.github.io/solr-operator/docs/solr-cloud/solr-cloud-crd.html
- Apache Solr Operator backup documentation: https://apache.github.io/solr-operator/docs/solr-backup/
- Apache Solr Operator scaling documentation: https://apache.github.io/solr-operator/docs/solr-cloud/scaling.html
- Apache Solr Operator Prometheus exporter documentation: https://apache.github.io/solr-operator/docs/solr-prometheus-exporter/
- Apache Solr 9.4.0 SolrJ CloudSolrClient.Builder API: https://solr.apache.org/__root/docs.solr.apache.org/docs/9_4_0/solrj/org/apache/solr/client/solrj/impl/CloudSolrClient.Builder.html
- Apache Solr 9.4 monitoring with Prometheus and Grafana documentation: https://solr.apache.org/guide/solr/9_4/deployment-guide/monitoring-with-prometheus-and-grafana.html
- Apache Solr collection management and backup/restore documentation: https://solr.apache.org/guide/solr/latest/deployment-guide/collection-management.html
- Apache Solr backup and restore repository documentation: https://solr.apache.org/guide/solr/9_0/deployment-guide/backup-restore.html
- Apache Solr indexing/update handler documentation: https://solr.apache.org/guide/solr/latest/indexing-guide/indexing-with-update-handlers.html
- Apache Solr 9.4.0 default configset schema and CLI source: https://github.com/apache/solr/tree/releases/solr/9.4.0/solr
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The Helm install sequence created the `solr` namespace but installed the operator into `solr-operator-system`, which was not created. Added creation of the operator namespace.
- The operator installation used an unpinned chart and omitted the dependency CRD install needed for the provided ZooKeeper CRD path in current Solr Operator guidance. Added the `v0.9.1` CRD install and pinned the Helm chart to `0.9.1`.
- The geospatial query referenced a `location` field that was not defined in the schema. Added a `location` field using Solr's `location` field type.
- The geospatial curl example placed spaces and local params directly in the URL. Changed it to use `curl -G` with `--data-urlencode`.
- The SolrJ example used `Optional.empty()` without importing `java.util.Optional`, so it would not compile. Added the missing import.
- The S3 backup examples used `s3://solr-backups/prod` as `location`, but Solr's S3 repository already defines the bucket and treats `location` as a path inside that bucket. Changed the location to `prod`.
- The backup status command referenced `<request-id>` without making the backup request asynchronous. Added `async=products-backup` and used that request id in `REQUESTSTATUS`; added an async id to the restore example as well.
- Several Prometheus metric names did not match Solr 9.4's default exporter configuration. Updated them to emitted names such as `solr_metrics_core_query_requests_total`, `solr_metrics_core_query_median_ms`, `solr_metrics_jvm_memory_heap_bytes`, and `solr_metrics_core_searcher_warmup_time_seconds`.
- The best-practice list recommended running optimize after bulk indexing. Solr documentation warns optimize should generally be limited to mostly static indexes, so the guidance was narrowed.

## Review Notes
The examples are technically valid for Solr 9.4.0 and Solr Operator 0.9.1 after the corrections. Solr 9.4.0 is no longer the newest Solr release as of this validation date, so a future refresh could update image tags and re-check SolrJ and exporter behavior against the newer target version.
