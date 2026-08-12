# How to Parameterize Kuzu Cypher Safely Without Replanning Every Query

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Cypher, Prepared Statements, Query Security, Python, Performance

Description: Use typed Kuzu parameters and version-aware prepared statements safely, while measuring rather than assuming what 0.11.3 caches between executions.

---

Parameterize every data value in Kuzu Cypher with `$name` and pass a typed parameter map through the client API. This prevents values from changing query structure, keeps query text stable, and gives Kuzu a reusable statement shape. For hot loops in APIs that expose a reusable prepared-statement object, prepare once per connection and execute it repeatedly.

There is an important Kuzu 0.11.3 caveat behind the phrase “without replanning.” The official guide says prepared statements make reuse more efficient, and the C++ API exposes `prepare()` plus parameterized execution. However, the 0.11.3 source rebinds a cached parsed statement during parameterized execution, and the Python wrapper deprecates separate public `prepare()` in favor of `execute(query, parameters)`, which automatically prepares a string. Do not promise zero compile work merely because an object is named `PreparedStatement`. Measure compile and execution times in the exact binding you ship.

That distinction does not weaken the security rule: values must still be parameters. It makes the performance claim accurate for a frozen engine.

## Values Belong in Parameters

Use named placeholders in Cypher:

~~~python
import kuzu

db = kuzu.Database("app.kuzu")
conn = kuzu.Connection(db)

query = """
MATCH (p:Person)
WHERE p.age >= $min_age
  AND p.age < $max_age
RETURN p.person_id, p.name
ORDER BY p.person_id
LIMIT $limit;
"""

result = conn.execute(
    query,
    {
        "min_age": 18,
        "max_age": 30,
        "limit": 100,
    },
)
~~~

Kuzu maps `$min_age` to the `min_age` dictionary key. Parameters are values, not text substitutions. The binder validates their presence and types before execution.

Do not interpolate:

~~~python
# Unsafe and creates a new query string for each value.
query = f"MATCH (p:Person) WHERE p.name = '{name}' RETURN p"
result = conn.execute(query)
~~~

A name containing a quote can break syntax; malicious input can alter the statement; and constantly changing text defeats any reuse opportunity. Escaping strings manually is not an adequate query API.

## Parameterize Writes Too

The same rule applies to `CREATE`, `MERGE`, `SET`, vector queries, and limits:

~~~python
upsert_person = """
MERGE (p:Person {person_id: $person_id})
ON CREATE SET p.created_at = $created_at,
              p.name = $name
ON MATCH SET p.name = $name
RETURN p.person_id;
"""

conn.execute(
    upsert_person,
    {
        "person_id": "person-42",
        "name": "Ada",
        "created_at": created_at,
    },
)
~~~

Use the stable primary key as the identifying `MERGE` property. If a mutable name is included in the match pattern, changing it can make the complete pattern fail to match and cause a primary-key collision on create.

Lists and vectors should be values rather than generated Cypher literals:

~~~python
result = conn.execute(
    """
    CALL QUERY_VECTOR_INDEX(
        'Document',
        'embedding_index',
        $embedding,
        $k,
        efs := $efs
    )
    RETURN node.document_id, distance
    ORDER BY distance;
    """,
    {
        "embedding": embedding.tolist(),
        "k": 20,
        "efs": 400,
    },
)
~~~

Check the target function's accepted parameter types. The vector index expects the query vector as a float list, `k` as an integer, and `efs` as an integer.

## Parameters Cannot Replace Every Token

Parameters represent data expressions. They are not a general macro system for labels, relationship-table names, property identifiers, keywords, sort direction, or arbitrary query fragments. This is not valid as a way to select a table:

~~~cypher
MATCH (n:$label) RETURN n;
~~~

If callers may choose among graph shapes, map a small trusted enum to complete, static query templates:

~~~python
QUERIES = {
    "person": "MATCH (n:Person) WHERE n.person_id = $id RETURN n.name",
    "company": "MATCH (n:Company) WHERE n.company_id = $id RETURN n.name",
}

query = QUERIES[requested_kind]  # Reject unknown keys.
result = conn.execute(query, {"id": requested_id})
~~~

For sort direction, choose between two static statements rather than appending raw request text. For property selection, use an allowlist that maps API fields to fixed query expressions. Never accept a Cypher snippet from an ordinary data parameter.

## Python 0.11.3: Prefer `execute(query, parameters)`

The Kuzu 0.11.3 Python source documents `Connection.execute()` as accepting either a query string or a `PreparedStatement`. When a string has parameters, it creates a prepared statement automatically. The public `prepare()` method still exists but emits a deprecation warning telling users to use the single-call `execute()` API.

Therefore, the supported Python pattern is:

~~~python
QUERY = """
MATCH (p:Person)
WHERE p.person_id = $person_id
RETURN p.name;
"""

def find_person(conn: kuzu.Connection, person_id: str):
    return conn.execute(QUERY, {"person_id": person_id})
~~~

Keep `QUERY` constant and reuse the connection appropriately, but do not bypass the supported API solely to silence compile timing. Kuzu 0.11.3's archived source is the authority for that binding.

