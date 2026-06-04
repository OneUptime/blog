# Validation Summary: How to Run Apache Solr in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Solr
- Solr Docker image
- Docker Compose
- Solr schema.xml and solrconfig.xml
- Solr JSON update API
- Solr query syntax, faceting, highlighting, and suggester
- SolrCloud and ZooKeeper
- Python pysolr client

## Sources Consulted
- Apache Solr Reference Guide: Solr in Docker - https://solr.apache.org/guide/solr/9_9/deployment-guide/solr-in-docker.html
- Apache Solr Reference Guide: Solr Control Script Reference - https://solr.apache.org/guide/solr/latest/deployment-guide/solr-control-script-reference.html
- Apache Solr Reference Guide: Field Type Definitions and Properties - https://solr.apache.org/guide/solr/9_10/indexing-guide/field-type-definitions-and-properties.html
- Apache Solr Reference Guide: Field Types Included with Solr - https://solr.apache.org/guide/solr/latest/indexing-guide/field-types-included-with-solr.html
- Apache Solr Reference Guide: Filters - https://solr.apache.org/guide/solr/latest/indexing-guide/filters.html
- Apache Solr Reference Guide: Indexing with Update Handlers - https://solr.apache.org/guide/solr/latest/indexing-guide/indexing-with-update-handlers.html
- Apache Solr Reference Guide: Suggester - https://solr.apache.org/guide/solr/latest/query-guide/suggester.html
- Apache Solr Reference Guide: Collections API / Collection Management - https://solr.apache.org/guide/solr/latest/deployment-guide/collection-management.html
- Docker Docs: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- pysolr project documentation - https://pypi.org/project/pysolr/
- Apache Solr Wiki: Public servers using Solr - https://cwiki.apache.org/confluence/display/solr/PublicServers

## Issues Found
- The quick-start comment described a core as a "collection in standalone mode." In Solr terminology, standalone/user-managed mode uses cores, while SolrCloud uses collections. Updated the comment to say "core in standalone mode."
- The Docker Compose examples used the obsolete top-level `version` field. Removed it because the current Compose Specification keeps it only for backward compatibility and Docker Compose warns that it is obsolete.
- The XML snippets placed comments before the XML declaration. XML declarations must appear at the start of the XML document, so the comments were moved below the declaration.
- The schema referenced `stopwords.txt`, but the setup commands did not create that file. Added `touch solr-config/products/conf/stopwords.txt` so the referenced resource exists in the custom configset.
- The suggester was configured with `buildOnStartup` only, which would build before the sample documents were indexed. Added `buildOnCommit` so the suggester is rebuilt after the commit shown in the indexing section.

## Review Notes
The technical examples are otherwise consistent with Solr 9 Docker usage and Solr's documented JSON update, query, field type, suggester, SolrCloud, and pysolr patterns. A live Docker run was not completed because Docker Hub returned an unauthenticated pull-rate-limit error for `solr:9`; the review therefore relied on official documentation rather than container execution.
