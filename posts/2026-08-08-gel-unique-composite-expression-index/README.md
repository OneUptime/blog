# Choose Unique, Composite, and Expression Indexes in Gel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, EdgeQL, Indexes, Constraints, Query Performance

Description: Choose the right Gel constraint or index for uniqueness, multi-field lookups, normalized values, and production migrations.

---

The first decision is more important than the syntax: are you enforcing a business invariant, or trying to make a query faster?

In Gel, uniqueness belongs in an `exclusive` constraint. A performance index declared with `index on (...)` does not make values unique. The distinction matters because an index may be ignored by the PostgreSQL query planner, while a constraint must reject invalid data.

The practical choices are:

- an `exclusive` constraint for uniqueness;
- a simple index for one stored property;
- a composite index for a recurring multi-property access pattern; or
- an expression index when the query filters or orders by a derived immutable value.

Do not select one from its name alone. Start from the exact EdgeQL query and the invariant the schema must preserve.

## Use an Exclusive Constraint for Unique Values

Suppose a login name must identify exactly one user:

```gel
type User {
  required username: str {
    constraint exclusive;
  };
}
```

This is the schema-level guarantee. Gel also creates an implicit index for an exclusive property, so adding this is redundant:

```gel
type User {
  required username: str {
    constraint exclusive;
  };

  # Usually unnecessary because exclusive is already indexed.
  index on (.username);
}
```

Gel also automatically indexes every object's `id` and its links. Before adding an index that resembles a primary-key or foreign-key index from a SQL schema, check whether Gel already provides it.

An optional exclusive property can still be absent on several objects. Gel represents absence as an empty set, not a stored duplicate value. If every user must have a username, combine `required` with `exclusive` as above.

## Use Composite Exclusivity for a Unique Combination

A blog may allow the same title under different authors but forbid an author from reusing a title:

```gel
type Author {
  required name: str;
}

type Post {
  required title: str;
  required author: Author;

  constraint exclusive on ((.title, .author));
}
```

The tuple makes the pair unique. Two separate exclusive constraints would mean something much stronger: every title would be globally unique and each author could appear on only one post.

The same rule applies to tenant-scoped identifiers:

```gel
type Tenant {
  required name: str;
}

type Project {
  required tenant: Tenant;
  required key: str;

  constraint exclusive on ((.tenant, .key));
}
```

Now a query that identifies one project by both fields has a schema-backed uniqueness guarantee:

```edgeql
with tenant_id := <uuid>$tenant_id,
     project_key := <str>$project_key
select Project {
  id,
  key
}
filter .tenant.id = tenant_id
  and .key = project_key;
```

This is not merely an optimizer hint. The constraint explains why that selection cannot return two projects for the same tenant and key.

## Use a Simple Index for a Repeated One-property Access Pattern

If a property is not unique but is frequently filtered or ordered, a simple index may help:

```gel
type Incident {
  required status: str;
  required created_at: datetime;

  index on (.created_at);
}
```

It is a candidate for queries such as:

```edgeql
select Incident {
  id,
  status,
  created_at
}
filter .created_at >= <datetime>$since
order by .created_at desc
limit 100;
```

An index is not a promise that the planner will use it. For a small type, scanning all objects may be cheaper. Indexes also consume disk and memory and add work to inserts and updates. Index properties used in real filters, ordering, or grouping, then verify the plan with representative data.

Low-cardinality values such as a boolean or a status with three values are not automatically good standalone index candidates. Their usefulness depends on selectivity, data distribution, the rest of the predicate, and the requested ordering.

## Use a Composite Index for a Combined Lookup

If the common query filters by status and then reads newest incidents, a tuple index expresses that combined access pattern:

```gel
type Incident {
  required status: str;
  required created_at: datetime;

  index on ((.status, .created_at));
}
```

The corresponding query is:

```edgeql
select Incident {
  id,
  created_at
}
filter .status = <str>$status
order by .created_at desc
limit 100;
```

Do not build a composite index for every permutation of fields. The underlying PostgreSQL planner determines how a multicolumn index can support a particular filter and order. Column order and actual query shape matter, and an index that helps one path may not help a query that uses only a different component.

Treat each tuple as a hypothesis:

1. capture the slow, parameterized query;
2. run `analyze` against production-like cardinalities and value distributions;
3. add the smallest plausible index in schema;
4. create and apply the migration in a safe environment; and
5. compare plans and latency, including write cost.

If uniqueness and lookup performance are both required for the same tuple, use the composite exclusive constraint. Do not replace the constraint with a composite performance index.

## Use an Expression Index for the Expression You Query

Case-insensitive lookup is a common example. If the query normalizes the stored value, index that same normalized expression:

```gel
type User {
  required display_name: str;

  index on (str_lower(.display_name));
}
```

Query it consistently:

```edgeql
select User {
  id,
  display_name
}
filter str_lower(.display_name) = str_lower(<str>$name);
```

