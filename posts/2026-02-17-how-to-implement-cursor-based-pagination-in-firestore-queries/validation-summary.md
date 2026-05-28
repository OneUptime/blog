# Validation Summary: How to Implement Cursor-Based Pagination in Firestore Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Firestore
- Firebase Web SDK
- JavaScript
- Cursor-based pagination

## Sources Consulted
- Firebase documentation: Paginate data with query cursors - https://firebase.google.com/docs/firestore/query-data/query-cursors
- Firebase documentation: Order and limit data with Cloud Firestore - https://firebase.google.com/docs/firestore/query-data/order-limit-data
- Firebase JavaScript API reference: QueryConstraint - https://firebase.google.com/docs/reference/js/firestore_.queryconstraint
- Firebase JavaScript API reference: QueryStartAtConstraint and startAfter field values - https://firebase.google.com/docs/reference/js/firestore_.querystartatconstraint
- Firebase documentation: Understand Cloud Firestore billing - https://firebase.google.com/docs/firestore/pricing

## Issues Found
- The introduction said Firestore does not support traditional offset-based pagination. This was too broad because Firestore supports offsets in some APIs, although skipped documents are billed as reads. Updated the wording to scope the statement to the Firebase Web SDK and explain why cursors are recommended.
- The offset cost example said page 100 with 20 items would read 2,000 documents. The exact skipped count depends on page numbering and API semantics, so the text now states the underlying issue without relying on a potentially misleading exact number.
- The reusable paginator's previous-page implementation used `startAfter()` with the previous page's first document after popping the stack. From page 3 or later, this would return an overlapping page instead of the actual previous page. Updated it to store first-document cursors and use `endBefore(currentFirstDoc)` with `limitToLast(pageSize)`, matching the backward-pagination pattern described earlier in the post.
- The wrap-up mentioned only `endBefore` for backward navigation. Updated it to mention `limitToLast` as well, since both are required for the shown previous-page query.

## Review Notes
The simple `hasMore: snapshot.docs.length === pageSize` checks are a common heuristic but cannot distinguish an exact final full page from a page with more results after it. The post later shows the more precise `PAGE_SIZE + 1` approach.
