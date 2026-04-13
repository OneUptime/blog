# Validation Summary: How to Build Custom Analyzers with Token Filters in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- Custom Analyzers (token filters, tokenizers, character filters)
- Full-Text Search with `$search` aggregation stage

## Sources Consulted
- [MongoDB Atlas Search Token Filters Documentation](https://www.mongodb.com/docs/atlas/atlas-search/analyzers/token-filters/)
- [MongoDB Atlas Search Tokenizers Documentation](https://www.mongodb.com/docs/atlas/atlas-search/analyzers/tokenizers/)
- [MongoDB Atlas Search Character Filters Documentation](https://www.mongodb.com/docs/atlas/atlas-search/analyzers/character-filters/)
- [MongoDB Atlas Search Custom Analyzers Documentation](https://www.mongodb.com/docs/atlas/atlas-search/analyzers/custom/)

## Issues Found

1. **snowballStemming filter used wrong property name and value**: The post used `"language": "English"` but the correct property name is `"stemmerName"` and the value should be lowercase `"english"`. Fixed to `"stemmerName": "english"`.

2. **Section title/code mismatch for accent removal**: The section was titled "Accent Removal (asciiFolding)" but the code example used `icuFolding`, which is a different filter. `asciiFolding` converts non-Basic-Latin Unicode to ASCII equivalents, while `icuFolding` applies broader Unicode folding per ICU/UTR#30. Since the code correctly used `icuFolding`, the section title was updated to "Accent Removal (icuFolding)" to match.

3. **shingle filter used non-existent property**: The shingle token filter example included `"includeOriginal": true`, which is not a valid property for the shingle filter in Atlas Search. The shingle filter only accepts `type`, `minShingleSize`, and `maxShingleSize`. Removed the invalid property.

## Review Notes
- The `stopword` filter's `ignoreCase` property defaults to `true` when omitted, so explicitly setting it is fine but not strictly necessary.
- All other token filter types (`lowercase`, `porterStemming`, `length`, `icuFolding`, `trim`), the `htmlStrip` character filter, and the `standard` tokenizer with `maxTokenLength` are all correctly configured per the official documentation.
- The `$search` query example is syntactically correct and follows standard Atlas Search usage patterns.
