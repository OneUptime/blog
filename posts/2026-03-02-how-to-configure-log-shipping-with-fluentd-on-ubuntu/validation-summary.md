# Validation Summary: How to Configure Log Shipping with Fluentd on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Fluentd / fluent-package
- Fluentd input, filter, output, buffer, parser, and storage configuration
- systemd journal input
- Elasticsearch output plugin
- Amazon S3 output plugin
- Remote syslog output plugin
- logrotate

## Sources Consulted
- Fluentd official DEB package installation documentation: https://docs.fluentd.org/installation/install-fluent-package/install-by-deb-fluent-package
- Fluentd official configuration file syntax documentation: https://docs.fluentd.org/configuration/config-file
- Fluentd official buffer section documentation: https://docs.fluentd.org/configuration/buffer-section
- Fluentd official syslog input documentation: https://docs.fluentd.org/input/syslog
- Fluentd official tail input documentation: https://docs.fluentd.org/input/tail
- Fluentd official nginx parser documentation: https://docs.fluentd.org/parser/nginx
- Fluentd official multiline parser documentation: https://docs.fluentd.org/parser/multiline
- Fluentd official record_transformer filter documentation: https://docs.fluentd.org/filter/record_transformer
- Fluentd official HTTP input documentation: https://docs.fluentd.org/input/http
- Fluentd official monitor_agent documentation: https://docs.fluentd.org/input/monitor_agent
- Fluentd official S3 output documentation: https://docs.fluentd.org/output/s3
- fluent-plugin-s3 official repository documentation: https://github.com/fluent/fluent-plugin-s3/blob/master/docs/output.md
- fluent-plugin-elasticsearch official repository documentation: https://github.com/uken/fluent-plugin-elasticsearch
- fluent-plugin-systemd official repository documentation: https://github.com/fluent-plugins-nursery/fluent-plugin-systemd
- fluent-plugin-remote_syslog RubyGems/RubyDoc documentation: https://www.rubydoc.info/gems/fluent-plugin-remote_syslog

## Issues Found
- The installation example used the obsolete fluent-package v5 Treasure Data toolbelt URL. Updated it to the current official Fluent Package 6 LTS Jammy installer URL and corrected the documentation link.
- Elasticsearch `index_name` examples used `%Y%m%d` and `${tag}` placeholders without the required matching buffer chunk keys and `timekey`. Added `timekey 1d` to time-based buffers and added time buffer sections where needed.
- Buffer examples used `queue_limit_length`, which Fluentd v1 treats as a v0.12 compatibility setting. Replaced it with `queued_chunks_limit_size` in the v1-style examples.
- The S3 example used `${hostname}` in the S3 path while the buffer was keyed only by `time`. Updated the buffer keys to `time,hostname` so the record-field placeholder is valid.
- The HTTP curl test referenced the `in_http` plugin but did not show the source block required to make port 9880 listen. Added a minimal commented `http` source block before the test command.

## Review Notes
- The post remains version-sensitive because Fluent Package lifecycle and plugin compatibility change over time. The examples now align with Fluent Package 6 / Fluentd v1-style configuration as of 2026-05-19.
- The Elasticsearch output plugin still requires choosing plugin and Elasticsearch client gem versions compatible with the target Elasticsearch cluster version.
