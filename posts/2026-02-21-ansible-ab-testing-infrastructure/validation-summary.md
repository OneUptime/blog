# Validation Summary: How to Use Ansible for A/B Testing Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Nginx
- Docker Compose
- ClickHouse
- Kafka and ZooKeeper with Confluent Platform Docker images
- A/B testing infrastructure patterns

## Sources Consulted
- Ansible community.docker.docker_compose_v2 module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html
- Nginx split_clients module documentation: https://nginx.org/en/docs/http/ngx_http_split_clients_module.html
- Nginx proxy_pass documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx rewrite/if directive documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#if
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Confluent Platform 7.5 Docker configuration reference: https://docs.confluent.io/platform/7.5/installation/docker/config-reference.html
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse CREATE MATERIALIZED VIEW documentation: https://clickhouse.com/docs/sql-reference/statements/create/view

## Issues Found
- The Nginx traffic-splitting example generated one shared `split_clients` block across all experiments and selected the upstream separately from the new visitor assignment. This could produce inconsistent routing behavior, especially on the first request where the cookie and upstream route could disagree. I changed the template to create per-experiment split, cookie, variant, and upstream variables using `split_clients` and `map`, and to route with a single `proxy_pass`.
- The event collector task tried to run `community.docker.docker_compose_v2` before creating the project directory and Compose file. The module expects `project_src` to contain a Compose file when `files` is not supplied, so I reordered the tasks and added a directory creation task.
- The Docker Compose example used the obsolete top-level `version` key. I removed it so the file follows the current Compose Specification behavior.
- The Docker Compose environment values were unquoted Jinja expressions. I quoted them so rendered passwords, listener URLs, and numeric environment variables remain valid YAML strings.
- The single-broker Confluent Kafka example omitted `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR`. I added it with a value of `1`, matching Confluent's single-broker ZooKeeper-mode examples.
- The ClickHouse daily aggregate materialized view used `SummingMergeTree` with `uniqExact(user_id)`, which can overcount unique users when partial aggregate rows are later summed. I changed the view to `AggregatingMergeTree` and used aggregate states: `countState`, `sumState`, and `uniqExactState`.
- The stop-experiment task inserted into `ab_testing.experiment_results`, but the schema section did not create that table. I added a matching `experiment_results` table.

## Review Notes
- Ansible and Nginx are not installed in the local environment, so those snippets were reviewed against official documentation rather than executed with `ansible-playbook --syntax-check` or `nginx -t`.
- The Kafka/ZooKeeper example is suitable as a simple single-broker demonstration. Confluent documents ZooKeeper mode as deprecated for new deployments in Confluent Platform 7.5 and recommends KRaft for new deployments.
