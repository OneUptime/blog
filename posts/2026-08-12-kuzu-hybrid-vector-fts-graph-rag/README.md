# How to Combine Kuzu Vector Search, Full-Text Search, and Graph Traversal for Graph RAG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Graph RAG, Vector Search, Full-Text Search, Knowledge Graph, Retrieval

Description: Build a Kuzu Graph RAG retriever that fuses semantic and lexical candidates, expands only relevant graph context, and preserves evidence for grounded generation.

---

A robust Graph RAG retriever should not force vector search, full-text search, and graph traversal into one undifferentiated ranking score. Use Kuzu's vector index for semantic candidates, its FTS index for exact terms and rare names, fuse the ranked lists with a rank-based method, then traverse from the fused entities under strict relation, depth, permission, and size bounds. The generator should receive compact evidence with stable IDs and provenance, not an arbitrary graph dump.

Kuzu 0.11.3 is archived but bundles the `vector` and `fts` extensions, making this design self-contained for pinned deployments. Load the bundled extensions locally; do not depend on the retired public extension server. LadybugDB is the maintained successor, but package names, database compatibility, and current capabilities should be evaluated as a migration rather than assumed.

## Model Retrieval Units Explicitly

Separate documents, chunks, entities, and sources so each retrieval result has an explainable path back to evidence:

~~~cypher
CREATE NODE TABLE Document(
    document_id STRING PRIMARY KEY,
    title STRING,
    source_uri STRING,
    tenant_id STRING
);

CREATE NODE TABLE Chunk(
    chunk_id STRING PRIMARY KEY,
    text STRING,
    embedding FLOAT[384],
    tenant_id STRING
);

CREATE NODE TABLE Entity(
    entity_id STRING PRIMARY KEY,
    name STRING,
    kind STRING,
    tenant_id STRING
);

CREATE REL TABLE PART_OF(FROM Chunk TO Document, ordinal INT64);
CREATE REL TABLE MENTIONS(FROM Chunk TO Entity);
CREATE REL TABLE RELATED_TO(FROM Entity TO Entity, relation STRING);
~~~

Use durable application keys. Internal graph IDs are useful within an execution but should not become citations or cross-system identities. Store tenant or access-control attributes on every retrieval unit that needs independent filtering.

Chunk size and overlap affect both embedding relevance and lexical matches. Preserve the source URI, document ID, chunk ordinal, and ingestion version so retrieved text can be traced and revalidated.

## Build Both Indexes

Kuzu 0.11.3 ships the vector and FTS extension binaries. Load them, then build indexes after the bulk data is present:

~~~cypher
LOAD vector;
LOAD fts;

CALL CREATE_VECTOR_INDEX(
    'Chunk',
    'chunk_embedding_idx',
    'embedding',
    metric := 'cosine',
    efc := 200
);

CALL CREATE_FTS_INDEX(
    'Chunk',
    'chunk_text_idx',
    ['text']
);
~~~

The vector index supports fixed-length `FLOAT` or `DOUBLE` array properties on node tables. The query embedding must come from the same model, dimension, and preprocessing pipeline as stored embeddings.

Kuzu FTS indexes node-table string properties and queries them with BM25. Choose indexed fields intentionally; mixing titles and long body text can change lexical scoring. The archived documentation provides stemmer and stopword controls. Index changes and embedding changes should produce a new, versioned retrieval evaluation.

## Stage 1: Semantic Candidate Generation

Use the HNSW index to retrieve more than the final answer count:

~~~python
VECTOR_QUERY = """
CALL QUERY_VECTOR_INDEX(
    'Chunk',
    'chunk_embedding_idx',
    $embedding,
    $candidate_k,
    efs := $efs
)
RETURN node.chunk_id AS chunk_id,
       node.tenant_id AS tenant_id,
       distance
ORDER BY distance;
"""

