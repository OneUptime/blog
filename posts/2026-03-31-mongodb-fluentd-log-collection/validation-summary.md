# Validation Summary: How to Use MongoDB with Fluentd for Log Collection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (standalone and Atlas)
- Fluentd (td-agent4)
- fluent-plugin-mongo (MongoDB output plugin for Fluentd)
- Docker (Fluentd logging driver)

## Sources Consulted
- fluent-plugin-mongo GitHub repository and README: https://github.com/fluent/fluent-plugin-mongo
- Fluentd v1 documentation for the tail input plugin: https://docs.fluentd.org/input/tail
- Fluentd v1 documentation for the forward input plugin: https://docs.fluentd.org/input/forward
- Fluentd v1 buffer plugin documentation: https://docs.fluentd.org/configuration/buffer-section
- Fluentd record_transformer filter documentation: https://docs.fluentd.org/filter/record_transformer
- Docker Fluentd logging driver documentation: https://docs.docker.com/config/containers/logging/fluentd/
- MongoDB TTL index documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB createIndex documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found
- **Incorrect plugin gem name in description and overview**: The description (line 7) and overview (line 12) referred to the plugin as "fluent-plugin-mongodb", but the correct gem name is "fluent-plugin-mongo". The install command (line 23) and summary (line 153) already used the correct name. Fixed both occurrences to "fluent-plugin-mongo" for consistency.

## Review Notes
- The `format json` shorthand used in the tail source configuration is a legacy parameter. In Fluentd v1 (td-agent4), the recommended approach is to use a `<parse>` section (e.g., `<parse> @type json </parse>`). The shorthand still works for backward compatibility, so this is not an error but could be updated in a future revision for best-practice alignment.
- The td-agent4 installation method shown is valid but note that Treasure Data has transitioned from td-agent to "fluent-package" as the official distribution name. The td-agent4 packages still work but new installations may want to use fluent-package instead.
- All MongoDB shell commands, index definitions, and TTL configuration are correct.
- Buffer configuration parameters (`flush_interval`, `chunk_limit_size`, `retry_max_times`) are all valid Fluentd v1 buffer section parameters.
- The Docker logging driver configuration and `--log-opt` flags are correct.
- The `capped: true` plugin option mentioned in best practices is a valid fluent-plugin-mongo feature.
