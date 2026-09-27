# Validation Summary: How to Extract Fields from Multiline Log Bodies with OpenSearch PPL parse

## Status
validated

## Post Type
Technical guide with PPL queries and a REST API request.

## Technologies Covered
- OpenSearch Piped Processing Language (PPL)
- Java regular expressions and named capture groups
- Multiline log ingestion and query-time extraction
- JSON and the OpenSearch SQL/PPL REST API

## Sources Consulted
- OpenSearch parse command: https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/parse/
- Java SE 21 Pattern reference: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/regex/Pattern.html
- OpenSearch SQL and PPL API: https://docs.opensearch.org/latest/sql-and-ppl/sql-and-ppl-api/index/
- OpenSearch PPL syntax: https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/syntax/
- OpenSearch search command: https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/search/
- OpenSearch fields command: https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/fields/
- OpenSearch head command: https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/head/
- OpenSearch where command: https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/where/
- OpenSearch stats command: https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/stats/
- OpenSearch sort command: https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/sort/
- OpenSearch function reference: https://observability.opensearch.org/docs/ppl/functions/
- OpenSearch source metadata field: https://docs.opensearch.org/latest/mappings/metadata-fields/source/
- RFC 8259, JSON string escaping: https://www.rfc-editor.org/rfc/rfc8259#section-7

## Issues Found
- The explanation said the reason capture stops at the first line terminator. The character class excludes only CR and LF, whereas Java also recognizes Unicode line terminators such as U+0085, U+2028, and U+2029. Clarified that these examples assume LF, CRLF, or CR endings and that other Unicode line separators remain eligible for capture. The working queries and post structure are unchanged.

## Review Notes
- Confirmed the documented whole-field matching contract, named string captures, and parse limitations. Filtering before aggregation and sorting by the resulting count alias agree with the documented usage.
- Both distinct regex variants passed Java Matcher.matches() checks against seven fixtures: an LF stack trace, a header-only message, CRLF continuation lines, a missing reason, an unrelated message, an empty reason, and an unexpected prefix. Successful captures returned orderid 4821 and reason payment timeout; negative fixtures did not match.
- The local regex checks used OpenJDK 17.0.16; the linked Java SE 21 documentation describes the same regex constructs used here. No OpenSearch server version is pinned in the post.
- Parsed the REST request body with a JSON parser and verified that its decoded query exactly equals the first editor query with pipeline newlines replaced by spaces.
- Checked the article's technical links and API envelope against the official references. No deprecated API usage was identified.
- This was a documentation review with local Java regex and JSON checks, not an end-to-end execution against a running OpenSearch cluster. Execution-engine or release-specific behavior should be checked on the deployment used by readers.
