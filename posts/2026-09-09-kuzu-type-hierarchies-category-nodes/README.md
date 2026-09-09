# Model and Query Kuzu Type Hierarchies with Category Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Cypher, Data Modeling, Graph Database, Hierarchy

Description: Model category inheritance in Kuzu using explicit category nodes, directed parent relationships, and bounded ancestor queries.

A product can belong to a category whose parent is another category: a drill belongs to power tools, which belongs to tools. Representing that hierarchy as graph data lets you change classifications without changing the database schema every time the taxonomy grows.

In Kuzu, a category node is an ordinary node in a declared table. A relationship to it does not grant the product a new schema label or automatic type inheritance. Your queries decide how direct membership and inherited membership should be interpreted.

This tutorial targets Kuzu 0.11.3 and models a small directed category hierarchy.

## Choose a direction and keep it consistent

Use `ChildOf` from the specific category toward its broader parent:

```cypher
CREATE NODE TABLE Category(id STRING PRIMARY KEY, title STRING);
CREATE NODE TABLE Product(id STRING PRIMARY KEY, title STRING);
CREATE REL TABLE ChildOf(FROM Category TO Category);
CREATE REL TABLE ClassifiedAs(FROM Product TO Category);
```

This direction makes an upward traversal answer “what broader categories include this category?” Reversing the arrow answers “what narrower categories descend from this category?” Document the direction in your model so different importers do not create a mixture.

Category IDs should be stable keys rather than display titles. Renaming “Power Tools” to “Powered Tools” should update one property without changing membership edges or external references.

## Create a fixture

```cypher
CREATE (:Category {id: 'tools', title: 'Tools'});
CREATE (:Category {id: 'power-tools', title: 'Power Tools'});
CREATE (:Category {id: 'drills', title: 'Drills'});
CREATE (:Product {id: 'drill-100', title: 'Compact Drill'});
MATCH (child:Category {id: 'power-tools'}),
      (parent:Category {id: 'tools'})
CREATE (child)-[:ChildOf]->(parent);
MATCH (child:Category {id: 'drills'}),
      (parent:Category {id: 'power-tools'})
CREATE (child)-[:ChildOf]->(parent);
MATCH (product:Product {id: 'drill-100'}),
      (category:Category {id: 'drills'})
CREATE (product)-[:ClassifiedAs]->(category);
```

The product has one direct category, but under the application's inheritance rule it also belongs to power tools and tools. That inheritance is computed by traversal; it is not copied into three properties or materialized as three direct membership edges.

## Query direct and inherited categories

Direct membership is a one-hop match:

```cypher
MATCH (product:Product {id: 'drill-100'})-[:ClassifiedAs]->(category:Category)
RETURN category.id, category.title;
```

To include ancestors and the direct category:

```cypher
MATCH (product:Product {id: 'drill-100'})-[:ClassifiedAs]->(direct:Category),
      (direct)-[:ChildOf*0..8]->(ancestor:Category)
RETURN DISTINCT ancestor.id AS id, ancestor.title AS title
ORDER BY id;
```

The zero-length case includes `direct` itself. The upper bound of eight is an explicit example taxonomy-depth policy. If your data can be deeper, increase the bound based on a validated depth limit or use a traversal strategy that proves completeness. A bounded query is not a complete ancestor query for an unrestricted hierarchy.

`DISTINCT` removes duplicate ancestors reached through different parent chains. This becomes important when a category has several parents, forming a directed acyclic graph rather than a tree. Kuzu's [MATCH reference](https://kuzudb.github.io/docs/cypher/query-clauses/match/) describes variable-length traversal syntax.

## Find products under a broad category

Start with each product's direct category and test whether it reaches the selected root:

```cypher
MATCH (product:Product)-[:ClassifiedAs]->(direct:Category),
      (direct)-[:ChildOf*0..8]->(root:Category {id: 'tools'})
RETURN DISTINCT product.id AS id, product.title AS title
ORDER BY id;
```

The example returns the compact drill. Classifying the same product directly as power tools as well should not duplicate the output product. Test this if your model permits several direct memberships.

A single query can also return the direct category and the matched ancestor for explanation. That is useful when a UI needs to show why a product appears in a broad category. Do not remove direct-versus-inherited information prematurely if users need provenance.

## Enforce taxonomy rules in the write workflow

A relationship table declaration establishes allowed endpoint types. It does not by itself guarantee that `ChildOf` is acyclic, that every category has one parent, or that the maximum depth is eight.

If the model is a tree, reject a second parent. If it is a DAG, allow multiple parents but reject an insertion that creates a cycle. Apply the check and insertion within the same write transaction, and validate bulk-loaded hierarchies before exposing them to readers.

A self-loop is a cycle and should be rejected separately. An existing cycle can cause repeated paths and surprising membership results even when a traversal bound keeps the query finite. Increasing the bound is not a repair for invalid taxonomy data.

## Evolve the model without losing meaning

Attach category descriptions, external vocabulary identifiers, or lifecycle state to the category node. Put membership-specific facts, such as who assigned the classification or its effective date, on `ClassifiedAs` when required.

If categories themselves have incompatible schemas, separate node tables may still be appropriate. A category hierarchy is a way to model a business taxonomy, not a replacement for all schema design. Keep property validation in the table schema and domain rules in your write layer.

When moving a category to a different parent, compare affected products before and after the change. An inherited membership change can alter search results for many products without modifying any product record.

## Conclusion

Use stable category nodes, a consistent child-to-parent relationship, and explicit traversal rules. Preserve the distinction between direct and inherited membership, and enforce hierarchy constraints before treating bounded traversal results as complete.

## Official Documentation

- [MATCH and recursive traversal](https://kuzudb.github.io/docs/cypher/query-clauses/match/)
- [Kuzu schema definitions](https://kuzudb.github.io/docs/cypher/data-definition/)
- [RETURN DISTINCT](https://kuzudb.github.io/docs/cypher/query-clauses/return/)
- [Transactions](https://kuzudb.github.io/docs/cypher/transaction/)
