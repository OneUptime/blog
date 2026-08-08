# EdgeQL vs SQL: Links, Shapes, and Cardinality Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, EdgeQL, SQL, Cardinality, Data Modeling

Description: Learn how EdgeQL paths and result shapes use schema cardinality to replace much of the join and object-mapping work around SQL.

---

EdgeQL does not eliminate relational operations. Gel compiles its object-oriented query language onto a PostgreSQL-backed relational implementation. What changes for the developer is the vocabulary: relationships are typed links, traversal uses paths, output is declared with shapes, and the compiler tracks how many values an expression can return.

Those features address two common gaps between SQL and application code: reconstructing nested objects from joined rows and discovering cardinality mistakes only at runtime.

## Start With a Cardinality-aware Schema

Consider authors, posts, and tags:

```gel
type User {
  required email: str {
    constraint exclusive;
  };
  multi posts := .<author[is Post];
}

type Post {
  required title: str;
  subtitle: str;
  required author: User;
  multi tags: Tag;
}

type Tag {
  required name: str {
    constraint exclusive;
  };
}
```

The modifiers are part of the database contract:

- `required title` returns exactly one string for each post.
- `subtitle` returns zero or one string.
- `required author` is a link to exactly one user.
- `multi tags` returns zero or more tag objects.
- `posts := .<author[is Post]` is a computed backlink whose cardinality is many.

Gel automatically gives each object a globally unique, required UUID `id`. Links are schema objects, not application-only knowledge layered over foreign-key columns.

## SQL Joins Produce Rows

A conventional SQL query for one author's posts and tags might be:

```sql
SELECT u.id AS user_id,
       u.email,
       p.id AS post_id,
       p.title,
       t.id AS tag_id,
       t.name AS tag_name
FROM app_user AS u
JOIN post AS p ON p.author_id = u.id
LEFT JOIN post_tag AS pt ON pt.post_id = p.id
LEFT JOIN tag AS t ON t.id = pt.tag_id
WHERE u.email = $1
ORDER BY p.title, t.name;
```

The result is flat. An author and post repeat for every tag. An application must group rows, distinguish a missing tag from a missing post, and keep its mapping logic synchronized with aliases. PostgreSQL can construct nested JSON in SQL, and mature ORMs can perform the mapping, but that is another explicit layer.

## EdgeQL Paths Traverse Links

In EdgeQL, a dot path follows links and properties:

```edgeql
select User.posts.tags.name
filter User.email = <str>$email;
```

That expression reads from left to right: select users, follow their `posts` link, follow each post's `tags`, and return tag names. Each component is resolved against the schema.

Paths are set-oriented. If a user has three posts and their tags produce five reachable tag objects, the path produces the corresponding set of names. EdgeQL sets are formally multisets, so use `distinct` when the desired business result is unique values:

```edgeql
select distinct User.posts.tags.name
filter User.email = <str>$email;
```

This is not an N+1 loop. It is one declarative database query that Gel compiles and plans.

## Shapes Declare the Object Result

Most applications need nested objects rather than one terminal path. Attach a shape to the selected object:

```edgeql
select User {
  id,
  email,
  posts: {
    id,
    title,
    subtitle,
    tags: {
      id,
      name
    } order by .name
  } order by .title
}
filter .email = <str>$email;
```

The output mirrors that syntax: each user contains posts, and each post contains tags. A shape controls projection and nesting; it does not mutate the schema or cause separate client-side fetches.

Shapes can also define computed fields for a query:

```edgeql
select Post {
  title,
  tag_count := count(.tags),
  author_email := .author.email
};
```

This keeps derived values in the same typed query result instead of requiring a second mapping pass.

## Cardinality Is Checked During Query Compilation

Gel tracks ranges such as empty, exactly one, zero or one, one or more, and many. This allows it to reject an expression that cannot satisfy a required single link.

Suppose `email` is exclusive. This link assignment is statically known to return at most one user:

```edgeql
insert Post {
  title := <str>$title,
  author := (
    select User
    filter .email = <str>$email
  )
};
```

It can still fail at runtime if no matching user exists because `author` is required. Make that expectation explicit:

```edgeql
insert Post {
  title := <str>$title,
  author := assert_exists((
    select User
    filter .email = <str>$email
  ))
};
```

If the filter used a non-exclusive property, the compiler could not prove that the result is single. Use `assert_single` only when multiple matches represent a genuine invariant violation:

```edgeql
author := assert_exists(assert_single((
  select User
  filter .display_name = <str>$name
)))
```

The assertion documents and enforces intent. It is not a substitute for an `exclusive` constraint when uniqueness is a lasting data rule.

## Empty Sets Replace Much of SQL Null Logic

An optional Gel property is an empty set or a singleton, not a SQL-style nullable value in EdgeQL semantics. Element-wise operators receiving an empty input normally produce an empty result. This surprises SQL users in filters:

```edgeql
# This is empty, not false, when subtitle is empty.
select Post
filter .subtitle != 'retired';
```

Coalesce the optional value when the business rule treats absence as a value:

```edgeql
select Post
filter (.subtitle ?? '') != 'retired';
```

For equality that should be false rather than empty when one side is absent, EdgeQL provides coalescing comparison operators such as `?=`:

```edgeql
select Post
filter .subtitle ?= <optional str>$subtitle;
```

Use `exists .subtitle` when the question is specifically whether a value is present. These distinctions matter because a filter includes an input when its boolean result contains at least one `true`; an empty boolean set does not include it.

## Links Carry More Than Foreign-key Navigation

Links can be single or multi, required or optional, constrained, indexed through supported declarations, and can contain link properties. A many-to-many relationship with membership metadata can remain one domain concept:

```gel
type Team {
  required name: str;
  multi members: User {
    joined_at: datetime;
    role: str;
  };
}
```

Query link properties with `@` notation:

```edgeql
select Team {
  name,
  members: {
    email,
    @joined_at,
    @role
  }
};
```

The relational implementation still has an association structure, but the Gel schema and query keep the relationship's data attached to the relationship.

## EdgeQL Does Not Remove Performance Work

Nested syntax can still describe an expensive query. Large multi links can multiply work, unbounded shapes can return too much data, and filters need useful indexes. Use pagination, request only required fields, and run `analyze` against representative data. Gel's index documentation notes that PostgreSQL's planner ultimately decides whether an index is beneficial.

Also remember that result shape and query cardinality are separate. A shape describes each returned object's fields; it does not guarantee that the top-level query returns one object. Use the client method that matches the query contract, such as `query`, `querySingle`, or `queryRequiredSingle` in the JavaScript client.

## Official Documentation

- [Gel schema and cardinality modifiers](https://docs.geldata.com/learn/schema)
- [EdgeQL paths and backlinks](https://docs.geldata.com/reference/edgeql/paths)
- [EdgeQL shapes](https://docs.geldata.com/reference/reference/edgeql/shapes)
- [EdgeQL cardinality](https://docs.geldata.com/reference/reference/edgeql/cardinality)
- [EdgeQL sets and empty values](https://docs.geldata.com/reference/edgeql/sets)
- [EdgeQL select](https://docs.geldata.com/reference/edgeql/select)
- [PostgreSQL joined tables](https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN)

## Conclusion

SQL joins expose related rows and leave nesting to SQL JSON construction, an ORM, or application code. EdgeQL starts from typed links, traverses them with paths, declares nested results with shapes, and carries schema cardinality into query checking. The relational work still exists, but Gel makes relationships and result structure part of one database-level language and type contract.
