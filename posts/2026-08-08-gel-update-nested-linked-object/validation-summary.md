# Validation Summary: Update Nested Linked Objects in EdgeQL Without Replacing Links

## Status

validated

## Post Type

Technical guide/tutorial

## Technologies Covered

- Gel and the Gel Schema Definition Language (SDL)
- EdgeQL updates, nested shapes, and query parameters
- Single and multi links
- Exclusive constraints and cardinality assertions
- Nested inserts and deletion behavior
- Gel access policies
- Gel JavaScript client transactions and result-cardinality methods

## Sources Consulted

- [EdgeQL update](https://docs.geldata.com/reference/edgeql/update)
- [Formal EdgeQL update reference](https://docs.geldata.com/reference/reference/edgeql/update)
- [EdgeQL insert and nested inserts](https://docs.geldata.com/reference/edgeql/insert)
- [Gel links](https://docs.geldata.com/reference/datamodel/links)
- [Gel link properties](https://docs.geldata.com/reference/datamodel/linkprops)
- [Gel properties](https://docs.geldata.com/reference/datamodel/properties)
- [Gel object types and built-in IDs](https://docs.geldata.com/reference/datamodel/objects)
- [Gel constraints](https://docs.geldata.com/reference/datamodel/constraints)
- [EdgeQL cardinality](https://docs.geldata.com/reference/reference/edgeql/cardinality)
- [Set functions and cardinality assertions](https://docs.geldata.com/reference/stdlib/set)
- [Gel access policies](https://docs.geldata.com/reference/datamodel/access_policies)
- [Gel JavaScript client, query cardinality, and transactions](https://docs.geldata.com/reference/using/js/client)
- [Gel client transaction behavior](https://docs.geldata.com/reference/using/clients)

## Issues Found

- The nested-insert warning said repeated edits would create orphaned addresses. Because address targets can be shared, an old target is not necessarily orphaned. Changed the claim to say repeated edits can leave old addresses orphaned when nothing else links to them.
- The access-policy section implied that its `assert_exists` catches a child target filtered by policy. That assertion wraps only the parent selection, while select or update-read policies on `Address` can remove the child from the update result. Clarified the assertion's scope and recommended a required-single client query when the application requires exactly one updated address.

## Review Notes

- The corrected schema and representative queries were compiled and exercised against the official `geldata/gel:latest` container image running Gel 7.1. This included the linked-target update, composed parent/child update, optional-property clearing, link replacement, nested insertion, multi-link replacement, `+=`, `-=`, and bulk target update.
- The link assignment and membership semantics, ID cardinality explanation, atomic-statement claim, exclusivity model, shared-target warning, deletion behavior, and JavaScript transaction retry guidance are otherwise accurate.
- All seven official documentation links included in the post resolved to the intended current Gel documentation during review.
