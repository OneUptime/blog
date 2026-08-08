# Stored vs Computed Links in Gel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, Links, Computed Fields, EdgeQL, Schema

Description: Fix prohibited computed-link mutations by identifying the stored source of truth and updating that forward relationship instead.

---

The error `Modification of computed link is prohibited` means the query is trying to assign a relationship that Gel derives from an expression. A computed link has no independent stored value to modify. Change the stored field or link used by its expression, then let Gel recompute the result.

This is most common with backlinks. A schema stores `Post.author`, while `User.posts` is a reverse view of that forward link. Updating `User.posts` would create two competing sources of truth, so Gel rejects it.

## Recognize the Two Declarations

A stored link declares a target type:

```gel
type Post {
  required title: str;
  required author: User;
}
```

`author: User` is persisted relationship data. It can be assigned during insert and updated later, subject to cardinality, constraints, read-only settings, access policies, and, on Gel 7 and later, role permissions.

A computed link declares an expression with `:=`:

```gel
type User {
  required name: str;
  required active: bool;
  multi posts := .<author[is Post];
}
```

`posts` is evaluated from all `Post.author` links pointing at the current user. It is not stored as a second relationship.

In current Gel schema syntax, the `link` keyword is normally omitted. Computed properties and links required explicit `property` or `link` keywords in EdgeDB versions before 4. Use the syntax that matches the server generation when maintaining a legacy schema.

## Why the Mutation Fails

This query attempts to add a value to a computed backlink:

```edgeql
update User
filter .id = <uuid>$user_id
set {
  posts += (
    select Post
    filter .id = <uuid>$post_id
  )
};
```

There is no stored `User.posts` set for `+=` to modify. Its expression says the set consists of posts whose `author` points to the user.

Update the forward link instead:

```edgeql
with
  target_user := assert_exists((
    select User
    filter .id = <uuid>$user_id
  ))
update Post
filter .id = <uuid>$post_id
set {
  author := target_user
};
```

A subsequent read of that user's `posts` includes that post automatically.

To remove it, either point `Post.author` at a different user or, if the link is optional, assign an empty set:

```edgeql
update Post
filter .id = <uuid>$post_id
set {
  author := {}
};
```

That last query is invalid for the example because `author` is `required`. The schema correctly forces the application to select another author or change the domain model through a migration.

## Computed Does Not Mean Client-generated

A schema computed link is evaluated by Gel whenever referenced:

```gel
type Team {
  multi active_members := (
    select .members
    filter .active
  );

  multi members: User;
}
```

`members` is stored. `active_members` is a filtered view. To add an active member, update both pieces of stored state as appropriate:

```edgeql
with
  target_team := assert_exists((
    select Team
    filter .id = <uuid>$team_id
  )),
  target_user := assert_exists((
    select User
    filter .id = <uuid>$user_id
  )),
  activated_user := (
    update target_user
    set { active := true }
  )
update target_team
set {
  members += activated_user
};
```

The computed set then follows from `members` and `User.active`.

A query-level computed field uses similar syntax only for that result shape:

```edgeql
select User {
  name,
  post_count := count(.posts)
};
```

It is also read-only because it is an output expression, not a schema pointer.

## Type and Cardinality Come From the Expression

Gel infers a computed field's target type and cardinality from its EdgeQL expression. Writing `single`, `multi`, or `required` is optional for a computed declaration, but the official docs recommend explicit modifiers as readability and a sanity check.

```gel
type User {
  multi posts := .<author[is Post];
}
```

If the expression can return many posts but the schema declares `single`, migration creation fails rather than silently choosing one. To make a true single backlink, enforce uniqueness on the forward link:

```gel
type Profile {
  required user: User {
    constraint exclusive;
  };
}

type User {
  single profile := .<user[is Profile];
}
```

The exclusivity constraint ensures at most one profile can point at a user.

## Computed Links Are Evaluated, Not Materialized

Because the result is derived on demand, a computed link does not maintain a separately writable copy. That prevents synchronization bugs but has performance implications. A complex expression over a large set can be expensive every time it is selected.

Optimize the stored inputs and query:

- index frequently filtered scalar properties;
- rely on the documented automatic indexing of links where applicable;
- request the computed link only when needed;
- filter, order, and paginate large multi results; and
- run `analyze` with representative data.

Do not assume that a computed pointer itself can always be indexed. Index expressions have immutability and singleton restrictions, and a multi computed relationship does not satisfy a singleton index expression.

Schema-defined computed fields must use stable-or-less-volatile expressions. Volatile or modifying expressions are prohibited. They should describe data, not perform hidden writes.

## Distinguish Computed From Read-only Stored Links

A stored link can also be declared read-only:

```gel
type Invoice {
  required customer: Customer {
    readonly := true;
  };
}
```

The link is persisted and can be supplied when the object is created, but the link documentation says modifications through `update` are prohibited afterward. The error is conceptually different from a computed link:

- computed link: no independent stored value exists;
- read-only stored link: a value is stored, but schema forbids later assignment.

Inspect the schema rather than treating every prohibited mutation as the same fix.

## Find the Source of Truth

When the declaration is far from the failing query:

1. Inspect the type in `dbschema/*.gel`.
2. Look for `:=` on the pointer.
3. Read the expression from right to left and list its stored inputs.
4. For `.<name[is Type]`, find forward link `Type.name`.
5. Check whether the pointer is inherited from an abstract supertype.
6. Use `gel describe object User` or the Gel UI to inspect the live schema.
7. Confirm the selected branch, or database before EdgeDB 5, matches the repository.

Then express the business action against stored inputs. For a backlink, update the forward source. For a filtered membership view, change stored membership or the filter property. For a union of links, decide which stored link should own the new relationship.

## Migrating From Computed to Stored

Sometimes a derived relationship becomes independently editable. Changing it to a stored link is a data-model migration, not a syntax fix.

Plan:

1. Define why stored membership may differ from the old expression.
2. Add a new stored link under a temporary name.
3. Backfill it from the computed expression.
4. Update all writes to maintain the new source of truth.
5. Compare stored and derived membership during a transition window.
6. Remove or rename the computed pointer in a reviewed migration.

If both stored and computed pointers remain, name them by meaning, such as `members` and `eligible_members`, so callers do not assume both are writable.

## Access-policy Implications

The computed expression may traverse protected object types. Access policies define which resulting objects the caller can see, even though policy expressions themselves have their documented non-recursive evaluation behavior. A computed backlink can therefore appear empty for one user and populated for another.

Updates must target the stored source. Its access policies must permit `select`, `update read`, and `update write`; on Gel 7 and later, the connected role must also have `sys::perm::data_modification` (superuser roles receive all permissions implicitly). Never bypass policy enforcement simply because a convenient reverse pointer is read-only.

## Official Documentation

- [Gel computed properties and links](https://docs.geldata.com/reference/datamodel/computeds)
- [Gel links and backlinks](https://docs.geldata.com/reference/datamodel/links)
- [EdgeQL paths](https://docs.geldata.com/reference/edgeql/paths)
- [EdgeQL update](https://docs.geldata.com/reference/edgeql/update)
- [EdgeQL volatility](https://docs.geldata.com/reference/reference/edgeql/volatility)
- [Gel indexes](https://docs.geldata.com/reference/datamodel/indexes)
- [Gel permissions](https://docs.geldata.com/reference/datamodel/permissions)

## Conclusion

A computed link is a queryable relationship view, not stored membership. Find the forward link or scalar fields that define its expression and update those. If independent mutation is a real requirement, introduce a stored source of truth through a data migration instead of trying to write through the derived pointer.
