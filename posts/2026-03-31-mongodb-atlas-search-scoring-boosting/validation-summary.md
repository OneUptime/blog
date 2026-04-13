# Validation Summary: How to Use Scoring and Boosting in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- Apache Lucene (underlying engine)
- MongoDB Aggregation Pipeline (`$search` stage)

## Sources Consulted
- MongoDB Atlas Search scoring documentation (https://www.mongodb.com/docs/atlas/atlas-search/scoring/)
- MongoDB Atlas Search `text` operator documentation (https://www.mongodb.com/docs/atlas/atlas-search/text/)
- MongoDB Atlas Search `compound` operator documentation (https://www.mongodb.com/docs/atlas/atlas-search/compound/)
- MongoDB Atlas Search function score documentation (https://www.mongodb.com/docs/atlas/atlas-search/score/modify-score/)
- Apache Lucene BM25 similarity documentation

## Issues Found
1. **Incorrect scoring algorithm name (line 15)**: The post stated Atlas Search uses "TF-IDF (term frequency - inverse document frequency) scoring combined with field-length normalization." Atlas Search uses **BM25 (Best Match 25)** scoring, not TF-IDF. BM25 is an evolution of TF-IDF with term frequency saturation and configurable parameters, but it is a distinct algorithm. The MongoDB documentation explicitly states BM25 is the scoring algorithm used. Fixed the description to correctly reference BM25.

## Review Notes
- The `undefined` property name used for fallback values in boost-by-path and function score expressions is correct per MongoDB's API, though it looks unusual since `undefined` is a JavaScript keyword. This is the documented property name in MongoDB Atlas Search.
- The per-path boosting syntax (`{ value: "title", score: { boost: { value: 3 } } }` inside the `path` array) is a valid Atlas Search feature for applying different score modifications to different fields within a single operator.
- The function score example uses a code snippet rather than a complete aggregation pipeline, which is fine for illustrative purposes but readers will need to embed it in a full `$search` stage.
- All other code examples, including compound queries with `should` clauses, constant scoring, and `$meta: "searchScore"` projection, are syntactically correct and use current Atlas Search APIs.
