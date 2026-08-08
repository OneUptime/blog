# EdgeQL Backlinks Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, EdgeQL, Backlinks, Links, Data Modeling

Description: Traverse Gel relationships in reverse with backlinks, narrow polymorphic sources, and keep one stored forward source of truth.

---

Gel links are directional. If `Post.author` points from a post to a user, the database stores that forward relationship. EdgeQL can traverse it backward from a user to every post that points at that user without storing a second `User.posts` relationship.

That reverse traversal is a backlink. Its core syntax is:

```edgeql
.<link_name[is SourceType]
```

The link name identifies incoming links, and the type intersection identifies which source object type should be returned.

## Start With One Forward Link

```gel
type User {
  required name: str;
}

type Post {
  required title: str;
  required author: User;
  required published: bool {
    default := false;
  }
  published_at: datetime;
}
```

Read forward from posts:

```edgeql
select Post {
  title,
  author: {
    name
  }
};
```

Read backward from users:

```edgeql
select User {
  name,
  posts := .<author[is Post] {
    id,
    title
  }
};
```

For each user, `.<author` finds objects with an outgoing link named `author` whose target is that user. `[is Post]` narrows those source objects to `Post`, allowing the `title` shape.

The name `posts` in this query is only a computed output field. It does not add a schema pointer.

## Why the Type Intersection Matters

Suppose comments also have an `author` link:

```gel
type Comment {
  required body: str;
  required author: User;
}
```

This expression is valid:

```edgeql
select User.<author;
```

It can return both posts and comments. Gel infers the common type as `BaseObject`, so this shape is not valid:

```edgeql
select User.<author {
  title
};
```

Not every source object has `title`. Narrow the backlink:

```edgeql
select User.<author[is Post] {
  title
};
```

Or query each source type separately:

```edgeql
select User {
  name,
  posts := .<author[is Post] {
    title
  },
  comments := .<author[is Comment] {
    body
  }
};
```

The type filter applies to the backlink's source, not its target. The target is already the user from which traversal begins.

## Declare a Reusable Computed Backlink

If the application frequently reads the reverse relationship, put a computed link in schema:

```gel
type User {
  required name: str;
  multi posts := .<author[is Post];
}
```

Queries become simpler:

```edgeql
select User {
  name,
  posts: {
    id,
    title
  } order by .title
};
```

The `multi` modifier is not required because Gel can infer cardinality from the expression, but documenting it acts as a schema sanity check. If the expression and modifier disagree, migration creation reports the mismatch.

This computed link remains read-only. To add a post to `User.posts`, insert or update a `Post.author` forward link.

## Write Through the Forward Link

Insert a post for a user:

```edgeql
with target_user := assert_exists((
  select User
  filter .id = <uuid>$user_id
))
insert Post {
  title := <str>$title,
  author := target_user
};
```

Move an existing post to another author:

```edgeql
with target_user := assert_exists((
  select User
  filter .id = <uuid>$user_id
))
update Post
filter .id = <uuid>$post_id
set {
  author := target_user
};
```

Do not duplicate storage by adding both a stored `Post.author` and stored `User.posts`. Maintaining both would require every mutation to keep two relationships synchronized and still leave a conflict when they disagree.

## Model a True Single Backlink With Exclusivity

Backlinks are multi by default because many source objects can point to one target. If each user can have at most one profile, enforce that on the forward link:

```gel
type Profile {
  required bio: str;
  required user: User {
    constraint exclusive;
  };
}

type User {
  required name: str;
  single profile := .<user[is Profile];
}
```

The exclusive constraint prevents two profiles from linking to the same user. The explicit `single` computed backlink now agrees with the stored invariant.

Declaring this plain backlink `single` without a supporting invariant does not pick an arbitrary source. Gel rejects the schema because the inferred `multi` cardinality disagrees with the explicit `single` modifier. Use `order by ... limit 1` only when selecting one source is the actual business rule, and define deterministic ordering.

## Filter and Paginate the Reverse Set

Backlinks are ordinary paths and can participate in selections:

```edgeql
select User {
  name,
  recent_posts := (
    select .<author[is Post]
    filter .published
    order by .published_at desc empty last then .id
    limit 10
  ) {
    id,
    title,
    published_at
  }
};
```

For a large source type, do not return every incoming object by default. Filter on indexed stored properties, order deterministically, paginate, and use `analyze` with representative data.

Gel's index reference says links are automatically indexed, which supports relationship traversal. Additional filters such as `published` or ordering such as `published_at` may still need deliberate indexes based on the actual plan.

## Use Backlinks in Filters

Find users who have at least one published post:

```edgeql
select User {
  id,
  name
}
filter exists (
  select .<author[is Post]
  filter .published
);
```

Find users with no posts:

```edgeql
select User
filter not exists .<author[is Post];
```

`exists` converts the reverse set into a singleton boolean and makes the quantifier clear.

## Backlinks and Link Properties

If the forward relationship is a multi link with link properties, the relationship metadata belongs to that stored link, not to a duplicate reverse pointer. Traverse and shape it according to the current EdgeQL link-property syntax, and test the direction carefully.

For complicated relationship entities with their own lifecycle, identity, or several independent relationships, an explicit object type can be clearer than many link properties. For example, a `Membership` object with `user`, `team`, `role`, and timestamps provides two simple forward links and two computed backlinks.

## Access Policies Affect the Visible Reverse Graph

A stored `Post.author` can exist while a select policy hides that post from the current user. The backlink then returns only visible source objects. `count(.posts)` counts the visible computed set, not an administrator's total.

Test:

- direct `Post` visibility;
- `User.<author[is Post]` visibility;
- the schema computed `User.posts` link;
- request globals and role permissions; and
- nested shapes involving protected types.

Do not use a user-visible backlink count for security-sensitive global totals unless the policy-filtered meaning is explicitly intended.

## Version-aware Syntax

Backlinks and the `.<` operator are EdgeQL concepts retained through the EdgeDB to Gel rename. Current commands and packages use Gel names, but older articles may show `edgedb` CLI commands and `.esdl` schema files. Current schema files use `.gel`; EdgeQL query files remain `.edgeql`.

Computed fields before EdgeDB 4 required explicit `link` or `property` keywords. When copying a current backlink declaration into a legacy schema, check that version's syntax rather than assuming a parser bug.

## Official Documentation

- [EdgeQL paths and backlinks](https://docs.geldata.com/reference/edgeql/paths)
- [Gel links](https://docs.geldata.com/reference/datamodel/links)
- [Gel computed links](https://docs.geldata.com/reference/datamodel/computeds)
- [EdgeQL select and computed fields](https://docs.geldata.com/reference/edgeql/select)
- [Gel constraints and exclusivity](https://docs.geldata.com/reference/datamodel/constraints)
- [Gel indexes](https://docs.geldata.com/reference/datamodel/indexes)
- [Gel access policies](https://docs.geldata.com/reference/datamodel/access_policies)

## Conclusion

Store one forward relationship and traverse it backward with `.<link[is SourceType]`. Use the type intersection whenever several source types share a link name, declare reusable reverse paths as computed links, and enforce exclusivity before claiming a backlink is single. Writes belong on the forward link, while policies and query plans determine which reverse objects a caller can see efficiently.
