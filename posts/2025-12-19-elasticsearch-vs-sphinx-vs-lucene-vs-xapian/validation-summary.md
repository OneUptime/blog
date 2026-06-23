# Validation Summary: How to Compare Elasticsearch vs Sphinx vs Lucene vs Xapian

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Elasticsearch
- Apache Lucene
- Sphinx Search
- Xapian
- Java
- Python
- SphinxQL

## Sources Consulted
- Apache Lucene 10.3.0 documentation: https://lucene.apache.org/core/10_3_0/
- Apache Lucene FSDirectory API documentation: https://lucene.apache.org/core/10_3_0/core/org/apache/lucene/store/FSDirectory.html
- Apache Lucene QueryParser API documentation: https://lucene.apache.org/core/10_3_0/queryparser/org/apache/lucene/queryparser/classic/QueryParser.html
- Elasticsearch API documentation for document indexing: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-index-2
- Elasticsearch API documentation for search: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search
- Elastic licensing FAQ: https://www.elastic.co/pricing/faq/licensing
- Sphinx Search reference manual: https://sphinxsearch.com/docs/current.html
- Sphinx Search commercial licensing page: https://sphinxsearch.com/services/embedding/
- Xapian Python bindings documentation: https://xapian.org/docs/bindings/python/xapian.html
- Xapian TermGenerator API documentation: https://xapian.org/docs/apidoc/html/classXapian_1_1TermGenerator.html
- Xapian QueryParser API documentation: https://xapian.org/docs/apidoc/html/classXapian_1_1QueryParser.html
- Xapian Query API documentation: https://xapian.org/docs/apidoc/html/classXapian_1_1Query.html
- Xapian licensing page: https://trac.xapian.org/wiki/Licensing

## Issues Found
- The Lucene Java example used `Paths.get(...)` without importing `java.nio.file.Paths`. Added the missing import so the snippet is syntactically complete.
- The Lucene cons said applications must handle persistence themselves. Lucene persists indexes through directory implementations such as `FSDirectory`; revised the statement to say applications must handle index lifecycle and backups.
- The Elasticsearch license was listed only as SSPL. Elastic's current licensing FAQ describes ELv2/SSPL/AGPLv3 source licensing, with the default distribution under Elastic License 2.0, so the license table and license concern bullet were updated.
- The Sphinx comparison table described real-time support only as delta indexes. Sphinx supports RT indexes, so the table now says RT/delta indexes.
- The Sphinx real-time index example used `CREATE TABLE`, which is not how Sphinx Search declares RT indexes in the official manual. Replaced it with an `sphinx.conf` RT index declaration and kept the SphinxQL insert/search statements separate.
- The Xapian license was listed as GPL v2. Xapian documents its license as GPLv2-or-later, so the table now says GPL v2+.
- The Xapian range-query example used value slot `0`, but the indexing example did not store a value in that slot. Added `doc.add_value(0, "2024-06-01")` to make the range example meaningful.

## Review Notes
The performance tables are plausible illustrative ranges, but actual indexing speed, latency, and memory usage depend heavily on schema, analyzers, storage, hardware, corpus shape, and query mix. They should be treated as rough examples rather than benchmark guarantees.
