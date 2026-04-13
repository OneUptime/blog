# Validation Summary: How to Use MongoDB with Logstash for Log Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Logstash (Elastic Stack / ELK Stack)
- logstash-output-mongodb plugin (by phutchins)
- logstash-input-mongodb plugin (by phutchins)
- Filebeat / Beats input
- Apache Kafka input
- Grok filter
- MongoDB TTL indexes

## Sources Consulted
- logstash-output-mongodb plugin source code and documentation (https://github.com/logstash-plugins/logstash-output-mongodb)
- logstash-input-mongodb plugin source code and documentation (https://github.com/phutchins/logstash-input-mongodb)
- Elastic Logstash plugin documentation (https://www.elastic.co/guide/en/logstash/current/index.html)
- Logstash file input plugin documentation (https://www.elastic.co/guide/en/logstash/current/plugins-inputs-file.html)
- Logstash beats input plugin documentation (https://www.elastic.co/guide/en/logstash/current/plugins-inputs-beats.html)
- Logstash kafka input plugin documentation (https://www.elastic.co/guide/en/logstash/current/plugins-inputs-kafka.html)
- MongoDB createIndex and TTL index documentation (https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/)

## Issues Found

1. **`codec => "json"` in mongodb output blocks (2 occurrences):** The `logstash-output-mongodb` plugin writes events directly as BSON documents to MongoDB via `event.to_hash` and `insert_one`/`insert_many`. It never invokes the codec in its data path. While `codec` is inherited from the Logstash base output class and won't cause an error, setting `codec => "json"` is a no-op and misleading — it suggests the plugin JSON-encodes events before writing, which it does not. Replaced `codec => "json"` with `isodate => true` (a real and useful plugin option) in both the Basic Pipeline Configuration and the Beats-to-MongoDB output blocks.

2. **`workers` best practice referenced deprecated per-output setting:** The advice to "Set `workers` in the output plugin" references a legacy option that was deprecated and removed in Logstash 6.0+. Modern Logstash controls pipeline parallelism via `pipeline.workers` in `logstash.yml` or the `-w` CLI flag. Updated the best practice to reference `pipeline.workers` in `logstash.yml` and the `-w` flag instead.

## Review Notes
- The `logstash-input-mongodb` plugin uses an embedded SQLite database to track cursor position — the `placeholder_db_dir` and `placeholder_db_name` options in the post are correct and well-documented.
- The Grok pattern `%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:log_message}` is valid standard Logstash Grok syntax.
- The TTL index `expireAfterSeconds: 604800` equals 7 days, which is a reasonable default for log retention.
- The dynamic collection naming `%{[fields][service]}_logs` is valid Logstash sprintf format for the mongodb output plugin.
- The Kafka input configuration options (`bootstrap_servers`, `topics`, `codec`, `group_id`) are all correct for the logstash-input-kafka plugin.
