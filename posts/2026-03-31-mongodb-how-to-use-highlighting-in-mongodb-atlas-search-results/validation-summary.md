# Validation Summary: How to Use Highlighting in MongoDB Atlas Search Results

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- MongoDB Aggregation Pipeline (`$search`, `$project`, `$addFields`, `$sortArray`)
- JavaScript / Node.js (rendering examples)
- Python (rendering examples)

## Sources Consulted
- [Highlight Search Terms in Results - MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/atlas-search/highlighting/)
- [Process Results with Search Options - MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/atlas-search/search-options/)
- [Operators and Collectors - MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/atlas-search/operators-and-collectors/)
- [$search Aggregation Stage - MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/atlas-search/aggregation-stages/search/)
- [Visually Showing Atlas Search Highlights with JavaScript and HTML - MongoDB Developer](https://www.mongodb.com/developer/products/atlas/visually-showing-atlas-search-highlights-javascript-html/)

## Issues Found
- **`maxNumPassages` scope mislabeled as "per field"**: Two inline comments incorrectly described `maxNumPassages` and `maxCharsToExamine` as applying "per field." According to MongoDB documentation, these options apply **per document**. Fixed in the "Highlighting Multiple Fields" section (`maxNumPassages: 3` and `maxCharsToExamine: 100000` comments) and the "Highlight Options" section (`maxNumPassages: 5` and `maxCharsToExamine: 500000` comments).

## Review Notes
- The claim "Highlighting works with any Atlas Search operator" is nearly correct — the only exception is the `embeddedDocument` operator, which does not support highlighting. This is a very minor oversimplification and acceptable for the scope of this tutorial.
- The JavaScript and Python rendering examples insert `fragment.value` directly into HTML without escaping. In a production application, this could be an XSS vector if the indexed data contains untrusted content. This is acceptable for a tutorial demonstrating the concept, but readers building production applications should sanitize output.
- The post does not mention that fields must be indexed with a supported mapping type (e.g., using a string analyzer) for highlighting to return results. This is an omission rather than an error.
- The `$sortArray` operator used in the "Selecting the Best Passage" example requires MongoDB 5.2+. This version dependency is not mentioned but is a minor omission.
