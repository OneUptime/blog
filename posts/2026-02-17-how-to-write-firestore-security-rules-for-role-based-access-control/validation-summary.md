# Validation Summary: How to Write Firestore Security Rules for Role-Based Access Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Firestore
- Firebase Security Rules
- Firebase Authentication custom claims
- Firebase Admin SDK for Node.js
- Firebase Emulator Suite
- `@firebase/rules-unit-testing`

## Sources Consulted
- Firebase documentation: Structuring Cloud Firestore Security Rules - https://firebase.google.com/docs/firestore/security/rules-structure
- Firebase documentation: Writing conditions for Cloud Firestore Security Rules - https://firebase.google.com/docs/firestore/security/rules-conditions
- Firebase documentation: Control access to specific fields - https://firebase.google.com/docs/firestore/security/rules-fields
- Firebase Security Rules documentation: How Security Rules work and rule limits - https://firebase.google.com/docs/rules/rules-behavior
- Firebase Authentication documentation: Control Access with Custom Claims and Security Rules - https://firebase.google.com/docs/auth/admin/custom-claims
- Firebase documentation: Build unit tests for Security Rules - https://firebase.google.com/docs/rules/unit-tests
- Firebase reference: `@firebase/rules-unit-testing` API - https://firebase.google.com/docs/reference/emulator-suite/rules-unit-testing/rules-unit-testing
- Firebase Rules reference: `rules.MapDiff` - https://firebase.google.com/docs/reference/rules/rules.MapDiff

## Issues Found
- The post stated that `getUserRole()` does a document read every time it is called and described the access-call limit only as 10 calls per evaluation. Updated this to match Firestore's documented limits: 10 access calls for single-document and query requests, 20 for multi-document reads, transactions, and batched writes, with the 10-call limit still applying per operation inside a transaction or batch.
- The testing example did not seed the `/users/{uid}` role documents required by the document-based RBAC rules, so the admin delete assertion would fail under the shown rules. Added setup using `testEnv.withSecurityRulesDisabled()` to create the viewer role, admin role, and test post.
- The testing example mixed CommonJS `require()` style with top-level `await`. Updated the example to use ES module imports and the current modular Firestore SDK functions (`doc`, `setDoc`, and `deleteDoc`) consistently with the current rules unit testing documentation.
- The common pitfalls section said repeated calls were each a separate read. Updated this to note that calls count toward documented access-call limits, while repeated calls to the same document may be cached and not counted again.

## Review Notes
The Firestore rule examples are intentionally simplified and do not validate full document schemas, allowed field sets, or ownership immutability on post updates. Those would be useful production hardening additions, but they are outside the scope of correcting technical inaccuracies in this post.
