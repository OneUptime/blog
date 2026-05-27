# Validation Summary: How to Use Ansible to Set Up a Centralized Logging Stack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Elasticsearch
- Logstash
- Kibana
- Filebeat
- Elastic APT repositories
- Index Lifecycle Management
- Logstash grok, mutate, date, geoip, and Elasticsearch output plugins

## Sources Consulted
- Elastic Elasticsearch 8.11 Debian package installation documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.11/deb.html
- Ansible `ansible.builtin.apt_key` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `ansible.builtin.deb822_repository` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Elastic Filebeat migration documentation for `log` input to `filestream`: https://www.elastic.co/docs/reference/beats/filebeat/migrate-to-filestream
- Elastic Index Lifecycle Management setup documentation: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/configure-lifecycle-policy
- Elastic Logstash Elasticsearch output plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Elastic Logstash mutate filter plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-filters-mutate
- Elastic Kibana general settings documentation: https://www.elastic.co/docs/reference/kibana/configuration-reference/general-settings
- Elastic Kibana status endpoint documentation: https://www.elastic.co/guide/en/kibana/current/access.html

## Issues Found
- The Elastic APT repository used `https://artifacts.elastic.co/packages/8.11/apt`, which returns 404 and does not match the official 8.x APT repository path. Changed the default repository version to `8.x`.
- The Elasticsearch task used `apt_key`, which depends on the deprecated `apt-key` utility. Replaced it with `deb822_repository` and added the required `python3-debian` dependency task.
- The Filebeat task repeated the same deprecated repository setup pattern. Replaced it with `deb822_repository` and added the required `python3-debian` dependency task.
- The Elasticsearch JVM heap task referenced a `jvm.options.j2` template that the post did not include. Changed it to write the heap settings inline with `copy`.
- The Logstash mutate filter used duplicate `convert` declarations in the same block. Combined the conversions into one `convert` hash.
- The Logstash Elasticsearch output used date-based dynamic index names while the ILM section configured rollover without an alias or initial managed index. Added `ilm_enabled => false` to preserve the daily index name and changed the ILM example to a delete-only retention policy applied through an index template.
- The Kibana task referenced `kibana.yml.j2` without showing the required template. Added a minimal Kibana configuration template using documented `server.*` and `elasticsearch.hosts` settings.
- The Filebeat configuration used the deprecated `log` input. Updated the examples to use `filestream` inputs with stable IDs.
- The Filebeat task enabled the system module even though the shown replacement `filebeat.yml` did not load modules and the article already defined explicit syslog inputs. Removed the module-enable task to keep the example internally consistent.
- The introduction described ELK as open-source and the summary described the single-node, security-disabled example as production-ready. Reworded those claims to avoid inaccurate licensing and production-readiness implications.

## Review Notes
The corrected playbook remains a single-node, security-disabled learning example. For production, the post should eventually cover TLS, authentication, enrollment or credentials for Kibana and Logstash, multi-node discovery, firewall rules, index/data stream strategy, and capacity planning. `deb822_repository` requires ansible-core 2.15 or newer.