The indexed expression must be immutable and singleton. It may reference multiple immediate properties, but it cannot yield a `multi` set. Volatile values such as the current time are not valid index keys because their result could change without the object being updated.

Expression matching matters. If one code path uses `str_lower(.display_name)` and another uses a different normalization pipeline, do not assume one expression index supports both. Centralize the normalization rule or model an explicit normalized value.

## Enforce Normalized Uniqueness With a Computed Property

An expression index may make lookup faster but still does not enforce uniqueness. To forbid usernames that differ only by case or surrounding spaces, use a computed property and an exclusive constraint as documented by Gel:

```gel
type User {
  required username: str;
  required clean_username := str_trim(str_lower(.username));

  constraint exclusive on (.clean_username);
}
```

Now `Alice`, `alice`, and a space-padded equivalent collide on the computed value. This makes the invariant explicit and gives the exclusive expression an implicit index.

Choose the normalization carefully. Lowercasing, trimming, Unicode behavior, and product-specific identity rules are not interchangeable. Once the constraint reaches production, changing the expression can reveal collisions in existing data, so audit before applying the migration.

## Use Partial Indexes and Constraints Deliberately

If most rows are archived but operational queries read active objects, an `except` clause can omit archived objects from an index:

```gel
type Job {
  required name: str;
  archived_at: datetime;

  index on (.name) except (exists .archived_at);
}
```

Gel calls this a partial index. It can reduce index size when the query consistently uses the same active subset.

Partial uniqueness is a separate constraint decision. For example, allow a deleted username to be reused:

```gel
type User {
  required username: str;
  required deleted: bool {
    default := false;
  };

  constraint exclusive on (.username) except (.deleted);
}
```

Do not use partial uniqueness unless reuse is truly safe. Historical references, audit trails, and restore workflows often make an apparently deleted identity meaningful.

## Plan Large Index Builds

Creating a normal index locks the object type for writes while it is built. Gel supports deferring the build so the migration can establish the index without performing the long build under that write lock:

```gel
type Event {
  required occurred_at: datetime;

  index on (.occurred_at) {
    build_concurrently := true;
  };
}
```

`gel migration apply` or `gel migrate` builds deferred indexes as its last step. You can apply the migration without building them yet:

```bash
gel migration apply --no-index-build
```

Until the build completes, the index is inactive and cannot speed up queries. A second migration apply can trigger the outstanding build. Make this an explicit deployment phase, observe it, and do not report the optimization complete merely because the schema migration was accepted.

## Verify the Result Instead of Guessing

Use the CLI analyzer with the query shape and a representative value:

```bash
gel analyze --expand \
  "select Incident { id, created_at }
   filter .status = 'open'
   order by .created_at desc
   limit 100"
```

The standalone `gel analyze` subcommand does not provide a way to supply query parameters, so use representative literals as above. To analyze the exact parameterized query, use the REPL, which prompts for parameter values, or an application-level test harness. Compare realistic values, including common and rare statuses. An index that is attractive for a rare value may be ignored for a value matching most objects.

Keep these checks separate:

- Does the constraint reject invalid duplicates?
- Does the query return the intended cardinality?
- Does `analyze` show a better execution plan on realistic data?
- Is the write and storage overhead acceptable?
- Was a deferred index actually built?

## Version-aware Notes

Current schema files use the `.gel` extension and current commands use `gel`. Legacy EdgeDB projects may use `.esdl`, `edgedb migration apply`, and `edgedb analyze`, but the core distinction between exclusive constraints and performance indexes remains.

PostgreSQL index types can also be selected through Gel's `pg` module, including B-tree, GIN, GiST, SP-GiST, BRIN, and hash options. That is an advanced, workload-specific choice, not a reason to copy PostgreSQL DDL into a Gel project. Keep schema management in Gel SDL and migrations, and verify the generated behavior with `analyze`.

## Official Documentation

- [Gel indexes](https://docs.geldata.com/reference/datamodel/indexes)
- [Gel constraints](https://docs.geldata.com/reference/datamodel/constraints)
- [Gel schema guide](https://docs.geldata.com/learn/schema)
- [EdgeQL analyze](https://docs.geldata.com/reference/edgeql/analyze)
- [Gel analyze CLI](https://docs.geldata.com/reference/using/cli/gel_analyze)
- [EdgeQL cardinality](https://docs.geldata.com/reference/reference/edgeql/cardinality)
- [Gel migrations](https://docs.geldata.com/reference/datamodel/migrations)

## Conclusion

Use `exclusive` to protect uniqueness, including tuple uniqueness and normalized computed values. Use simple, composite, expression, or partial indexes only for observed access patterns. Then test with production-like data and `analyze`, account for write cost, and confirm that any deferred build actually finished. The right schema usually contains fewer indexes than a speculative design, but every remaining index has a query and measurement that justify it.
