# Validation Summary: How to Use MongoDB for Healthcare Data Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (document model, CRUD operations, aggregation framework)
- MongoDB Queryable Encryption (client-side field-level encryption)
- MongoDB Role-Based Access Control (RBAC)
- MongoDB TTL Indexes
- HIPAA compliance concepts (audit logging, PHI protection)
- LOINC and ICD-10 medical coding systems
- FHIR-inspired data modeling
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Queryable Encryption documentation (encryptedFieldsMap API vs. CSFLE schemaMap API)
- MongoDB Client-Side Field Level Encryption (CSFLE) documentation (schemaMap with JSON Schema format)
- MongoDB RBAC documentation (privilege actions, resource definitions, field-level access limitations)
- MongoDB TTL Index documentation (expireAfterSeconds behavior)
- MongoDB Aggregation Pipeline documentation ($group, $max, $last, $sort operators)
- HIPAA Security Rule § 164.312(b) — audit controls requirement
- HIPAA Privacy Rule 45 CFR § 164.530(j) — 6-year documentation retention requirement
- LOINC database — code 55284-4 (blood pressure), code 4548-4 (HbA1c)
- ICD-10 code reference — E11 (Type 2 diabetes mellitus)

## Issues Found

### 1. Encryption feature mislabeled (line 179)
**What was wrong:** The section heading and text said "Client-Side Field Level Encryption" but the code used `encryptedFieldsMap` with `{ path, bsonType }` syntax, which is the MongoDB **Queryable Encryption** API (MongoDB 6.0+/7.0 GA). CSFLE uses `schemaMap` with JSON Schema format instead.
**What was changed:** Updated the text from "Client-Side Field Level Encryption" to "Queryable Encryption" in both the section body and the summary paragraph.

### 2. HIPAA audit log retention claim overstated (line 170)
**What was wrong:** The TTL index comment stated "retain audit logs for 6 years (HIPAA requirement)". HIPAA's 6-year retention requirement (45 CFR § 164.530(j)) applies to policies, procedures, and compliance documentation — not specifically to system audit logs. The Security Rule (§ 164.312(b)) mandates audit controls but does not specify a retention period for audit logs. The 6-year period is a common organizational best practice, not a direct HIPAA mandate for audit logs.
**What was changed:** Updated the comment to "retain audit logs for 6 years (common policy aligned with HIPAA documentation retention)" and updated the summary to say "retention compliance" instead of "HIPAA retention compliance."

### 3. Billing role comment was misleading (lines 225-234)
**What was wrong:** The comment said "Billing role - can see MRN and insurance but not clinical details" but the role grants `find` on the entire `patients` collection, which gives access to ALL fields. MongoDB's built-in RBAC does not support field-level access restrictions.
**What was changed:** Replaced the misleading comment with an accurate description ("read-only access to the patients collection") and added a note that field-level restriction requires creating a view with `$project` and granting access to the view instead.

### 4. Population health aggregation returned highest HbA1c, not latest (lines 260-277)
**What was wrong:** The aggregation used `$max` in the `$group` stage to compute `latestHbA1c`, but `$max` returns the highest value, not the most recent one. A patient whose HbA1c improved from 9.0 to 7.0 would still be flagged because `$max` picks 9.0. Additionally, the initial `$match` pre-filtered for `value.numeric > 8.0`, which would exclude a patient's most recent (possibly improved) reading, making the "latest" determination incorrect.
**What was changed:** Removed the `value.numeric > 8.0` pre-filter from the initial `$match`, added a `$sort: { effectiveDateTime: 1 }` stage before `$group`, and changed `$max` to `$last` so the pipeline correctly selects each patient's most recent HbA1c value before filtering for poor control.

## Review Notes
- The TTL index computation `60 * 60 * 24 * 365 * 6` yields 189,216,000 seconds (exactly 2,190 days). This undercounts by ~1.5 days over 6 years due to ignoring leap years. For strict compliance minimums, a slightly larger value (e.g., using 366 instead of 365) would be safer. Left as-is since the difference is negligible for practical purposes.
- The Queryable Encryption field definitions omit optional `queries` and `keyId` properties. Without `queries`, encrypted fields cannot be queried — which may limit usefulness but is not technically incorrect for the encryption-at-rest use case shown.
- The `ObjectId("...")` placeholders in the observations collection are fine for illustrative purposes but would need real ObjectId values in production.
- Medical coding references (LOINC 55284-4 for blood pressure, LOINC 4548-4 for HbA1c, ICD-10 E11 for Type 2 diabetes, RxNorm 860975 for Metformin 500mg) were verified as correct.
