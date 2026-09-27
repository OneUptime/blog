# Validation Summary: How to Query OpenSearch Log Arrays with Object and Nested Mappings

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenSearch object and nested mappings
- OpenSearch Query DSL: Boolean filters, term, range, and nested queries
- Inner hits and parent document results
- Index creation, document indexing, mapping inspection, and reindexing
- OpenSearch Piped Processing Language (PPL)
- Log data modeling and observability

## Sources Consulted
- [Nested field type](https://docs.opensearch.org/latest/mappings/supported-field-types/nested/) — object-array flattening and preservation of element relationships through nested documents.
- [Nested query](https://docs.opensearch.org/latest/query-dsl/joining/nested/) — nested scope, parent results, `path`, `score_mode`, `ignore_unmapped`, and `inner_hits`.
- [Boolean query](https://docs.opensearch.org/latest/query-dsl/compound/bool/) — conjunction of filter predicates.
- [Term query](https://docs.opensearch.org/latest/query-dsl/term/term/) — exact-value matching.
- [Range query](https://docs.opensearch.org/latest/query-dsl/term/range/) — inclusive `gte` comparisons.
- [Create Index API](https://docs.opensearch.org/latest/api-reference/index-apis/create-index/) — index creation with explicit mappings.
- [Index Document API](https://docs.opensearch.org/latest/api-reference/document-apis/index-document/) — document IDs, replacement through PUT, and `refresh=wait_for`.
- [Get Index Mappings API](https://docs.opensearch.org/latest/api-reference/index-apis/get-mapping/) — inspection of concrete index mappings.
- [Create or Update Index Mappings API](https://docs.opensearch.org/latest/api-reference/index-apis/put-mapping/) — restrictions on changing existing field types and migration through a new index.
- [Reindex Documents API](https://docs.opensearch.org/latest/api-reference/document-apis/reindex/) — destination configuration and dependence on retained `_source`.
- [PPL fields command](https://observability.opensearch.org/docs/ppl/commands/fields/) — projection and dotted field access.
- [OpenSearch SQL/PPL limitations](https://github.com/opensearch-project/sql/blob/main/docs/user/ppl/limitations/limitations.md) — array and complex nested-type limitations.

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all seven HTTP requests and successfully parsed all six JSON request bodies. These are REST console examples, not terminal shell commands.
- The object fixture matches because its two filters can be satisfied by different array elements. The nested fixture requires both predicates on one element, so it produces zero parent hits for the supplied data. Replacing the payment status with 502 makes that element satisfy both conditions.
- Separate nested clauses can independently match different children of the same parent. Keeping both predicates inside one nested query correctly prevents this outcome.
- `score_mode: "none"` and empty `inner_hits` configuration are supported. Parent results and matching nested results represent different counting units.
- `ignore_unmapped` applies to absent paths; it does not convert an existing object mapping into a nested mapping. The article appropriately limits its advice to indexes that omit the field.
- Reindexing uses retained source documents and the destination mapping. It cannot recover relationships discarded before storage. Updating ingestion templates and aliases is appropriate migration guidance.
- Nested objects require separate indexed documents; the workload-dependent suggestion to consider separate event documents is reasonable. No universal performance claim is made.
- PPL projection alone does not establish predicate correlation. The article correctly recommends checking the installed engine's behavior instead of asserting universal PPL array support.
- All three technical documentation links in the article resolve to the intended official resources. The author URL is a plausible GitHub profile link and is not a technical reference.
- No specific OpenSearch release is claimed, and no deprecated API usage was identified in the reviewed examples. Documentation was checked using the official latest references.
- Validation consisted of documentation review and local JSON parsing; requests were not executed against a live OpenSearch cluster. Expected search outcomes are supported by the documented query semantics.
- README.md required no changes.
