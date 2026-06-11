# Validation Summary: How to Build Log Shipping Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Fluentd
- Filebeat
- Vector
- Kubernetes DaemonSets and sidecars
- Log buffering, batching, retries, and delivery guarantees
- HTTP, Logstash, and S3-style log destinations

## Sources Consulted
- Fluentd buffer section documentation: https://docs.fluentd.org/configuration/buffer-section
- Fluentd HTTP output documentation: https://docs.fluentd.org/output/http
- Fluentd output plugin documentation: https://docs.fluentd.org/output
- Elastic Filebeat output documentation: https://www.elastic.co/docs/reference/beats/filebeat/configuring-output
- Elastic Filebeat internal queue documentation: https://www.elastic.co/docs/reference/beats/filebeat/configuring-internal-queue
- Elastic Filebeat container input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-container
- Elastic Filebeat filestream input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream
- Elastic Filebeat Logstash output documentation: https://www.elastic.co/docs/reference/beats/filebeat/logstash-output
- Vector HTTP sink documentation: https://vector.dev/docs/reference/configuration/sinks/http/
- Vector Kubernetes logs source documentation: https://vector.dev/docs/reference/configuration/sources/kubernetes_logs/
- Vector route transform documentation: https://vector.dev/docs/reference/configuration/transforms/route/
- Vector sample transform documentation: https://vector.dev/docs/reference/configuration/transforms/sample/
- Vector VRL error reference: https://vector.dev/docs/reference/vrl/errors/

## Issues Found
- The Filebeat example used the deprecated `container` input. Changed it to the recommended `filestream` input with the container parser, a unique input ID, and symlink scanning for Kubernetes container log paths.
- The Filebeat example configured both `queue.mem` and `queue.disk`, but Filebeat supports only one internal queue type at a time. Removed the memory queue block and kept the persistent disk queue.
- The Filebeat example used `output.otlp`, which is not listed as a supported Filebeat output. Replaced it with the supported `output.logstash` example and kept retry, bulk, and compression settings that are valid for the Logstash output.
- The Vector HTTP sink example used unsupported retry option names. Replaced `retry_initial_backoff_secs` and `retry_max_duration_secs` with the documented `request.retry_attempts` and `request.retry_backoff_secs` options.
- The Vector graceful degradation example claimed health checks would automatically activate a backup sink only when the primary was unhealthy. Vector health checks validate sink health but do not provide conditional failover routing. Reworded the section to describe a continuously enabled secondary archive and updated the snippet accordingly.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. Some destination URLs are illustrative OneUptime endpoints; their exact ingest paths should be confirmed against OneUptime product documentation before being used as copy-paste production configuration.
