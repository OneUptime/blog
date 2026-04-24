# Validation Summary: How to Deploy Elasticsearch Cluster via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Elasticsearch 8.x
- Kibana
- Linux `sysctl`
- `curl`

## Sources Consulted
- Elastic Docs: Install Elasticsearch with Docker
  https://www.elastic.co/guide/en/elasticsearch/reference/8.19/docker.html
- Elastic Docs: Using the Docker images in production
  https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-prod
- Elastic Docs: Set up transport TLS
  https://www.elastic.co/docs/deploy-manage/security/set-up-basic-security
- Elastic Docs: Built-in users in self-managed clusters
  https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/built-in-users
- Elastic Docs: Security settings in Elasticsearch
  https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Elastic Docs: Bootstrapping a cluster
  https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-discovery-bootstrap-cluster.html
- Elastic Docs: `elasticsearch-certutil`
  https://www.elastic.co/guide/en/elasticsearch/reference/current/certutil.html
- Portainer Docs: Stacks
  https://docs.portainer.io/user/docker/stacks
- Official Elastic Docker Compose example
  https://github.com/elastic/elasticsearch/blob/8.19/docs/reference/setup/install/docker/docker-compose.yml

## Issues Found
- The original stack enabled Elasticsearch security but explicitly disabled transport TLS on all three nodes. Elastic’s documentation requires transport TLS for multi-node secured clusters, and production-mode clusters will not start without it. I replaced the stack with a working pattern that generates transport certificates in a `setup` service and enables `xpack.security.transport.ssl.*` on each node.
- Kibana was configured to use the `kibana_system` user with a password that was never created. I added password initialization for `kibana_system` in the `setup` service so Kibana can authenticate successfully.
- The original index-creation example used `#` comments inside a JSON body, which makes the request invalid JSON. I removed the inline comments and kept the payload valid.
- The `vm.max_map_count` example used `262144`. Elastic’s current Docker production guidance uses `1048576`, so I updated both commands accordingly.
- The post reused `cluster.initial_master_nodes` in the persistent stack definition without any caveat. Elastic documents that this setting is only for the first cluster bootstrap, so I added an inline note to remove it after the cluster forms.
- The node-failure explanation implied a fixed recovery sequence. I adjusted the wording to reflect actual shard promotion and reallocation behavior more accurately.
- The introduction stated that production Elasticsearch deployments require multiple nodes. I narrowed that claim so it applies specifically to deployments that need high availability.
- The conclusion overstated how simple rolling upgrades are from Portainer alone. I revised it to keep the claim technically accurate.

## Review Notes
- The post still pins Elasticsearch and Kibana to `8.13.0`. That version can work for the guide, but it is not current; Elastic’s current Docker documentation now references newer releases. Future refreshes should consider updating the pinned version.
- The corrected guide keeps HTTP TLS disabled so the `curl` examples remain simple over `http://`. That is technically valid because the required node-to-node transport TLS is enabled, but production hardening would typically also enable HTTPS on the HTTP layer.
- The stack generates a shared transport certificate with a blank password to keep the Portainer workflow self-contained. This is workable for a practical lab-style guide, but stricter production environments usually use stronger certificate lifecycle management and protected keystores.
