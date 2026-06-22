# Validation Summary: How to Run Elasticsearch in Docker with Proper Memory Settings

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Docker
- Docker Compose
- Elasticsearch 8.11 Docker image
- Kibana 8.11 Docker image
- JVM heap sizing
- Linux sysctl settings

## Sources Consulted
- Elastic Docs: JVM settings - https://www.elastic.co/docs/reference/elasticsearch/jvm-settings
- Elastic Docs: Install Elasticsearch with Docker, single-node cluster - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-basic
- Elastic Docs: Install Elasticsearch with Docker, multi-node Docker Compose - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-compose
- Elastic Docs: Using the Docker images in production - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-prod
- Elastic Docs: Set up transport TLS - https://www.elastic.co/docs/deploy-manage/security/set-up-basic-security
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose deploy specification - https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- The Compose snippets used the obsolete top-level `version: '3.8'` field. Removed it from all Compose examples because current Docker Compose ignores it and emits an obsolete-version warning.
- The heap guidance said heap should be 50% of memory and never exceed 31GB. Updated it to Elastic's current guidance: set heap to no more than 50% of available memory, and keep it below the compressed ordinary object pointers threshold, where 26GB is safe on most systems and the threshold may be as high as 30GB.
- The production examples enabled Elasticsearch security while using plain `http://` endpoints. Added `xpack.security.http.ssl.enabled=false` where the examples intentionally use HTTP so the snippets are internally consistent.
- The multi-node example enabled security without configuring transport TLS. Changed that example to `xpack.security.enabled=false` because Elastic requires transport TLS for secured multi-node production clusters.
- The Kibana multi-node example supplied `kibana_system` credentials even though the example did not set the `kibana_system` password. Removed those credentials from the unsecured multi-node example.
- The health checks could pass on authentication error responses because `curl -s` did not fail on HTTP errors. Updated them to use `curl -fsS`, and added basic authentication to the secured production health check.
- The host `vm.max_map_count` value used `262144`. Updated it to Elastic's current Docker production recommendation of `1048576`.
- The complete production example configured Kibana with `kibana_system` but did not set that user's password. Added a small setup service that waits for Elasticsearch and sets the `kibana_system` password before Kibana starts.
- The summary table described `ES_JAVA_OPTS` as the production heap mechanism without caveat. Updated the text to note that JVM options files are preferred for production overrides.

## Review Notes
All YAML examples were parsed with `docker compose config --quiet` using placeholder `ELASTIC_PASSWORD` and `KIBANA_PASSWORD` values. Containers were not started as part of this review.
