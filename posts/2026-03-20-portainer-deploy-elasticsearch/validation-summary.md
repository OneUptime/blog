# Validation Summary: How to Deploy Elasticsearch via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose stack configuration
- Elasticsearch
- Kibana
- Linux `sysctl`
- `curl`

## Sources Consulted
- Elastic Docs: Increase virtual memory — https://www.elastic.co/docs/deploy-manage/deploy/self-managed/vm-max-map-count
- Elastic Docs: Built-in users in self-managed clusters — https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/built-in-users
- Elastic Docs: Minimal security setup — https://www.elastic.co/docs/deploy-manage/security/set-up-minimal-security
- Elastic Docs: `elasticsearch-reset-password` — https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/reset-password
- Elastic Docs: Install Kibana with Docker — https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-kibana-with-docker
- Elastic Docs: Configure Elasticsearch with Docker — https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-configure
- Elastic Docs: Install Elasticsearch / Elastic Stack version compatibility — https://www.elastic.co/guide/en/elasticsearch/reference/current/configuring-stack-security.html
- Elastic Docker Registry: Elasticsearch tags — https://www.docker.elastic.co/r/elasticsearch/elasticsearch
- Elastic Docker Registry: Kibana tags — https://www.docker.elastic.co/r/kibana/kibana

## Issues Found
- The post used `vm.max_map_count=262144`, but Elastic’s current Docker and deployment docs require `1048576`. I updated both commands to `1048576`.
- The post pinned Elasticsearch and Kibana to `8.13.0`, which was stale for a March 2026 post. I updated both images to `9.3.3` and kept the versions aligned, which Elastic requires across the stack.
- The Kibana Docker environment used `ELASTICSEARCH_HOSTS=http://elasticsearch:9200`. I changed it to array syntax, `ELASTICSEARCH_HOSTS=["http://elasticsearch:9200"]`, to match Kibana’s documented Docker configuration format.
- The post used `elasticsearch-users passwd kibana_system`, which is not the correct tool for built-in users. I replaced it with `elasticsearch-reset-password -i -u kibana_system`, which Elastic documents for built-in-user password resets.
- The introduction and conclusion described the setup as production-capable even though the example disables HTTP TLS. I corrected that wording and added the HTTPS caveat because Elastic’s minimal-security guidance says plain HTTP is not sufficient for production and recommends TLS for all clusters.

## Review Notes
- The guide now validates technically as a single-node Portainer deployment with authentication enabled.
- The example still disables HTTP TLS for simplicity. That is acceptable for trusted/internal use, but Elastic recommends enabling HTTPS before exposing Elasticsearch or Kibana to untrusted networks.
- The guide uses `ES_JAVA_OPTS`, which works, but Elastic’s current docs prefer default JVM auto-sizing or mounted `jvm.options.d` files for production-oriented deployments.
