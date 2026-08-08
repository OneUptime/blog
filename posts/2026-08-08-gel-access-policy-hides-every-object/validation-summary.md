# Validation Summary: Why a Gel Access Policy Can Hide Every Object

## Status

validated

## Post Type

Troubleshooting Guide

## Technologies Covered

- Gel
- EdgeDB 3 compatibility behavior
- EdgeQL
- Gel access policies and object-level authorization
- Gel globals
- Gel role permissions
- Gel JavaScript/TypeScript client
- Gel UI and server configuration

## Sources Consulted

- Gel access policies: https://docs.geldata.com/reference/datamodel/access_policies
- Gel globals: https://docs.geldata.com/reference/datamodel/globals
- Gel JavaScript client: https://docs.geldata.com/reference/using/js/client
- EdgeQL sets: https://docs.geldata.com/reference/edgeql/sets
- Gel generic comparison operators: https://docs.geldata.com/reference/stdlib/generic
- Gel links: https://docs.geldata.com/reference/datamodel/links
- Gel permissions: https://docs.geldata.com/reference/datamodel/permissions
- Gel system functions: https://docs.geldata.com/reference/stdlib/sys
- Gel server configuration: https://docs.geldata.com/reference/running/configuration
- Gel connection parameters: https://docs.geldata.com/reference/using/connection
- Gel 7 changelog: https://docs.geldata.com/resources/changelog/7_x
- EdgeDB 2.6 changelog documenting the EdgeDB 3 nonrecursive-policy change: https://docs.geldata.com/resources/changelog/2_x
- Official Gel Docker deployment documentation: https://docs.geldata.com/reference/running/deployment/docker

## Issues Found

### 1. Overbroad description of write-policy failures

- **What was wrong:** The introduction said a write-policy violation normally raises `AccessPolicyError`. Denied `delete` and `update read` operations are filtered up front; only `insert` and `update write` policy violations raise that error.
- **What was changed:** Narrowed the statement to `insert` and `update write` violations.
- **Why:** This now matches Gel's documented access-policy evaluation order and the operation table later in the post.

### 2. Missing two-empty-operands caveat for `?=`

- **What was wrong:** The explanation could imply that coalescing equality always denies a missing identity. In fact, `?=` considers two empty operands equal.
- **What was changed:** Clarified that the shown comparison is safe because required `Document.tenant` makes `.tenant.id` non-empty, and advised an explicit guard when the other operand can also be empty.
- **Why:** This prevents the same pattern from accidentally allowing access when both compared values are absent.

### 3. Incomplete administrative-reader schema example

- **What was wrong:** The `admins_read` fragment referenced `global current_user.is_admin` without stating that the computed object global and property must exist, and the policy fragment omitted its enclosing object type.
- **What was changed:** Stated the prerequisite and showed the complete corrected `Event` definition with both its insert and select policies.
- **Why:** The example is now syntactically situated and reproducible when used with the stated computed global.

### 4. Imprecise required-link visibility behavior

- **What was wrong:** The linked-object section said a protected nested link could be empty or unavailable without distinguishing cardinality. A normally dereferenced required link whose target is hidden raises `CardinalityViolationError`; an optional link can appear empty.
- **What was changed:** Described both behaviors explicitly for the required `Document.tenant` link and for optional links.
- **Why:** This matches Gel's required-link semantics and hidden-by-policy behavior.

## Review Notes

- The required-link behavior was also reproduced on Gel 7.1 using the official `geldata/gel:7` container image.
- `sys::get_current_branch()` is current and was added in version 5. Role permissions were added in Gel 7, as the post states.
- On Gel 7 and later, disabling access policies requires `cfg::perm::configure_apply_access_policies`; the post's recommendation to use an administrative isolated session is appropriate.
- `{}` is Gel CLI/EdgeQL notation for an empty set. The JavaScript client's `query()` method represents an empty result as `[]`; the post does not show a conflicting JavaScript result value.
- All six Gel documentation links in the post resolved successfully. The author link redirects to GitHub's canonical non-`www` URL and remains valid.
