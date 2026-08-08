# Filter Empty or Matching Links Correctly in EdgeQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, EdgeQL, Filters, Empty Sets, Links

Description: Keep objects whose link is empty or contains a match by turning each EdgeQL condition into a definite singleton boolean.

---

The intuitive EdgeQL filter below can drop an object whose optional link is empty:

```edgeql
select Ticket
filter
  not exists .assignee
  or .assignee.id = <uuid>$user_id;
```

The problem is not operator precedence. EdgeQL values are sets, and ordinary boolean and comparison operators are element-wise. When `.assignee` is empty, the equality produces an empty set. The `or` operation then receives an empty operand and can also produce an empty set instead of the `true` a SQL-trained reader expects.

Make both sides definite singleton booleans with `exists`, `??`, or a coalescing comparison.

## Why the Naive Filter Becomes Empty

Assume this schema:

```gel
type User {
  required name: str;
}

type Ticket {
  required subject: str;
  assignee: User;
  multi watchers: User;
}
```

For an unassigned ticket:

```edgeql
not exists .assignee
```

returns the singleton `{true}`. But:

```edgeql
.assignee.id = <uuid>$user_id
```

has no left-side value and returns `{}`. EdgeQL's cardinality documentation explains that an element-wise operation runs over the Cartesian product of its inputs. If any ordinary input is empty, there are no combinations to evaluate.

Therefore:

```edgeql
{true} or {}
```

is empty, not `{true}`. A filter retains an input when its condition contains at least one `true`; an empty boolean set does not retain it.

## Correct an Optional Single Link

### Coalesce the comparison result

```edgeql
select Ticket {
  id,
  subject,
  assignee: {
    id,
    name
  }
}
filter
  (not exists .assignee)
  or ((.assignee.id = <uuid>$user_id) ?? false);
```

When `assignee` is empty, equality is empty and `?? false` turns it into `{false}`. The expression is now `{true} or {false}`, so the unassigned ticket remains.

### Use coalescing equality

EdgeQL also provides `?=`:

```edgeql
select Ticket
filter
  (not exists .assignee)
  or (.assignee.id ?= <uuid>$user_id);
```

With a required non-empty parameter, `?=` returns false when the link is empty and true for a matching singleton. This is concise for optional single values.

### Aggregate the matching subquery

The most explicit form asks whether a match exists:

```edgeql
select Ticket
filter
  (not exists .assignee)
  or exists (
    select .assignee
    filter .id = <uuid>$user_id
  );
```

`exists` returns exactly one boolean for both empty and non-empty inputs. This form generalizes cleanly to multi links and complex predicates.

## Correct a Multi Link

Suppose the requirement is: return tickets with no watchers or with at least one watcher whose ID matches.

```edgeql
select Ticket {
  id,
  subject,
  watchers: {
    id,
    name
  }
}
filter
  (not exists .watchers)
  or exists (
    select .watchers
    filter .id = <uuid>$user_id
  );
```

This has clear set-level semantics:

- no watcher means the first `exists` check is false and `not` makes it true;
- one matching watcher makes the second `exists` true;
- watchers with no match make both sides false.

Avoid relying on a multi comparison returning a set of booleans when a single yes-or-no question is intended. Wrapping the matching set in `exists` documents that any match is sufficient.

## Empty, Any Match, and Every Match Are Different Rules

These business requirements need different queries.

### Empty or any active member

```edgeql
filter
  (not exists .members)
  or exists (
    select .members
    filter .active
  )
```

### Empty or every member active

Express this as no inactive member:

```edgeql
filter
  not exists (
    select .members
    filter not .active
  )
```

This is also true for an empty member set, which matches the stated rule. If empty should be rejected, add `exists .members`.

### Non-empty and any active member

```edgeql
filter
  (exists .members)
  and exists (
    select .members
    filter .active
  )
```

Write the quantifier explicitly instead of hoping raw path cardinality implies it.

## Handle an Optional Filter Parameter

An optional parameter is itself an empty set when omitted. Decide what omission means before writing the query. If it means no user filter, use singleton `exists` checks around both choices:

```edgeql
with user_id := <optional uuid>$user_id
select Ticket {
  id,
  subject
}
filter
  (not exists user_id)
  or exists (
    select .assignee
    filter .id = user_id
  );
```

When `user_id` is empty, the first condition is true. The inner matching selection is empty, but its outer `exists` still returns false, leaving a normal singleton boolean expression.

If omission instead means only unassigned tickets, encode that directly. Do not let optional-parameter mechanics choose product behavior accidentally.

## Parent Filters and Nested Shape Filters Are Not Equivalent

This filters the nested watcher collection but retains every ticket:

```edgeql
select Ticket {
  subject,
  watchers: {
    name
  } filter .id = <uuid>$user_id
};
```

Tickets without a matching watcher still appear with an empty `watchers` field. To filter the top-level `Ticket` set, put the `filter` after the outer shape and use a path rooted at the ticket, as in the earlier examples.

This distinction is useful when the requirement is to show all tickets but reveal only matching related objects. It is wrong when relation membership determines whether the parent should be returned.

## Access Policies Can Also Make a Link Look Empty

`not exists .assignee` asks whether the link is visible in the current policy context. A stored link can exist while an access policy on `User` hides its target from the caller. The filter may then treat the link as empty.

When debugging:

1. confirm the request globals on the same configured client;
2. select the parent without the link;
3. select the target type directly;
4. select the nested link; and
5. compare in an isolated administrative session with policy enforcement handled according to the official diagnostic guidance.

Do not reinterpret policy-hidden links as publicly unassigned records unless that is an intentional authorization design.

## Test the Full Truth Table

Create fixtures for:

| Link state | Expected for empty-or-match |
| --- | --- |
| empty | included |
| one matching target | included |
| one non-matching target | excluded |
| many with one match | included |
| many with no match | excluded |
| target hidden by policy | explicitly defined by security design |

For optional parameters, repeat with omitted, matching, and non-matching values. Tests should execute the actual query through the same access-policy globals used in production.

## Official Documentation

- [EdgeQL sets and empty values](https://docs.geldata.com/reference/edgeql/sets)
- [EdgeQL cardinality and Cartesian products](https://docs.geldata.com/reference/reference/edgeql/cardinality)
- [EdgeQL select and filter semantics](https://docs.geldata.com/reference/edgeql/select)
- [EdgeQL set operators](https://docs.geldata.com/reference/stdlib/set)
- [EdgeQL parameters](https://docs.geldata.com/reference/edgeql/parameters)
- [Gel access policies](https://docs.geldata.com/reference/datamodel/access_policies)

## Conclusion

In EdgeQL, an empty operand can make an element-wise comparison or boolean expression empty. For empty-or-match filters, turn each branch into a singleton boolean: `not exists` for emptiness and `exists` around a filtered link for matching. This works for optional and multi links, makes quantifiers explicit, and remains understandable when parameters and access policies are involved.
