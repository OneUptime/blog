# Validation Summary: How to Use Ansible to Set Up Log Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- rsyslog
- Elasticsearch
- Kibana
- Index Lifecycle Management
- Linux package management with APT

## Sources Consulted
- Ansible `ansible.builtin.apt_key` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `ansible.builtin.deb822_repository` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible `ansible.builtin.apt` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.uri` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Elasticsearch 8 Debian installation documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/deb.html
- Elasticsearch ILM lifecycle policy documentation: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/configure-lifecycle-policy
- Elasticsearch rollover documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- Kibana 8 Debian installation documentation: https://www.elastic.co/guide/en/kibana/8.19/deb.html
- Kibana 8 configuration documentation: https://www.elastic.co/guide/en/kibana/8.19/settings.html
- rsyslog `omelasticsearch` documentation: https://docs.rsyslog.com/doc/configuration/modules/omelasticsearch.html
- rsyslog `mmjsonparse` documentation: https://docs.rsyslog.com/doc/configuration/modules/mmjsonparse.html
- rsyslog template/property formatting documentation: https://www.rsyslog.com/doc/reference/templates/templates-examples.html

## Issues Found
- The project structure command did not create the `inventory` directory, even though the post later writes `inventory/hosts.ini`. Added `mkdir -p log-aggregation/inventory`.
- The Elasticsearch role used `ansible.builtin.apt_key`, which depends on the deprecated `apt-key` utility. Replaced it with `ansible.builtin.deb822_repository` and added required repository prerequisites.
- Elasticsearch 8 enables HTTPS and authentication by default, but the rsyslog, verification, and ILM examples used unauthenticated HTTP. Added explicit variables and an `elasticsearch.yml.j2` example that disables security for this simple lab stack, and updated rsyslog/Kibana/URI examples to use `elasticsearch_scheme`.
- The Elasticsearch role defined `ilm.yml` but did not import it from `tasks/main.yml`. Added an `import_tasks` entry.
- The ILM example created a policy with rollover settings but did not configure a rollover alias, data stream, or index template. Replaced the rollover policy with a delete-only retention policy and added an index template that applies the policy to `syslog-*` indices.
- The main playbook referenced a `kibana` role, but the post did not define one. Added a minimal Kibana role with installation, configuration, and handler snippets.
- The log parsing example claimed to parse nginx access logs with `mmjsonparse`, but `mmjsonparse` parses JSON-structured messages, not standard nginx access log formats. Changed the example to parse JSON-formatted application logs with `mode="find-json"`.

## Review Notes
The corrected stack is still intentionally simplified for a lab-style deployment. For production, Elasticsearch security should remain enabled, rsyslog should use TLS and credentials for Elasticsearch, and the rsyslog server role should include equivalent package handling for non-Debian distributions if the intended target fleet includes RHEL-based systems.