vector_rows = conn.execute(
    VECTOR_QUERY,
    {
        "embedding": query_embedding.tolist(),
        "candidate_k": 80,
        "efs": 400,
    },
)
~~~

Tune `candidate_k` and `efs` with an exact-neighbor and end-to-end retrieval evaluation. Larger candidate lists improve fusion opportunities but increase downstream work.

For tenant or permission filtering, do not retrieve globally and merely hide forbidden text at rendering time. Kuzu's vector guide documents projected graphs for filtered search. Construct the eligible node set first and query the vector index through that projection. Treat authorization as a hard filter, not a ranking feature.

## Stage 2: Lexical Candidate Generation

FTS catches identifiers, product names, error codes, quoted phrases, and rare terms that embeddings may blur:

~~~python
FTS_QUERY = """
CALL QUERY_FTS_INDEX(
    'Chunk',
    'chunk_text_idx',
    $query,
    top := $candidate_k
)
RETURN node.chunk_id AS chunk_id,
       node.tenant_id AS tenant_id,
       score
ORDER BY score DESC;
"""

fts_rows = conn.execute(
    FTS_QUERY,
    {"query": user_query, "candidate_k": 80},
)
~~~

The function returns a BM25 score where higher ranks are better, while vector search returns a distance where lower is better. Raw values are not commensurate. Adding `0.7 * bm25 + 0.3 * cosine_distance` without calibrated transformations is mathematically arbitrary and can shift when corpus statistics or metrics change.

Use `conjunctive := true` only when all lexical terms must occur. Natural-language questions often benefit from the default disjunctive behavior; structured codes or multi-token names may not. Evaluate both on labeled queries.

## Stage 3: Fuse by Rank

Reciprocal rank fusion (RRF) combines ordered lists without pretending their scores share a scale:

~~~python
from collections import defaultdict

def reciprocal_rank_fusion(rankings, constant=60):
    fused = defaultdict(float)
    provenance = defaultdict(list)

    for channel, ids in rankings.items():
        for rank, chunk_id in enumerate(ids, start=1):
            fused[chunk_id] += 1.0 / (constant + rank)
            provenance[chunk_id].append((channel, rank))

    ordered = sorted(fused, key=fused.get, reverse=True)
    return [(chunk_id, fused[chunk_id], provenance[chunk_id])
            for chunk_id in ordered]
~~~

Deduplicate by stable chunk ID. Preserve the vector rank, FTS rank, distance, BM25 score, and fusion contribution for debugging. The RRF constant and channel candidate counts are hyperparameters; evaluate rather than inheriting 60 as a law.

You may give different channels different weights after offline evaluation, but retain rank-based normalization. Include lexical-only and semantic-only fallbacks: a missing query embedding should not disable exact-term retrieval, and a stopword-only FTS query should not erase useful semantic candidates.

## Stage 4: Traverse From Fused Seeds

Pass only the top fused chunk IDs back into a parameterized graph query:

~~~cypher
UNWIND $chunk_ids AS chunk_id
MATCH (c:Chunk)-[:PART_OF]->(d:Document)
WHERE c.chunk_id = chunk_id
  AND c.tenant_id = $tenant_id
OPTIONAL MATCH (c)-[:MENTIONS]->(e:Entity)
RETURN c.chunk_id,
       c.text,
       d.document_id,
       d.title,
       d.source_uri,
       collect(DISTINCT e.entity_id) AS entities;
~~~

Then, if the use case benefits from graph expansion, issue a bounded entity query:

~~~cypher
UNWIND $entity_ids AS entity_id
MATCH (seed:Entity)
WHERE seed.entity_id = entity_id
  AND seed.tenant_id = $tenant_id
OPTIONAL MATCH (seed)-[path:RELATED_TO* TRAIL 1..2]->(neighbor:Entity)
WHERE neighbor.tenant_id = $tenant_id
RETURN seed.entity_id,
       neighbor.entity_id,
       neighbor.name,
       length(path) AS hops
