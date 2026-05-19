# Validation Summary: How to Install and Configure Elasticsearch on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Elasticsearch 8.x
- Elastic APT repository
- systemd
- Elasticsearch security and TLS
- Elasticsearch Query DSL
- Kibana

## Sources Consulted
- Elastic Elasticsearch 8.19 Debian package installation documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/deb.html
- Elastic Kibana 8.19 Debian package installation documentation: https://www.elastic.co/guide/en/kibana/8.19/deb.html
- Elastic automatic security setup documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/configuring-stack-security.html
- Elastic JVM settings documentation: https://www.elastic.co/docs/reference/elasticsearch/jvm-settings
- Elastic memory lock documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/setup-configuration-memory
- Elastic Kibana configuration settings documentation: https://elastic.aiops.work/guide/en/kibana/8.19/settings.html
- Elastic Elasticsearch API conventions documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/api-conventions.html
- Elastic Elasticsearch multi-match query documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/query-dsl-multi-match-query.html
- Elastic Elasticsearch mapping field types documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/mapping-types.html

## Issues Found
- The JVM heap guidance said to set heap to no more than 32 GB. Elastic's current JVM guidance says to stay under the compressed ordinary object pointer threshold, with 26 GB safe on most systems and up to 30 GB on some systems. Updated the wording accordingly.
- The full-text search curl example included a `//` comment inside a JSON request body sent with `Content-Type: application/json`. JSON request bodies cannot include comments. Moved the explanation outside the JSON payload.
- The Kibana section configured `elasticsearch.hosts` and `elasticsearch.ssl.certificateAuthorities` before using browser enrollment. Elastic documents that Kibana will not enter interactive enrollment mode if `elasticsearch.hosts` already exists. Removed those Elasticsearch connection settings from the manual snippet and clarified that enrollment writes the connection and security settings to `kibana.yml`.

## Review Notes
The post intentionally targets Elasticsearch 8.x via the `packages/8.x` APT repository. Elastic's latest self-managed Debian documentation now defaults to 9.x, so future maintenance should either keep this article explicitly scoped to 8.x or update it comprehensively for 9.x.
