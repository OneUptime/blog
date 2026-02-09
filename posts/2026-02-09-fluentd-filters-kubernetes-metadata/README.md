# How to implement Fluentd filters for log enrichment with Kubernetes metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fluentd, Kubernetes, Metadata Enrichment, Filtering, EFK Stack

Description: Enrich container logs with Kubernetes metadata using Fluentd filters to add pod names, namespaces, labels, and annotations for powerful filtering and analysis in Elasticsearch.

---

Container logs contain little context about which pod, namespace, or application generated them. Fluentd's kubernetes_metadata filter plugin enriches logs with pod information, labels, annotations, and resource details, making logs searchable by Kubernetes constructs and enabling powerful filtering and visualization in Kibana.

This guide shows how to configure Fluentd filters to enrich logs with Kubernetes metadata and implement custom filtering logic for log processing.

## Understanding Fluentd filtering

Fluentd filters process records after input and before output:
- Transform record structure
- Add or remove fields
- Enrich data with external information
- Route records based on conditions
- Parse nested structures

The kubernetes_metadata filter is specifically designed to query the Kubernetes API and add pod metadata to log records.

## Configuring kubernetes_metadata filter

Basic metadata enrichment:

```yaml
<filter kubernetes.**>
  @type kubernetes_metadata
  @id filter_kube_metadata
  kubernetes_url "#{ENV['KUBERNETES_SERVICE_HOST']}:#{ENV['KUBERNETES_SERVICE_PORT']}"
  verify_ssl true
  ca_file /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
  skip_labels false
  skip_container_metadata false
  skip_master_url false
  skip_namespace_metadata false
</filter>
```

This adds comprehensive Kubernetes metadata to each log record.

## Enriching logs with pod labels

Extract pod labels for filtering:

```yaml
<filter kubernetes.**>
  @type kubernetes_metadata
  @id filter_kube_metadata

  # Cache settings for performance
  cache_size 1000
  cache_ttl 3600

  # Include labels
  skip_labels false

  # Watch for label changes
  watch true

  # Add specific label fields
  annotation_match [".*"]
  stats_interval 60
</filter>

# Extract specific labels as top-level fields
<filter kubernetes.**>
  @type record_transformer
  enable_ruby true
  <record>
    app_name ${record.dig("kubernetes", "labels", "app")}
    version ${record.dig("kubernetes", "labels", "version")}
    environment ${record.dig("kubernetes", "namespace_name")}
    tier ${record.dig("kubernetes", "labels", "tier")}
  </record>
</filter>
```

## Adding custom metadata fields

Enrich logs with cluster and environment information:

```yaml
<filter kubernetes.**>
  @type record_transformer
  enable_ruby true
  <record>
    # Add cluster information
    cluster_name "#{ENV['CLUSTER_NAME'] || 'production'}"
    cluster_region "#{ENV['AWS_REGION'] || 'us-east-1'}"
    
    # Add environment tier
    environment ${record.dig("kubernetes", "namespace_name") =~ /prod/ ? "production" : "non-production"}
    
    # Extract application name from pod
    application ${record.dig("kubernetes", "pod_name").to_s.split('-')[0]}
    
    # Add timestamp in readable format
    log_time ${Time.at(time).strftime('%Y-%m-%d %H:%M:%S')}
    
    # Add node information
    node_name ${record.dig("kubernetes", "host")}
  </record>
</filter>
```

## Filtering logs by namespace

Route logs based on namespace:

```yaml
# Only process logs from production namespaces
<filter kubernetes.**>
  @type grep
  <regexp>
    key $.kubernetes.namespace_name
    pattern /^(production|prod-.*)/
  </regexp>
</filter>

# Exclude system namespaces
<filter kubernetes.**>
  @type grep
  <exclude>
    key $.kubernetes.namespace_name
    pattern /^(kube-system|kube-public|kube-node-lease)$/
  </exclude>
</filter>

# Filter by pod labels
<filter kubernetes.**>
  @type grep
  <regexp>
    key $.kubernetes.labels.monitor
    pattern /^true$/
  </regexp>
</filter>
```

## Implementing log sampling

Sample logs for high-volume applications:

```yaml
# Sample 10% of logs from high-volume apps
<filter kubernetes.var.log.containers.high-volume-app-**.log>
  @type sampling
  @id sampling_high_volume
  sampling_rate 10
  sample_unit all
</filter>

# Always keep error logs
<filter kubernetes.**>
  @type grep
  <regexp>
    key level
    pattern /(ERROR|FATAL|CRITICAL)/
  </regexp>
</filter>
```

## Parsing application logs

Extract structured data from application logs:

```yaml
# Parse JSON application logs
<filter kubernetes.var.log.containers.app-**.log>
  @type parser
  key_name log
  reserve_data true
  reserve_time true
  remove_key_name_field false
  <parse>
    @type json
    time_key timestamp
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</filter>

# Handle parse failures gracefully
<filter kubernetes.var.log.containers.app-**.log>
  @type record_modifier
  <record>
    parse_error ${record.has_key?('log') ? 'failed' : 'success'}
  </record>
</filter>
```

## Implementing security filtering

Redact sensitive information:

```yaml
<filter kubernetes.**>
  @type record_modifier
  <replace>
    key log
    expression /password=\w+/
    replace password=***REDACTED***
  </replace>
  <replace>
    key log
    expression /api[_-]?key[=:]\s*[\w-]+/i
    replace apikey=***REDACTED***
  </replace>
  <replace>
    key log
    expression /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/
    replace ***CARD***
  </replace>
</filter>
```

## Adding cost allocation tags

Tag logs for cost tracking:

```yaml
<filter kubernetes.**>
  @type record_transformer
  enable_ruby true
  <record>
    cost_center ${record.dig("kubernetes", "labels", "cost-center") || "unallocated"}
    team ${record.dig("kubernetes", "labels", "team") || "unknown"}
    project ${record.dig("kubernetes", "labels", "project") || record.dig("kubernetes", "namespace_name")}
    billing_tag ${record.dig("kubernetes", "namespace_name") + "-" + record.dig("kubernetes", "labels", "app")}
  </record>
</filter>
```

## Best practices

1. **Use caching:** Configure cache_size and cache_ttl for performance
2. **Filter early:** Apply exclusion filters before enrichment
3. **Limit metadata:** Skip unnecessary metadata with skip_* options
4. **Handle parse errors:** Use reserve_data to keep original logs
5. **Monitor filter performance:** Track processing time
6. **Test filters thoroughly:** Validate with sample logs
7. **Document custom fields:** Maintain field documentation
8. **Use conditional enrichment:** Add fields only when needed

## Conclusion

Fluentd filters transform raw container logs into rich, searchable records by adding Kubernetes metadata, parsing application logs, and implementing custom enrichment logic. Properly configured filters make logs easily filterable by namespace, application, labels, and custom tags, enabling powerful log analysis and troubleshooting in your EFK stack.
