# Validation Summary: Filter Empty or Matching Links Correctly in EdgeQL

## Status

validated

## Post Type

Tutorial

## Technologies Covered

- Gel (formerly EdgeDB)
- EdgeQL
- Gel schema definition language
- EdgeQL set and cardinality semantics
- Optional and multi links
- Optional query parameters
- Gel access policies and globals

## Sources Consulted

- [Gel documentation: EdgeQL sets and empty values](https://docs.geldata.com/reference/edgeql/sets)
- [Gel documentation: EdgeQL cardinality and Cartesian products](https://docs.geldata.com/reference/reference/edgeql/cardinality)
- [Gel documentation: Boolean operators](https://docs.geldata.com/reference/stdlib/bool)
- [Gel documentation: Generic comparison operators, including `?=`](https://docs.geldata.com/reference/stdlib/generic)
- [Gel documentation: Set operators, including `exists` and `??`](https://docs.geldata.com/reference/stdlib/set)
- [Gel documentation: `select` and filter semantics](https://docs.geldata.com/reference/reference/edgeql/select)
- [Gel documentation: Selecting and filtering links and nested shapes](https://docs.geldata.com/reference/edgeql/select)
- [Gel documentation: Query parameters](https://docs.geldata.com/reference/edgeql/parameters)
- [Gel documentation: Links](https://docs.geldata.com/reference/datamodel/links)
- [Gel documentation: Properties](https://docs.geldata.com/reference/datamodel/properties)
- [Gel documentation: Access policies](https://docs.geldata.com/reference/datamodel/access_policies)

## Issues Found

- The only schema in the post did not define `Ticket.members` or `User.active`, although three later quantifier examples use those paths. Those examples would therefore fail to compile against the stated schema. Added `multi members: User` to `Ticket` and `required active: bool` to `User`. Making `active` required also ensures that `not .active` is a definite boolean for every member, which is necessary for the stated "every member active" semantics.

## Review Notes

- Verified the central empty-set behavior: ordinary `=` and `or` operations return an empty set when an operand is empty, while `exists`, `??`, and `?=` behave as the post describes for these cardinalities.
- Compile-checked the schema and query forms and runtime-tested the naive filter, all three optional-link corrections, the multi-link filter, the three member quantifiers, the optional-parameter case, and the nested shape filter on Gel 7.1.
- Confirmed that a nested shape filter restricts the linked objects without removing the parent object, while an outer filter controls the parent set.
- Confirmed that access policies on a target type can make a stored link appear empty in the caller's policy context.
- All documentation links in the post resolve to current official Gel documentation. No deprecated APIs or version-specific problems were found.
