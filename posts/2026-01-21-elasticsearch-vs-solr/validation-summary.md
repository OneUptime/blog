# Validation Summary: Elasticsearch vs Solr: Search Engine Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Elasticsearch
- Apache Solr and SolrCloud
- Apache Lucene
- Elasticsearch Query DSL and aggregations
- Solr query parameters, faceting, Collections API, and export handler
- Python Elasticsearch client
- pysolr
- Elasticsearch Java API Client
- SolrJ
- curl-based administration commands
- Kibana, Grafana, Logstash, Filebeat, Fluentd, Elastic Cloud, OpenSearch Service, SearchStax, and Websolr

## Sources Consulted
- Elastic licensing FAQ: https://www.elastic.co/pricing/faq/licensing
- Elastic Java High Level REST Client deprecation notice: https://www.elastic.co/guide/en/elasticsearch/client/java-rest/current/java-rest-high.html
- Elastic Java API Client documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/java
- Elastic Java API Client connection/search examples: https://www.elastic.co/docs/reference/elasticsearch/clients/java/setup/connecting
- Apache Solr Reference Guide, Schema API: https://solr.apache.org/guide/solr/latest/indexing-guide/schema-api.html
- Apache Solr Reference Guide, Collection Management Commands: https://solr.apache.org/guide/solr/latest/deployment-guide/collection-management.html
- Apache Solr Reference Guide, Exporting Result Sets: https://solr.apache.org/guide/solr/latest/query-guide/exporting-result-sets.html
- Apache Solr Reference Guide, SolrJ: https://solr.apache.org/guide/solr/latest/deployment-guide/solrj.html
- Apache Solr Reference Guide, Major Changes in Solr 9: https://solr.apache.org/guide/solr/latest/upgrade-notes/major-changes-in-solr-9.html
- Apache Solr Javadocs, HttpSolrClient deprecation: https://solr.apache.org/docs/9_4_0/solrj/org/apache/solr/client/solrj/impl/HttpSolrClient.html
- Apache Solr Javadocs, HttpJdkSolrClient: https://solr.apache.org/docs/9_8_1/solrj/org/apache/solr/client/solrj/impl/HttpJdkSolrClient.html

## Issues Found
- The Elasticsearch license line was outdated because Elastic added AGPLv3 as a source-code licensing option in 2024. Updated the license description to distinguish the Elastic License 2.0 distribution from the source-code license choices.
- The Elasticsearch cluster coordination row referred to "Zen/Raft", which is imprecise for current Elasticsearch. Reworded it to "built-in cluster coordination."
- The Elasticsearch replica update command was labeled "Scale shards" and omitted a `Content-Type` header for a JSON body. Changed the label to "Scale replicas" and added the header.
- The Elasticsearch Java example used the deprecated High Level REST Client. Replaced it with the current Elasticsearch Java API Client pattern.
- The Solr Java example used deprecated `HttpSolrClient`. Replaced it with `HttpJdkSolrClient` and passed the core name to `client.query`.
- The Solr `/export` migration command omitted the required `sort` parameter and used a wildcard field list that may not be valid unless fields meet export requirements. Added `sort=id+asc`, explicit fields, and a note that exported and sorted fields must have docValues enabled.

## Review Notes
- The benchmark figures are illustrative and environment-dependent; they should not be treated as vendor-neutral universal performance claims without a reproducible benchmark setup.
- The Elasticsearch scroll export example is still workable as a conceptual migration sketch, but current Elasticsearch guidance generally prefers point-in-time with `search_after` for deep pagination in new applications.
