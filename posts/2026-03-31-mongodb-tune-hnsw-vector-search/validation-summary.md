# Validation Summary: How to Tune HNSW Parameters for Vector Search in MongoDB

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- MongoDB Atlas Vector Search
- HNSW (Hierarchical Navigable Small World) algorithm
- Python (PyMongo)
- JavaScript (MongoDB Shell)

## Sources Consulted
- [How to Index Fields for Vector Search - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-type/)
- [Run Vector Search Queries ($vectorSearch) - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/)
- [MongoDB Vector Search Overview - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/)
- [Vector Quantization - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-quantization/)
- [Scaling Vector Search with MongoDB Atlas Quantization & Voyage AI Embeddings - MongoDB Blog](https://www.mongodb.com/company/blog/technical/scaling-vector-search-mongodb-atlas-quantization-voyage-ai-embeddings)
- [Index Creation for Vector Search - MongoDB Community Forums](https://www.mongodb.com/community/forums/t/index-creation-for-vector-search/265477)
- [Atlas Vector Search Performance Guide & Benchmarks - MongoDB Community Forums](https://www.mongodb.com/community/forums/t/atlas-vector-search-performance-guide-benchmarks/326613)
- [Benchmark for MongoDB Vector Search - MongoDB Docs](https://www.mongodb.com/docs/atlas/atlas-vector-search/tune-vector-search/)

## Issues Found

### 1. Incorrect vector storage calculation for float32 (Memory Estimation section)
- **What was wrong:** The post calculated vector storage for 10M 1536-dimensional float32 vectors as ~15 GB. Float32 uses 4 bytes per dimension, so the correct value is 10,000,000 * 1536 * 4 = ~57 GB. The blog appeared to use 1 byte per dimension (which is the int8/scalar-quantized size) instead of 4 bytes for float32.
- **What was changed:** Corrected "~15 GB for 1536-dim float32" to "~57 GB for 1536-dim float32" and updated the total from "~16.5 GB" to "~59 GB".

### 2. Incorrect scalar quantization storage estimate (Memory Estimation section)
- **What was wrong:** The post claimed scalar quantization drops vector storage to ~3.75 GB. Scalar quantization compresses from float32 (4 bytes) to int8 (1 byte), so the actual storage would be 10,000,000 * 1536 * 1 = ~14 GB, and total index ~16 GB.
- **What was changed:** Corrected "~3.75 GB, making total index ~5.3 GB" to "~14 GB (1 byte per dimension instead of 4), making total index ~16 GB".

## Review Notes

- **HNSW parameter configurability is uncertain:** As of the most recent available documentation and community discussions, MongoDB Atlas Vector Search does not clearly document user-configurable HNSW build-time parameters (`m`, `efConstruction`) in the index definition. A February 2024 MongoDB Community Forums discussion with a MongoDB engineer confirmed these parameters are used internally (with defaults m=16, efConstruction=100 matching Lucene defaults) but were not exposed to users at that time. The blog's JSON structure showing an `hnsw` object with `m` and `efConstruction` fields could not be verified against current official documentation (MongoDB docs pages are client-side rendered and inaccessible to automated tools). If MongoDB has since added this feature, the parameter names may differ from what's shown (some sources suggest `hnswOptions` with `maxEdges`/`numEdgeCandidates` rather than `hnsw` with `m`/`efConstruction`). Readers should verify the exact syntax against the current MongoDB Atlas documentation.
- **The `$vectorSearch` aggregation stage syntax** is correct and consistent with multiple official and third-party sources.
- **The quantization field placement** at the vector field level (sibling to `type`, `path`, `numDimensions`, `similarity`) is correct per the official MongoDB blog on scaling vector search.
- **The claim "99% recall with numCandidates = 100"** is a reasonable general guideline for well-tuned HNSW but is highly dependent on dataset characteristics and should be treated as approximate.
- **The HNSW graph memory formula** (numVectors * m * 8 bytes * 1.2) is a reasonable approximation consistent with HNSW implementations where layer 0 has up to 2*M connections and each connection ID is stored as a 4-byte integer.
