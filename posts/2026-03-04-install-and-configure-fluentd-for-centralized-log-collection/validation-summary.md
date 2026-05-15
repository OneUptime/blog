# Validation Summary: How to Install and Configure Fluentd for Centralized Log Collection on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Fluentd
- fluent-package
- RubyGems
- Fluentd tail input plugin
- Fluentd syslog and apache2 parsers
- Fluentd record_transformer filter
- Fluentd monitor_agent input plugin
- fluent-plugin-elasticsearch
- fluent-plugin-kafka
- Elasticsearch
- systemd

## Sources Consulted
- Fluentd RPM package installation documentation: https://docs.fluentd.org/installation/install-fluent-package/install-by-rpm-fluent-package
- Fluentd Ruby gem installation documentation: https://docs.fluentd.org/installation/install-by-gem
- Fluentd post-installation guide: https://docs.fluentd.org/installation/post-installation-guide
- Fluentd plugin management documentation: https://docs.fluentd.org/deployment/plugin-management
- Fluentd command-line options documentation: https://docs.fluentd.org/deployment/command-line-option
- Fluentd configuration file syntax documentation: https://docs.fluentd.org/configuration/config-file
- Fluentd tail input plugin documentation: https://docs.fluentd.org/input/tail
- Fluentd syslog parser documentation: https://docs.fluentd.org/parser/syslog
- Fluentd apache2 parser documentation: https://docs.fluentd.org/parser/apache2
- Fluentd record_transformer filter documentation: https://docs.fluentd.org/filter/record_transformer
- Fluentd monitor_agent input plugin documentation: https://docs.fluentd.org/input/monitor_agent
- fluent-plugin-elasticsearch documentation: https://github.com/uken/fluent-plugin-elasticsearch

## Issues Found
- The install step referred to `td-agent` and used the old Treasure Data `fluent-package5-lts` install script. Current Fluentd documentation marks td-agent and fluent-package v5 information as EOL and recommends `fluent-package` v6 for RPM installs. Updated the section title and install command to use the official CNCF-hosted `install-redhat-fluent-package6-lts.sh` script.
- The Ruby gem install command omitted the official `--no-doc` option and did not clarify that the gem path is a standalone setup. Updated the command and wording to avoid implying that the later package-managed systemd workflow automatically applies to gem-only installs.
- The Elasticsearch output configured `index_name fluentd` together with `logstash_format true`. The Elasticsearch plugin documentation states that `logstash_format true` ignores `index_name`, so changed this to `logstash_prefix fluentd`.
- The Elasticsearch output included `type_name _doc`. The plugin documentation notes that `type_name` has no effect for Elasticsearch 8, so removed it to avoid outdated configuration.
- The filtering step could be appended after the catch-all `<match **>` block, where Fluentd would not process it. Added a short instruction to place filters before the `<match **>` block.

## Review Notes
The post is technically relevant and the remaining Fluentd configuration snippets use documented core plugins and parameters. The examples still assume local log paths such as `/var/log/messages` and `/var/log/httpd/access_log` exist and are readable by the Fluentd service account, which administrators should verify in their own RHEL 9 environment.
