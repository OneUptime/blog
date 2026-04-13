# Validation Summary: How to Build Custom Analyzers with Char Filters in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- Custom Analyzers (charFilters, tokenizer, tokenFilters)
- Character Filters: htmlStrip, icuNormalize, mapping
- MongoDB Aggregation Pipeline ($search stage)
- Atlas Admin API (analyze endpoint)

## Sources Consulted
- MongoDB Atlas Search Character Filters documentation: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/character-filters/
- MongoDB Atlas Search Custom Analyzers documentation: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/custom/
- MongoDB Atlas Search Index Definition Reference: https://www.mongodb.com/docs/atlas/atlas-search/index-definitions/
- MongoDB Atlas Search $search aggregation stage: https://www.mongodb.com/docs/atlas/atlas-search/aggregation-stages/search/
- MongoDB Atlas Search text operator: https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/text/
- MongoDB Atlas Admin API v2 reference: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/

## Issues Found
1. **Missing required `ignoredTags` field on `htmlStrip` char filter** (line 105): In the "Applying the Custom Analyzer to an Index" section, the `htmlStrip` char filter was defined as `{ "type": "htmlStrip" }` without the `ignoredTags` field. Per the official MongoDB docs, `ignoredTags` is a required attribute. Fixed by adding `"ignoredTags": []` to strip all HTML tags.

2. **Incorrect Atlas Search analyze API URL** (line 139): The curl example used the path `https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/analyze`. The correct Atlas Admin API v2 path includes the `/fts/` segment: `https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/fts/analyze`. Fixed the URL to use the v2 API with the correct path.

## Review Notes
- The post covers three of the four available char filter types. The `persian` char filter (which replaces zero-width non-joiner characters with spaces) is not mentioned, but this is acceptable since the post focuses on the most commonly used char filters.
- The custom analyzer structure, index definition format, and $search query syntax are all correct per official documentation.
- The analyze API curl example may require authentication headers (e.g., digest auth or API key) to work in practice, which is not shown but is reasonable to omit for brevity.