If an existing application already holds an explicit Python `PreparedStatement`, `execute(prepared, params)` remains accepted by the wrapper. Treat it as legacy surface: pin the version, test deprecation behavior, and compare compilation summaries before deciding that it materially improves the loop.

## C++: Prepare Once Per Connection

The official prepared-statement guide demonstrates the lower-level C++ lifecycle:

~~~cpp
auto prepared = connection->prepare(
    "MATCH (p:Person) "
    "WHERE p.age >= $min_age AND p.age < $max_age "
    "RETURN p.name LIMIT $limit");

if (!prepared->isSuccess()) {
    throw std::runtime_error(prepared->getErrorMessage());
}

auto result = connection->execute(
    prepared.get(),
    std::make_pair(std::string{"min_age"}, int64_t{18}),
    std::make_pair(std::string{"max_age"}, int64_t{30}),
    std::make_pair(std::string{"limit"}, int64_t{100}));
~~~

Keep the prepared object with the connection that created it; Kuzu caches associated state in the client context. Do not move a statement between unrelated connections or keep it after its database/connection lifetime ends. Check both preparation and execution results.

Preparing once avoids resending and reparsing a changing string in application code, but 0.11.3 source shows that execution rebinds from the cached parsed statement and constructs a current logical plan. This can be necessary because parameter types and catalog state matter. Describe the benefit as stable, cached statement state—not a universal guarantee of one plan forever.

## Keep Parameter Types Stable

Pass values that match the schema consistently:

~~~python
# Prefer the declared INT64 shape every time.
params = {"person_id": "p-42", "min_age": 21, "limit": 50}
~~~

Avoid sometimes sending `"21"` and sometimes `21`, or `None` when a predicate requires an integer. A parameter used as a primary-key lookup should have the primary-key column's declared type. Client-side normalization makes failures deterministic and removes runtime casts from query text.

Complex values need deliberate mapping. Python `datetime`, `date`, `timedelta`, UUID, list, and dict values have documented Kuzu conversions. Test nulls, empty lists, nested lists, numeric width, and vector dimensions at the API boundary.

## Do Not Confuse Parameterization With Bulk Loading

A prepared `CREATE` or `MERGE` loop is safer than string concatenation, but it remains a loop of graph mutations. For millions of nodes or relationships, Kuzu recommends `COPY FROM`. Pass a DataFrame as a query parameter when that is the source:

~~~python
conn.execute(
    "COPY Person FROM $dataframe",
    {"dataframe": people_df},
)
~~~

Or let Kuzu read Parquet/CSV directly. Prepared statements optimize the shape of repeated online work; they do not turn per-row mutation into the engine's bulk ingestion pipeline.

## Measure Compilation and Execution Separately

Kuzu result summaries expose compiling and executing time in supported APIs and the CLI prints both. Benchmark at least these cases:

1. Literal query text changed on every iteration—unsafe baseline, never a deployment choice.
2. One constant parameterized string through the binding's recommended API.
3. An explicit reusable prepared object where the binding supports it without deprecation.
4. `COPY FROM` for a bulk workload.

Consume the same number of result rows, reuse the same connection, warm up separately, and test representative parameter selectivity. If compile time remains visible in 0.11.3, that matches the version's rebind/replan path; do not hide it in reporting.

Also profile total latency. Saving a fraction of a millisecond in parsing is irrelevant if a high-degree traversal produces a million rows.

## Operational Rules

- Keep query templates in source control and review them as code.
- Allowlist every structural choice that cannot be a parameter.
- Set query timeouts for user-driven searches.
- Log template identity and parameter types, but redact secrets and personal data.
- Add injection-shaped strings to tests: quotes, backslashes, Unicode, and Cypher-looking text should remain ordinary values.
- Test missing, extra, null, and wrong-type parameters.
- Pin Kuzu 0.11.3 and record the client binding version with benchmarks.

## Official Documentation

- [Kuzu 0.11.3 release notes](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu prepared statements guide](https://kuzudb.github.io/docs/get-started/prepared-statements/)
- [Kuzu Python client documentation](https://kuzudb.github.io/docs/client-apis/python/)
- [Kuzu 0.11.3 Python `Connection` source](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_py/connection.py)
- [Kuzu 0.11.3 prepared-statement implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/client_context.cpp)
- [Kuzu parameterized `LIMIT`](https://kuzudb.github.io/docs/cypher/query-clauses/limit/)
- [Kuzu DataFrame import by parameter](https://kuzudb.github.io/docs/import/copy-from-dataframe/)
- [LadybugDB maintained prepared-statement guide](https://docs.ladybugdb.com/get-started/prepared-statements/)

## Conclusion

Use `$parameters` for every value and static, allowlisted templates for every structural variation. Reuse a prepared statement per connection where the binding supports that lifecycle; in Kuzu 0.11.3 Python, follow the supported `execute(query, parameters)` path. Most importantly, be precise about performance: frozen 0.11.3 caches prepared state but rebinds and can rebuild a plan for execution, so “prepared” is not proof of zero replanning. Measure compilation separately, and use `COPY FROM` when the real workload is bulk ingestion.