LIMIT $graph_row_limit;
~~~

The relationship label, direction, `TRAIL` semantic, and two-hop bound are deliberate. Kuzu defaults recursive relationships to `WALK`, which can revisit edges and explode in cyclic graphs. A final limit is not a substitute for a small traversal space; keep the seed count and depth bounded before execution.

Not every neighbor deserves context. Allowlist relation types relevant to the question, filter retired or low-confidence entities, and consider shortest paths when only connectivity distance matters.

## Stage 5: Assemble Evidence, Not a Graph Dump

Give the generator a compact structure such as:

~~~json
{
  "chunk_id": "chunk-1042",
  "text": "...",
  "source": {
    "document_id": "doc-18",
    "title": "Runbook",
    "uri": "https://docs.example/runbook"
  },
  "retrieval": {
    "vector_rank": 3,
    "fts_rank": 1,
    "fusion_score": 0.0323
  },
  "entities": ["service-api", "database-primary"],
  "graph_facts": [
    {"from": "service-api", "relation": "DEPENDS_ON", "to": "database-primary"}
  ]
}
~~~

Token-budget evidence in a stable order. Prefer source chunks that directly support an answer; graph facts can explain relationships but should not replace textual evidence when the answer requires a quoted policy or procedure. Include IDs and URIs so the application can render citations and audit hallucinations.

Do not feed embeddings, entire node objects, unrestricted neighbor properties, or duplicate chunks into the prompt. Redact sensitive fields before generation even if retrieval was authorized.

## Evaluate Each Stage and the Whole Pipeline

Create a labeled query set containing semantic paraphrases, exact names, codes, ambiguous entities, multi-hop questions, and permission boundaries. Measure:

- Vector recall@k against exact vector search.
- Lexical recall@k and precision for rare terms.
- Fused candidate recall and mean reciprocal rank.
- Entity-linking accuracy.
- Graph expansion precision by relation and hop.
- Context recall, context precision, grounded answer accuracy, and citation correctness.
- p50/p95 latency and token count per stage.
- Cross-tenant leakage: the expected value is zero.

Ablate vector, FTS, and graph stages individually. If graph expansion adds latency and distractors without improving grounded answers, narrow it or remove it for that query class.

## Operational Boundaries

Cache query embeddings by model version and normalized query only when privacy policy permits. Version indexes, corpus snapshot, embedding model, tokenizer/chunker, FTS options, and retrieval hyperparameters. Log stable IDs and ranks, not raw private text or vectors.

Set limits on vector `k`, `efs`, FTS `top`, fused seeds, entity seeds, traversal depth, returned graph rows, and total context tokens. Use timeouts and fall back gracefully: lexical-only, vector-only, or no graph expansion is better than returning unauthorized or ungrounded context.

## Official Documentation

- [Kuzu 0.11.3 bundled vector and FTS extensions](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu vector search extension](https://kuzudb.github.io/docs/extensions/vector/)
- [Kuzu full-text search extension](https://kuzudb.github.io/docs/extensions/full-text-search/)
- [Kuzu projected graphs](https://kuzudb.github.io/docs/extensions/algo/)
- [Kuzu recursive `MATCH` semantics](https://kuzudb.github.io/docs/cypher/query-clauses/match/)
- [Kuzu prepared statements](https://kuzudb.github.io/docs/get-started/prepared-statements/)
- [Kuzu node and relationship table DDL](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [LadybugDB maintained vector search documentation](https://docs.ladybugdb.com/extensions/vector/)

## Conclusion

Graph RAG works best as a staged retriever. Generate semantic and lexical candidates independently, fuse ranks while preserving provenance, expand only top entities through bounded and authorized graph patterns, and package traceable evidence for generation. Kuzu provides all three primitives in 0.11.3, but relevance comes from disciplined modeling, score handling, limits, and evaluation—not from concatenating every result into a prompt.
