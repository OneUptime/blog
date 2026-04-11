# How to Cache LLM Responses with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, LLM, Cache, AI

Description: Reduce LLM API costs and latency by implementing exact and semantic caching of LLM responses using Redis and vector embeddings.

---

LLM API calls are expensive and slow. Caching responses in Redis can dramatically reduce costs - users often ask the same or semantically similar questions. Redis supports both exact-match caching and semantic caching using vector embeddings.

## Installation

```bash
pip install redis openai sentence-transformers numpy
```

## Exact-Match Cache

Hash the prompt and store the response with a TTL:

```python
import redis
import hashlib
import json
import openai

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
client = openai.OpenAI()

def hash_prompt(prompt: str) -> str:
    return hashlib.sha256(prompt.strip().lower().encode()).hexdigest()

def cached_llm_call(prompt: str, model: str = "gpt-4o-mini",
                    ttl: int = 3600) -> str:
    cache_key = f"llm:exact:{hash_prompt(prompt)}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)["response"]

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}]
    )
    answer = response.choices[0].message.content

    r.setex(cache_key, ttl, json.dumps({"response": answer}))
    return answer
```

## Semantic Cache

Exact hashing misses semantically identical prompts phrased differently. Use vector similarity to find cached responses for near-duplicate questions:

```python
import numpy as np
from sentence_transformers import SentenceTransformer

r_bin = redis.Redis(host='localhost', port=6379, decode_responses=False)
embedder = SentenceTransformer('all-MiniLM-L6-v2')

# Create semantic cache index
r_bin.execute_command(
    'FT.CREATE', 'llm_cache_idx', 'ON', 'HASH',
    'PREFIX', '1', 'llm:sem:',
    'SCHEMA',
    'prompt', 'TEXT',
    'response', 'TEXT',
    'embedding', 'VECTOR', 'HNSW', '6',
    'TYPE', 'FLOAT32', 'DIM', '384',
    'DISTANCE_METRIC', 'COSINE'
)

def embed(text: str) -> bytes:
    vec = embedder.encode(text, normalize_embeddings=True)
    return vec.astype(np.float32).tobytes()

SIMILARITY_THRESHOLD = 0.12  # cosine distance below this = cache hit

def semantic_cached_call(prompt: str, ttl: int = 86400) -> str:
    query_vec = embed(prompt)

    # Search for a semantically similar cached prompt
    result = r_bin.execute_command(
        'FT.SEARCH', 'llm_cache_idx',
        '*=>[KNN 1 @embedding $vec AS score]',
        'PARAMS', 2, 'vec', query_vec,
        'RETURN', 3, 'prompt', 'response', 'score',
        'SORTBY', 'score',
        'DIALECT', 2
    )

    if result[0] > 0:
        raw = result[2]
        fields = {}
        for j in range(0, len(raw), 2):
            fields[raw[j].decode()] = raw[j+1].decode()
        score = float(fields.get('score', 1.0))
        if score < SIMILARITY_THRESHOLD:
            return fields['response']  # cache hit

    # Cache miss - call the LLM
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    answer = response.choices[0].message.content

    # Store in semantic cache
    cache_id = hash_prompt(prompt)
    r_bin.hset(f"llm:sem:{cache_id}", mapping={
        "prompt": prompt.encode(),
        "response": answer.encode(),
        "embedding": query_vec
    })
    r_bin.expire(f"llm:sem:{cache_id}", ttl)

    return answer
```

## Tracking Cache Performance

Monitor hit rate to measure cost savings:

```python
def tracked_call(prompt: str) -> dict:
    r.incr("llm:stats:total")
    query_vec = embed(prompt)
    result = r_bin.execute_command(
        'FT.SEARCH', 'llm_cache_idx',
        '*=>[KNN 1 @embedding $vec AS score]',
        'PARAMS', 2, 'vec', query_vec,
        'RETURN', 1, 'score', 'SORTBY', 'score', 'DIALECT', 2
    )
    if result[0] > 0:
        score = float(result[2][1].decode())
        if score < SIMILARITY_THRESHOLD:
            r.incr("llm:stats:hits")
            return {"source": "cache"}

    r.incr("llm:stats:misses")
    return {"source": "llm"}

def get_cache_stats() -> dict:
    total = int(r.get("llm:stats:total") or 0)
    hits = int(r.get("llm:stats:hits") or 0)
    return {"total": total, "hits": hits,
            "hit_rate": round(hits / total * 100, 1) if total else 0}
```

## Summary

Redis enables two layers of LLM caching: exact-match caching for repeated identical prompts and semantic caching for paraphrased questions. Semantic caching is especially valuable for chat applications where users ask the same question in different ways. Monitor your cache hit rate to quantify cost savings and tune the similarity threshold for your use case.
