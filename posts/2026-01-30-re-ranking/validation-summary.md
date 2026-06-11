# Validation Summary: How to Create Re-Ranking

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Cross-encoder re-ranking (sentence-transformers)
- HuggingFace models: `cross-encoder/ms-marco-MiniLM-L-6-v2`, `cross-encoder/ms-marco-MiniLM-L-12-v2`, `all-MiniLM-L6-v2`, BGE Reranker
- Transformers.js (`@xenova/transformers`) for Node.js
- OpenAI Python SDK (`gpt-4o-mini`) for LLM-based re-ranking
- FastAPI for Python re-ranking microservice
- Cohere Rerank API (mentioned)
- Evaluation metrics: MRR, NDCG@k
- RAG pipeline architecture
- Retrieval-Augmented Generation patterns

## Sources Consulted
- sentence-transformers documentation (CrossEncoder, SentenceTransformer APIs): https://www.sbert.net/docs/cross_encoder/usage/usage.html
- HuggingFace model card for `cross-encoder/ms-marco-MiniLM-L-6-v2`: https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2
- HuggingFace model card for `Xenova/ms-marco-MiniLM-L-6-v2` (ONNX): https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2
- Transformers.js text-classification pipeline docs (text/text_pair input shape)
- OpenAI Python SDK reference for `chat.completions.create`: https://platform.openai.com/docs/api-reference/chat
- Standard MRR and NDCG@k definitions from IR literature

## Issues Found

1. **TypeScript Transformers.js input format was incorrect.** The original code formatted the query/document pair as a single string with a literal `[SEP]` substring:
   ```ts
   const input = `${query} [SEP] ${doc.text}`;
   const result = await reranker(input);
   ```
   The Transformers.js tokenizer treats `[SEP]` here as ordinary text rather than the BERT special separator token, so the model never receives the proper `[CLS] query [SEP] document [SEP]` sequence with correct `token_type_ids`. The correct pattern for text-pair classification is to pass an object with `text` and `text_pair`. Replaced the manual string concatenation with `await reranker({ text: query, text_pair: doc.text })` so the tokenizer produces the right paired input.

2. **MRR evaluation was silently broken by an extra list wrapping.** In `evaluate_reranker`, the code did:
   ```python
   mrr_scores.append([new_rels])
   ```
   `new_rels` is already a list of binary relevance labels (e.g., `[1, 0, 1]`). Wrapping it as `[new_rels]` produced `[[1, 0, 1]]`, which means inside `mean_reciprocal_rank` the loop `for i, rel in enumerate(labels)` yielded `rel = [1, 0, 1]` (a list), so `if rel == 1` was always false and MRR collapsed to 0 for every query. Changed to `mrr_scores.append(new_rels)` to match the documented `List[List[int]]` signature of `mean_reciprocal_rank`.

## Review Notes
- The unused `from functools import lru_cache` imports in the production reranker and cached reranker examples are dead but not technically wrong; left them alone per the "only fix technical errors" guidance.
- `cross-encoder/ms-marco-MiniLM-L-6-v2` is a regression-style cross-encoder that outputs a single relevance logit. When invoked through Transformers.js's `text-classification` pipeline, the pipeline still returns a `{label, score}` shape, and ordering by `score` is meaningful for relative ranking even though the value isn't a calibrated probability. This is a useful caveat for readers who want to set an absolute `score_threshold` on the JS side.
- The cosine-similarity loop inside `RAGPipeline.retrieve` is correct but O(N) per query; the post already notes that production should use a vector DB, so no change needed.
- The post mentions Cohere Rerank and "GPT-4 / Claude" in the model selection table without code; both are valid options and the qualitative comparison is reasonable.
- The pairwise LLM re-ranker is O(n^2) as the comment warns. The implementation is correct but readers should be aware token costs scale quadratically with the candidate count.
