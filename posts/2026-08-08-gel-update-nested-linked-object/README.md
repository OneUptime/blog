# Update Nested Linked Objects in EdgeQL Without Replacing Links

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, EdgeQL, Update, Links, Data Modeling

Description: Update a target reached through a Gel link while preserving the relationship, cardinality, and unrelated members of multi links.

---

An EdgeQL link stores a relationship to another object. Assigning the link and updating the linked object are different operations:

- `set { shipping_address := some_address }` changes which address the order links to.
- `update order.shipping_address set { city := ... }` changes the existing address object.
- `set { labels := some_labels }` replaces the whole multi-link set.
- `set { labels += one_label }` adds membership without discarding the rest.

Most accidental replacement bugs come from choosing an assignment operator before deciding which of those domain operations is intended.

## Use a Concrete Schema

```gel
type Address {
  required line1: str;
  required city: str;
  required postal_code: str;
}

type Label {
  required name: str {
    constraint exclusive;
  };
}

type Order {
  required number: str {
    constraint exclusive;
  };
  required shipping_address: Address;
  multi labels: Label;
  note: str;
}
```

The nested shape used to read an order does not imply nested ownership:

```edgeql
select Order {
  number,
  shipping_address: {
    line1,
    city,
    postal_code
  },
  labels: {
    name
  }
};
```

`Address` remains an independent object. Other objects can link to the same address unless the schema prevents it.

## Update the Existing Link Target

Select the parent first and use its link as the update selector:

```edgeql
with
  target_order := assert_exists((
    select Order
    filter .id = <uuid>$order_id
  ))
select (
  update target_order.shipping_address
  set {
    city := <str>$city,
    postal_code := <str>$postal_code
  }
) {
  id,
  line1,
  city,
  postal_code
};
```

The `update` selector is the address reached from the already selected order. It does not assign `Order.shipping_address`, so the link remains intact.

Filtering `Order.id` has at-most-one cardinality because object IDs are exclusive. `assert_exists` turns a missing order into an error rather than a successful empty update. For a non-exclusive business filter, use `assert_single` as well or, better, add the correct exclusivity constraint when uniqueness is a domain rule.

## Update Parent and Child in One Statement

An `update` expression returns the updated object, so it can be named and reused:

```edgeql
with
  target_order := assert_exists((
    select Order
    filter .id = <uuid>$order_id
  )),
  updated_address := (
    update target_order.shipping_address
    set {
      city := <str>$city,
      postal_code := <str>$postal_code
    }
  )
select (
  update target_order
  set {
    note := <optional str>$note,
    shipping_address := updated_address
  }
) {
  id,
  number,
  note,
  shipping_address: {
    id,
    city,
    postal_code
  }
};
```

The address assignment points to the same updated address object. Including it makes the data flow explicit when both mutations are composed. The entire EdgeQL statement is atomic.

If only the child changes, omit the parent update entirely. Reassigning the same link adds noise and can interact with update-write access policies even when relationship membership is unchanged.

## Know When `:=` Really Means Replace

To move an order to an existing address, replacement is correct:

```edgeql
update Order
filter .id = <uuid>$order_id
set {
  shipping_address := assert_exists((
    select Address
    filter .id = <uuid>$address_id
  ))
};
```

This does not modify or delete the old address. It only changes the forward link. If the old address is conceptually owned by the order, decide separately whether it should be retained, audited, or deleted. Deletion policies and other backlinks may prevent or change that cleanup.

A nested insert deliberately creates and links a new target:

```edgeql
update Order
filter .id = <uuid>$order_id
set {
  shipping_address := (
    insert Address {
      line1 := <str>$line1,
      city := <str>$city,
      postal_code := <str>$postal_code
    }
  )
};
```

Do not use a nested insert to represent an edit. Repeated edits can leave old address objects orphaned when nothing else links to them, unless cleanup is modeled.

## Preserve Multi-link Members With `+=` and `-=`

This replaces every existing label with the selected set:

```edgeql
update Order
filter .id = <uuid>$order_id
set {
  labels := (
    select Label
    filter .name in array_unpack(<array<str>>$names)
  )
};
```

Replacement is appropriate for a full synchronization API, but dangerous for an add-one-label operation. Add without discarding:

```edgeql
update Order
filter .id = <uuid>$order_id
set {
  labels += assert_exists((
    select Label
    filter .name = <str>$name
  ))
};
```

Remove one membership without deleting the `Label` object:

```edgeql
update Order
filter .id = <uuid>$order_id
set {
  labels -= (
    select Label
    filter .name = <str>$name
  )
};
```

`+=` and `-=` operate on the link's value set. They do not update properties on the target labels.

## Updating All Linked Targets Can Be Broad

An update selector can return many objects:

```edgeql
with target_order := assert_exists((
  select Order
  filter .id = <uuid>$order_id
))
update target_order.labels
set {
  name := str_lower(.name)
};
```

This updates every label linked to that order. Because labels can be shared with other orders, those other orders observe the new names too. A link does not imply aggregate ownership.

Before updating through a multi link, ask:

- Are targets shared?
- Should the operation change objects or membership?
- Does a uniqueness constraint make the bulk update conflict?
- Could access policies hide some targets and produce a partial visible set?

If labels are global taxonomy objects, membership change is usually right and renaming belongs in an administrative operation.

## Model Ownership When It Is Real

If an address must belong to at most one order, encode that invariant rather than relying on API discipline. Gel's exclusivity constraints on links model one-to-one or one-to-many relationships. Then test deletion behavior and required cardinality in migrations.

Even with exclusive ownership, the target is still an object. Gel does not automatically delete it merely because a link is replaced. Choose explicit deletion policies based on recovery and audit requirements.

## Account for Access Policies

To update a target, it must be visible under applicable select and update-read policies, and its final state must pass update-write policies. The parent can be visible while the linked child is hidden by a policy on the child's type.

Test the exact request-scoped client and globals. Select and update-read policies can filter targets out of the update result, and the `assert_exists` above checks only the parent order. If the caller requires exactly one updated address, use a client method such as `queryRequiredSingle` to reject an empty result. Do not let the resulting error reveal the existence of another tenant's object to an untrusted caller.

## Use a Client Transaction for Separate Statements

One EdgeQL statement is atomic. If the application intentionally issues several statements, use the client transaction API and run every query on the transaction object:

```ts
await requestDb.transaction(async (tx) => {
  await tx.execute(updateAddressQuery, addressArgs);
  await tx.execute(updateOrderQuery, orderArgs);
});
```

The JavaScript client may retry the callback for retryable failures, so keep external side effects outside it.

## Official Documentation

- [EdgeQL update](https://docs.geldata.com/reference/edgeql/update)
- [EdgeQL insert and nested inserts](https://docs.geldata.com/reference/edgeql/insert)
- [Gel links](https://docs.geldata.com/reference/datamodel/links)
- [Gel link properties](https://docs.geldata.com/reference/datamodel/linkprops)
- [EdgeQL cardinality](https://docs.geldata.com/reference/reference/edgeql/cardinality)
- [Gel JavaScript transactions](https://docs.geldata.com/reference/using/js/client)
- [Gel access policies](https://docs.geldata.com/reference/datamodel/access_policies)

## Conclusion

Select the linked target as the `update` subject when its fields should change. Assign a link with `:=` only when relationship replacement is intended, and use `+=` or `-=` for incremental multi-link membership. Because linked objects may be shared and independently protected, encode ownership in schema and test the exact cardinality and policy context before composing nested mutations.
