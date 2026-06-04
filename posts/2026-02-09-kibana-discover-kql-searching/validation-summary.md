# Validation Summary: How to Use Kibana Discover with KQL for Advanced Log Searching

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kibana Discover
- Kibana Query Language (KQL)
- Lucene query syntax
- Elasticsearch field mappings and nested fields

## Sources Consulted
- Elastic documentation: Kibana Query Language reference, https://www.elastic.co/docs/reference/query-languages/kql
- Elastic documentation: Explore fields and data with Discover, https://www.elastic.co/docs/explore-analyze/discover/discover-get-started
- Elastic documentation: Save a search for reuse, https://www.elastic.co/guide/en/kibana/current/save-open-search.html
- Elastic documentation: Save a query, https://www.elastic.co/guide/en/kibana/8.19/save-load-delete-query.html

## Issues Found
- The post stated that KQL values are case-insensitive by default. Elastic documents exact matching, including case, for keyword fields, with text fields governed by their analyzer. Updated the field query and case sensitivity sections to reflect mapping-dependent behavior.
- Several examples used leading wildcards such as `*timeout*` as if they work by default. Elastic documents that leading wildcards are disabled by default unless `query:allowLeadingWildcards` is enabled. Reworked examples to use trailing wildcards and added the setting caveat.
- Several KQL snippets included `#` comments inside query blocks. KQL does not support shell-style comments, so those snippets would not be valid if copied into Discover. Removed the comments from KQL examples.
- Some examples used `A NOT B` without an explicit boolean connector. Updated them to `A AND NOT B` to match documented KQL boolean syntax.
- The nested field section described nested fields as plain dot-notation queries. Updated it to distinguish normal object fields from Elasticsearch `nested` fields, which require KQL's nested query syntax.
- The phrase query section showed a wildcard inside a quoted phrase. Updated the explanation to keep quoted phrases for ordered phrase matching and direct wildcard usage to unquoted wildcard terms.
- The escaping section listed unsupported special characters and escaped a colon inside a quoted URL. Updated the escaping list to Elastic's documented KQL special characters and used a quoted URL without unnecessary escaping.
- The Discover query bar description said results update in real time as the user types. Updated it to match Discover behavior: the query runs when the user presses Enter or refreshes, while the bar provides suggestions as the user types.
- The performance section implied that placing an indexed field first in a boolean query makes it faster. Reworded it to recommend exact indexed fields instead, since boolean clause order in the KQL string is not the relevant optimization.
- The saved query section blurred saved queries and saved Discover sessions. Updated it to distinguish saved query text/filter/time-range reuse from saved Discover sessions that preserve the Discover view.

## Review Notes
The post remains a practical KQL guide. Some examples still depend on the reader's Elasticsearch mappings, especially text-field analysis and custom ECS-like field names, which is normal for KQL content.
