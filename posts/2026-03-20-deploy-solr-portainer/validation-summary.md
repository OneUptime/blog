# Validation Summary: How to Deploy Solr via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Solr
- Docker
- Docker Compose / Portainer Stacks
- Solr Schema API
- Solr Core Admin and Update APIs
- `curl`
- YAML

## Sources Consulted
- Apache Solr Reference Guide, Solr in Docker: https://solr.apache.org/guide/solr/latest/deployment-guide/solr-in-docker.html
- Apache Solr Reference Guide, Solr Control Script Reference: https://solr.apache.org/guide/solr/latest/deployment-guide/solr-control-script-reference.html
- Apache Solr Reference Guide, Indexing with Update Handlers: https://solr.apache.org/guide/solr/latest/indexing-guide/indexing-with-update-handlers.html
- Apache Solr Reference Guide, Schema API: https://solr.apache.org/guide/solr/latest/indexing-guide/schema-api.html
- Apache Solr Reference Guide, JVM Settings: https://solr.apache.org/guide/solr/latest/deployment-guide/jvm-settings.html
- Apache Solr release notes for 10.0.0: https://solr.apache.org/docs/10_0_0/changes/Changes.html
- Apache Solr official Docker image page: https://hub.docker.com/_/solr
- Apache Solr downloads page: https://solr.apache.org/downloads
- Portainer documentation, Add a new stack: https://docs.portainer.io/user/docker/stacks/add

## Issues Found
- The post pinned `solr:9.6-slim`, which was outdated as of the review date. Updated it to `solr:10.0-slim` to match the current official release series and supported Docker tags.
- The post used `docker exec solr solr create_core -c products`. Solr 10.0.0 removes `create_core` in favor of `solr create`, so this was updated to `docker exec solr solr create -c products`.
- The healthcheck used `curl`, but the official slim Solr image installs `wget`, not `curl`. Updated the healthcheck to use `wget` so it works with the documented image variant.
- The Compose snippet set both `SOLR_HEAP` and `SOLR_JAVA_MEM`. Solr’s `solr.in.sh` states that `SOLR_HEAP` takes precedence, so the redundant `SOLR_JAVA_MEM` entry was removed.
- The commit example used `curl` without explicitly making a POST request. Updated it to `curl -X POST` to align with Solr’s documented update-handler usage.
- The conclusion recommended setting `SOLR_HEAP` to roughly 50% of available RAM. Solr’s current JVM guidance does not recommend a fixed percentage; it recommends sizing heap based on workload and GC behavior while leaving memory for the OS page cache. The wording was corrected accordingly.

## Review Notes
- The remaining Solr API examples in the post are compatible with current Solr documentation, including `/update/json/docs`, CSV updates via `Content-Type: application/csv`, the `/schema` endpoint, and the classic `/solr/<core>/select` query examples.
- The post intentionally uses standalone cores rather than SolrCloud collections. That is technically appropriate for a single-node Portainer deployment.
