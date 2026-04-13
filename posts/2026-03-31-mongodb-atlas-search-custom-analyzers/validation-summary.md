# Validation Summary: How to Use Custom Analyzers in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Search
- Lucene-based custom analyzers (tokenizers, character filters, token filters)
- MongoDB aggregation pipeline (`$search` stage)

## Sources Consulted
- MongoDB Atlas Search Custom Analyzers documentation: https://www.mongodb.com/docs/atlas/atlas-search/define-custom-analyzers/
- MongoDB Atlas Search Token Filters reference: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/custom/#token-filters
- MongoDB Atlas Search Character Filters reference: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/custom/#character-filters
- MongoDB Atlas Search Tokenizers reference: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/custom/#tokenizers
- MongoDB Atlas Search Multi Analyzer documentation: https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/#multi

## Issues Found
1. **Incorrect stemming token filter type name**: The post used `"type": "stemming"` which does not exist in Atlas Search. Changed to `"type": "snowballStemming"`, which is the correct type name. The `stemmerName` parameter and `"english"` value were already correct.

2. **Invalid `includeOriginal` parameter on shingle filter**: The shingle token filter does not support an `includeOriginal` parameter. Only `minShingleSize` and `maxShingleSize` are valid. Removed the `"includeOriginal": true` line.

3. **Missing required `matches` parameter on regex filter**: The `regex` token filter requires a `matches` parameter (`"all"` or `"first"`) in addition to `pattern` and `replacement`. Added `"matches": "all"` to the example.

4. **Non-existent `analyzeQuery` UI feature**: There is no `analyzeQuery` panel in the Atlas UI. Replaced with references to the actual features: the "Search Tester" and the "View text analysis" panel in the Visual Editor.

## Review Notes
- The "Using a Custom Analyzer at Query Time" section mentions `searchAnalyzer` in the prose but does not actually demonstrate it in the code example. The code example shows a basic `$search` query without specifying a `searchAnalyzer`. This is not technically incorrect (the prose says "if you omit it, Atlas Search uses the same analyzer as the index"), but a reader might expect to see `searchAnalyzer` used in the example. Left as-is since the explanation is accurate.
- The `lucene.keyword` analyzer described for "exact-phrase matching" in the multi-analyzer section is technically for exact (whole-value) matching, not phrase matching. The distinction is subtle and the usage is common enough that it's not misleading in context.
