# Validation Summary: How to Use Ansible to Deploy the ELK Stack (Elasticsearch, Logstash, Kibana)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible apt and deb822_repository modules
- Elasticsearch
- Logstash
- Kibana
- Elastic APT repositories
- Logstash pipelines
- JVM heap configuration
- Linux sysctl and service management

## Sources Consulted
- Ansible deb822_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Elastic Elasticsearch Debian package installation documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-debian-package
- Elastic Elasticsearch configuration documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/configure-elasticsearch
- Elastic Elasticsearch JVM settings documentation: https://www.elastic.co/docs/reference/elasticsearch/jvm-settings/
- Elastic Elasticsearch bootstrap checks documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/bootstrap-checks
- Elastic Logstash settings file documentation: https://www.elastic.co/docs/reference/logstash/logstash-settings-file
- Elastic Logstash JVM settings documentation: https://www.elastic.co/docs/reference/logstash/jvm-settings
- Elastic Logstash Elasticsearch output plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Elastic Kibana installation documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-kibana
- Elastic Kibana general settings documentation: https://www.elastic.co/docs/reference/kibana/configuration-reference/general-settings

## Issues Found
- The Elastic APT repository examples used `packages/8.11/apt`, but Elastic publishes APT repositories by major version channel such as `packages/8.x/apt`. Changed the default Elastic package channel variables from `8.11` to `8.x`.
- The Elasticsearch role used `ansible.builtin.apt_key`, which relies on the deprecated `apt-key` utility. Replaced it with `ansible.builtin.deb822_repository` and the official Elastic signing key URL.
- The Logstash and Kibana roles installed packages without ensuring the Elastic APT repository existed on those hosts. Added the same `deb822_repository` setup to both roles so the roles can work when deployed to separate servers.
- The `logstash_elasticsearch_host` default omitted the URL scheme. Updated it to `http://localhost:9200` to match current Elastic examples and avoid ambiguity in the Elasticsearch output plugin configuration.
- The project structure listed a Logstash configuration template, and the defaults included `logstash_heap_size`, `logstash_pipeline_workers`, and `logstash_pipeline_batch_size`, but the post did not show examples that used those variables. Added a `logstash.yml.j2` example for pipeline settings and `lineinfile` tasks that update the packaged `/etc/logstash/jvm.options` heap settings while preserving the rest of the JVM options file.
- The role tasks used `notify` for Elasticsearch, Logstash, and Kibana restarts, but the post did not define the corresponding handlers. Added minimal handler examples for each service.
- The introduction described the example as "production-ready" and called ELK the "most widely used open-source log management platform" even though the post disables Elastic security for a simple setup and Elastic packages include Elastic-licensed features. Adjusted the wording to describe a repeatable ELK deployment and a widely used log management platform.

## Review Notes
- The examples intentionally disable Elasticsearch security and use HTTP URLs. That is acceptable for the simple tutorial as corrected, but a real production deployment should enable security, TLS, credentials or service account tokens, and avoid exposing unauthenticated Elasticsearch or Kibana listeners.
- The corrected repository setup uses `ansible.builtin.deb822_repository`, which is available in ansible-core 2.15 and newer and requires `python3-debian` on the managed host.
