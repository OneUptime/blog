# Validation Summary: How to Choose Between Elasticsearch and Solr

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Elasticsearch
- Apache Solr
- Apache Lucene
- SolrCloud
- Apache ZooKeeper
- Elasticsearch Python client
- pysolr
- Apache Tika / Solr Cell

## Sources Consulted
- Elastic licensing FAQ: https://www.elastic.co/pricing/faq/licensing
- Elasticsearch dynamic mapping docs: https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-mapping
- Elasticsearch near real-time search docs: https://www.elastic.co/docs/manage-data/data-store/near-real-time-search
- Elasticsearch refresh API docs: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-refresh
- Elasticsearch discovery and cluster formation docs: https://www.elastic.co/docs/deploy-manage/distributed-architecture/discovery-cluster-formation/discovery-hosts-providers
- Elasticsearch pagination and scroll guidance: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results
- Elasticsearch Python client helpers: https://www.elastic.co/docs/reference/elasticsearch/clients/python/client-helpers
- Apache Solr Schema Factory Configuration: https://solr.apache.org/guide/solr/latest/configuration-guide/schema-factory.html
- Apache Solr Schemaless Mode: https://solr.apache.org/guide/solr/latest/indexing-guide/schemaless-mode.html
- Apache Solr Schema API: https://solr.apache.org/guide/solr/latest/indexing-guide/schema-api.html
- Apache Solr Field Types Included with Solr: https://solr.apache.org/guide/solr/latest/indexing-guide/field-types-included-with-solr.html
- Apache Solr Commits and Transaction Logs: https://solr.apache.org/guide/solr/latest/configuration-guide/commits-transaction-logs.html
- Apache Solr Pagination of Results: https://solr.apache.org/guide/solr/latest/query-guide/pagination-of-results.html
- Apache Solr JSON Request API: https://solr.apache.org/guide/solr/latest/query-guide/json-request-api.html
- Apache Solr JSON Facet API: https://solr.apache.org/guide/solr/latest/query-guide/json-facet-api.html
- Apache Solr Indexing with Solr Cell and Apache Tika: https://solr.apache.org/guide/solr/latest/indexing-guide/indexing-with-tika.html
- Apache Solr Streaming Expressions: https://solr.apache.org/guide/solr/latest/query-guide/streaming-expressions.html
- Apache Solr 9 major changes: https://solr.apache.org/guide/solr/latest/upgrade-notes/major-changes-in-solr-9.html
- pysolr project documentation: https://pypi.org/project/pysolr/

## Issues Found
- Elasticsearch licensing was outdated. Updated the license comparison and cost table to include Elastic License, SSPL, and AGPLv3 source options.
- The post described Elasticsearch as "real-time" and Solr as requiring manual commits. Updated this to "near real-time" and clarified Elasticsearch refresh behavior versus Solr soft/hard commit strategy.
- The Solr configuration comparison said Solr is static and `schema.xml`-only. Updated this to reflect managed schemas, Schema API support, and schemaless mode.
- The Elasticsearch architecture section claimed "masterless discovery" and showed clients talking only to the master node. Updated this to master election/discovery and showed clients connecting to data nodes.
- The Solr architecture diagram showed clients talking to ZooKeeper. Updated it so clients talk to Solr nodes while ZooKeeper coordinates SolrCloud.
- The Solr schema snippet used older field type aliases without definitions. Added explicit `FloatPointField` and `DatePointField` field type definitions and updated the fields to use them.
- The analytics comparison overstated Elasticsearch aggregations over Solr. Updated it to acknowledge Solr's JSON Facet API support for nested bucket and metric analytics.
- The ecosystem section referenced Banana and vague Hadoop support. Replaced Banana with Solr Admin UI and clarified that HDFS storage is a module in Solr 9.
- The document extraction recommendation said PDF/Word extraction was built in. Updated it to reference Solr Cell and Apache Tika.
- The Solr-to-Elasticsearch migration example only fetched the first 1,000 Solr documents. Updated it to use Solr cursor pagination with `cursorMark` and `sort='id asc'`.
- The Elasticsearch-to-Solr migration example had an incorrect `Solr` import/use and used manual scroll handling. Updated it to import `pysolr`, instantiate `pysolr.Solr`, and use the Elasticsearch Python client's `helpers.scan()`.

## Review Notes
The post remains a high-level comparison. Performance and product-selection claims are necessarily workload-dependent; future revisions could add version ranges and benchmark assumptions for stronger precision.
