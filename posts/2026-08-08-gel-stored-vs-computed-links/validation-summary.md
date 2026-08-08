# Validation Summary: Stored vs Computed Links in Gel

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Gel schema definition language (SDL)
- EdgeQL queries and updates
- Stored links and computed links
- Backlinks and computed fields
- Cardinality and exclusivity constraints
- Indexes and query analysis
- Read-only links
- Schema migrations and branches
- Access policies and role permissions

## Sources Consulted
- Gel computed properties and links — https://docs.geldata.com/reference/datamodel/computeds
- Gel links and backlinks — https://docs.geldata.com/reference/datamodel/links
- Gel properties — https://docs.geldata.com/reference/datamodel/properties
- Gel object types — https://docs.geldata.com/reference/datamodel/objects
- Gel indexes — https://docs.geldata.com/reference/datamodel/indexes
- Gel access policies — https://docs.geldata.com/reference/datamodel/access_policies
- Gel permissions — https://docs.geldata.com/reference/datamodel/permissions
- Gel migrations — https://docs.geldata.com/reference/datamodel/migrations
- Gel branches — https://docs.geldata.com/reference/datamodel/branches
- EdgeQL paths and backlinks — https://docs.geldata.com/reference/edgeql/paths
- EdgeQL update guide — https://docs.geldata.com/reference/edgeql/update
- EdgeQL update reference — https://docs.geldata.com/reference/reference/edgeql/update
- EdgeQL `with` block reference — https://docs.geldata.com/reference/reference/edgeql/with
- EdgeQL volatility — https://docs.geldata.com/reference/reference/edgeql/volatility
- EdgeQL `analyze` — https://docs.geldata.com/reference/reference/edgeql/analyze
- Gel CLI `describe object` — https://docs.geldata.com/reference/using/cli/gel_describe/gel_describe_object
- Gel CLI UI — https://docs.geldata.com/reference/using/cli/gel_ui
- Gel migration guide for adding backlinks — https://docs.geldata.com/resources/guides/migrations/tips
- Gel 3 and 4 changelogs for schema-keyword version behavior — https://docs.geldata.com/resources/changelog/3_x and https://docs.geldata.com/resources/changelog/4_x

## Issues Found
1. The `Team.active_members` example filtered and updated `User.active`, but the shown `User` schema did not declare that property. Added `required active: bool;` so the schema and update example are valid.
2. The post said the next read of `target_user.posts` would include the reassigned post, but `target_user` is local to that EdgeQL statement's `with` block. Changed this to a subsequent read of that user's `posts`.
3. The schema-inspection checklist showed `gel describe object` without its required object-name argument. Changed it to `gel describe object User`.
4. The checklist referred only to branches even though the post also discusses legacy EdgeDB generations. Clarified that EdgeDB versions before 5 used databases rather than branches.
5. The mutation requirements omitted Gel 7's role-permission layer. Added the `sys::perm::data_modification` requirement for non-superuser roles on Gel 7 and later, clarified the access-policy action names, and linked the official permissions documentation.

## Review Notes
- The core distinction between stored and computed links, backlink mutation fix, cardinality guidance, read-only behavior, volatility restrictions, and index constraints matched the current official documentation.
- The corrected schema and representative update examples were exercised successfully against Gel 7.1. The computed-link assignment and required-empty-link examples failed with the documented errors, as intended.
- Automatic link indexing applies to stored links; a computed backlink has no separately persisted index. The post's wording is appropriately qualified.
- A read-only stored link cannot be assigned through `update`, but the official docs note that target deletion policies can still cause its value to change.
- For a live computed-to-stored migration, concurrent writes should be handled with dual writes, a maintenance window, or a final reconciliation after backfill before cutover.
