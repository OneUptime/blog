# Validation Summary: How to Write Firestore Security Rules for User-Based Access Control

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
- @firebase/rules-unit-testing
- Firebase CLI

## Sources Consulted
- Firebase: Get started with Cloud Firestore Security Rules - https://firebase.google.com/docs/firestore/security/get-started
- Firebase: Structuring Cloud Firestore Security Rules - https://firebase.google.com/docs/firestore/security/rules-structure
- Firebase: Writing conditions for Cloud Firestore Security Rules - https://firebase.google.com/docs/firestore/security/rules-conditions
- Firebase: Control access to specific fields - https://firebase.google.com/docs/firestore/security/rules-fields
- Firebase: Security Rules behavior - https://firebase.google.com/docs/rules/rules-behavior
- Firebase: Build unit tests for Security Rules - https://firebase.google.com/docs/rules/unit-tests
- Firebase: Rules unit testing API reference - https://firebase.google.com/docs/reference/emulator-suite/rules-unit-testing/rules-unit-testing
- Firebase: Control access with custom claims and Security Rules - https://firebase.google.com/docs/auth/admin/custom-claims
- Firebase: Manage and deploy Firebase Security Rules - https://firebase.google.com/docs/rules/manage-deploy
- Firebase: Understand Cloud Firestore billing - https://firebase.google.com/docs/firestore/pricing

## Issues Found
- The posts example allowed authenticated users to create documents without proving that `authorId` matched their own UID, while later update/delete authorization trusted `resource.data.authorId`. I changed `allow create` to require `request.resource.data.authorId == request.auth.uid`, split update/delete, and prevented updates from changing `authorId`.
- The team documents example allowed create operations without binding `authorId` to the authenticated team member, and update/delete authorization trusted that field. I split read/create/update/delete rules, required team membership where appropriate, required `authorId` to match the creator, and prevented updates from changing `authorId`.
- The section titled "Rate Limiting with Timestamps" did not implement rate limiting. It only validated that the creation timestamp equals `request.time`. I renamed the section to "Validating Server Timestamps" and updated the surrounding wording.
- The decision flow omitted the overlapping-rules behavior: if multiple matching `allow` expressions apply, access is granted if any condition is true. I updated the flow label and explanation.
- The testing snippet used `fs.readFileSync()` without importing `fs`. I added `const fs = require('fs');`.
- The article stated that each `get()` call counts toward reads. Official docs are more precise: document access calls can incur additional reads, are subject to limits, and cached calls may not count toward those limits. I updated both references to `get()` accordingly.

## Review Notes
The Firebase CLI was not installed in the local workspace, so CLI commands were verified against official Firebase documentation rather than local `--help` output. The post remains a concise tutorial; future improvements could add `hasOnly()` examples when demonstrating strict schema validation, but the current `hasAll()` usage is technically valid for requiring fields.
