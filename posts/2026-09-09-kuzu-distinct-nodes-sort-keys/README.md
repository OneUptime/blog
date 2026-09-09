# Preserve Sort Keys While Returning Distinct Nodes in Kuzu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Cypher, Graph Database, Sorting, Query Optimization

Description: Return one Kuzu row per node with deterministic ordering by carrying stable keys or aggregating relationship-specific scores.

Returning distinct nodes and sorting them by another value sounds straightforward until a node appears with several candidate sort values. A node reached through three relationships might have three different scores. The query must choose which score represents that node before it can define a meaningful order.

This guide uses Kuzu 0.11.3. The techniques rely on explicit projection through `WITH`, aggregation, and a final `ORDER BY`. They handle both stable node properties and scores derived from matching relationships.

## Separate identity from presentation

A node's primary key identifies it within its node table. Its display name is a presentation field and may be shared by another node. When removing duplicates, retain the node variable or a key that uniquely identifies it rather than deduplicating only the displayed properties.

For example, two `Person` nodes named Sam should remain two nodes if their IDs differ. A projection such as `RETURN DISTINCT person.name` intentionally returns distinct names, not distinct people.

Sorting introduces another decision. If the sort value is a property of the node itself, every occurrence of that node has the same value within the query. If it comes from a relationship or a path, the same node may have several values. The next sections treat these cases separately.

## Carry a stable node property through DISTINCT

Suppose several users recommend the same person, and the output should list each recommended person once by age:

```cypher
MATCH (:Person)-[:Recommends]->(person:Person)
WITH DISTINCT person, person.age AS sort_age
RETURN person
ORDER BY sort_age ASC, person.id ASC;
```

`WITH` establishes one row for each `(person, sort_age)` pair. Because age belongs to the node, this remains one row per person. The final projection returns only the node, while the sort expression remains in scope.

The second key, `person.id`, resolves ties. Without a tie-breaker, two equal ages can be returned in either order. That can make tests flaky and cause unstable page boundaries. Kuzu's [ORDER BY documentation](https://kuzudb.github.io/docs/cypher/query-clauses/order-by/) covers ordering expressions and direction.

For a nullable property, state where missing values should appear. One explicit approach is to sort the missingness flag first:

```cypher
MATCH (:Person)-[:Recommends]->(person:Person)
WITH DISTINCT person, person.age AS sort_age
RETURN person
ORDER BY sort_age IS NULL ASC, sort_age ASC, person.id ASC;
```

This places known ages before missing ages and avoids relying on an implicit null ordering convention. Check that this policy matches the consumer's expectations.

## Aggregate relationship scores before returning a node

Assume recommendations carry a score. The following fixture gives Ben two different scores and Cara one:

```cypher
CREATE NODE TABLE Person(id INT64 PRIMARY KEY, name STRING, age INT64);
CREATE REL TABLE Recommends(FROM Person TO Person, score INT64);
CREATE (:Person {id: 1, name: 'Ada', age: 30});
CREATE (:Person {id: 2, name: 'Ben', age: 25});
CREATE (:Person {id: 3, name: 'Cara', age: 25});
MATCH (a:Person {id: 1}), (b:Person {id: 2})
CREATE (a)-[:Recommends {score: 4}]->(b);
MATCH (a:Person {id: 1}), (b:Person {id: 2})
CREATE (a)-[:Recommends {score: 9}]->(b);
MATCH (a:Person {id: 1}), (b:Person {id: 3})
CREATE (a)-[:Recommends {score: 7}]->(b);
```

If the business rule is to use the strongest recommendation, reduce each person's candidate scores with `max`:

```cypher
MATCH (:Person)-[recommendation:Recommends]->(person:Person)
WITH person, max(recommendation.score) AS best_score
RETURN person
ORDER BY best_score DESC, person.id ASC;
```

Ben precedes Cara because the representative scores are nine and seven. No extra `DISTINCT` is needed: grouping already produces one row per node. Change `max` to another aggregate only when the definition of ranking changes.

By comparison, `WITH DISTINCT person, recommendation.score AS score` keeps Ben's scores four and nine as separate rows. Adding the score to the distinct projection preserves it but does not solve node deduplication. Dropping the score without choosing a representative makes the intended order ambiguous.

## Apply pagination after ranking

When the goal is the top ten distinct nodes, aggregate or deduplicate first, then order and limit:

```cypher
MATCH (:Person)-[r:Recommends]->(person:Person)
WITH person, max(r.score) AS best_score
RETURN person.id AS id, person.name AS name, best_score
ORDER BY best_score DESC, id ASC
LIMIT 10;
```

Returning the score is useful during debugging even if the final application discards it. A limit applied before grouping can consume several rows for one node and return fewer distinct nodes than requested. It can also discard a node's strongest score before ranking.

For repeated pages, a deterministic order is necessary but does not freeze the database between requests. Use an appropriate consistent snapshot or a materialized result when the same ranking must remain stable while data changes. A tie-breaker alone cannot prevent records moving between pages after updates.

## Verify the ordering contract

Test parallel recommendations, tied scores, null scores, and two people with the same name. Adding a lower score for Ben should not change his best-score ranking. Adding a higher score for Cara should move her ahead.

Also check result cardinality directly: the number of output node IDs should equal the number of unique output IDs. This catches the accidental `(node, score)` distinctness bug more clearly than a visual inspection of the first few results.

## Conclusion

Carry node-owned sort properties through `WITH DISTINCT`. When a sort key varies across matches, aggregate it to one representative value per node before ordering, and include a stable tie-breaker for reproducible results.

## Official Documentation

- [ORDER BY](https://kuzudb.github.io/docs/cypher/query-clauses/order-by/)
- [WITH](https://kuzudb.github.io/docs/cypher/query-clauses/with/)
- [RETURN grouping](https://kuzudb.github.io/docs/cypher/query-clauses/return/)
- [LIMIT](https://kuzudb.github.io/docs/cypher/query-clauses/limit/)
