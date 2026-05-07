# Validation Summary: How to Run Elasticsearch in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Elasticsearch 8.12
- Elasticsearch Docker/container images
- Elasticsearch REST APIs
- Linux sysctl settings
- SELinux volume labels

## Sources Consulted
- Elastic Docs: Install Elasticsearch with Docker, https://www.elastic.co/guide/en/elasticsearch/reference/8.12/docker.html
- Elastic Docs: Current Docker installation notes, https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-docker
- Elastic Docker registry, https://www.docker.elastic.co/
- Elastic API documentation: Create an index, https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-indices-create
- Elastic API documentation: Cluster health API, https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-cluster-health
- Elastic API documentation: Cat indices API, https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-cat-indices
- Podman run documentation, https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The post pulled `docker.io/library/elasticsearch:8.12.0` while describing it as the official Elasticsearch image. Elastic's official images are published from the Elastic Docker registry. Changed all pull and run examples to `docker.elastic.co/elasticsearch/elasticsearch:8.12.0`.
- The custom configuration example reused the `es-data` volume while the persistent container example could still be running. Elasticsearch data paths should not be shared by multiple running nodes. Added a separate `es-custom-data` volume for the custom container and included it in cleanup.
- The summary said the shown custom configuration could set up node roles, but the snippet configures `node.name`, not `node.roles`. Changed that wording to "node names."

## Review Notes
The Elasticsearch REST API examples, `discovery.type=single-node`, `xpack.security.enabled=false`, `ES_JAVA_OPTS`, `vm.max_map_count=262144`, Podman port publishing, named volumes, and SELinux `:Z` volume option are technically consistent with the consulted documentation. Elasticsearch 8.12 documentation is archived and no longer updated, but it is appropriate for a post pinned to the 8.12.0 image.
