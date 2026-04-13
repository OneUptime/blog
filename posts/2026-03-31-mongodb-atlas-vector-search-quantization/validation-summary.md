# Validation Summary: How to Use Quantization to Reduce Vector Storage in MongoDB Atlas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Vector Search
- Vector quantization (scalar and binary)
- Python (pymongo)
- OpenAI embedding models (text-embedding-3-small, text-embedding-3-large, ada-002)

## Sources Consulted
- MongoDB Atlas Vector Search Quantization documentation: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-quantization/
- MongoDB $vectorSearch aggregation stage documentation: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
- MongoDB blog - Scaling Vector Search with Quantization and Voyage AI: https://www.mongodb.com/company/blog/technical/scaling-vector-search-mongodb-atlas-quantization-voyage-ai-embeddings
- MongoDB blog - Why Vector Quantization Matters for AI Workloads: https://www.mongodb.com/company/blog/innovation/why-vector-quantization-matters-for-ai-workloads
- MongoDB blog - Binary Quantization and Rescoring: https://www.mongodb.com/blog/post/binary-quantization-rescoring-96-less-memory-faster-search
- MongoDB Atlas Vector Search Benchmark Overview: https://www.mongodb.com/docs/atlas/atlas-vector-search/benchmark/overview/

## Issues Found

### 1. Incorrect recommendation of `dotProduct` over `cosine` for binary quantization
- **What was wrong:** The post stated "Use `dotProduct` similarity rather than `cosine` for binary quantization" and used `dotProduct` in the binary quantization index example. MongoDB's official documentation and examples consistently use `cosine` with automatic binary quantization. The `dotProduct` preference is not an official MongoDB recommendation.
- **What was changed:** Changed the binary quantization example from `"similarity": "dotProduct"` to `"similarity": "cosine"`. Removed the prescriptive claim about using `dotProduct` over `cosine`. Updated the summary paragraph to remove the `dotProduct` recommendation.
- **Why:** The recommendation was unsupported by official MongoDB documentation and could mislead readers into using a non-standard configuration.

### 2. Incorrect minimum dimension threshold for binary quantization
- **What was wrong:** The post stated binary quantization "works best with models that produce high-dimensional embeddings (1536 or 3072 dimensions)" and "is most effective for models with 1536+ dimensions." MongoDB's benchmarks and documentation indicate the effective threshold is 1024+ dimensions, not 1536+.
- **What was changed:** Updated "1536 or 3072 dimensions" to "1024 dimensions or more" and "1536+" to "1024+" in the recommendation table context.
- **Why:** MongoDB's benchmark data shows good recall at 1024 dimensions with binary quantization. The Voyage AI tutorial successfully uses 1024-dimensional vectors with binary quantization. Overstating the minimum by 50% could discourage users with 1024-dim embeddings from using the feature.

## Review Notes
- The compression ratio claims (4x for scalar, 32x for binary) are correct for the raw vector data. However, total index RAM reduction is slightly less (approximately 3.75x for scalar, 24x for binary) because the HNSW graph overhead does not shrink with quantization. The blog's framing is acceptable since it focuses on storage rather than total RAM, but readers should be aware of this distinction.
- The storage calculations (60GB raw, 15GB scalar, 1.9GB binary for 10M x 1536-dim vectors) are arithmetically correct for the vector data portion.
- The $vectorSearch aggregation pipeline syntax is correct and matches current MongoDB documentation.
- The Python code example is syntactically correct and uses current pymongo APIs.
- The recall percentages cited (97% for scalar, 95% for binary with increased numCandidates) are plausible based on MongoDB's published benchmarks, though actual recall varies by dataset and model.
