# Validation Summary: How to Design a Healthcare Records Schema in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (document model, indexes, queries)
- ICD-10 (diagnosis coding)
- CPT (procedure coding)
- LOINC (lab result coding)
- RxNorm (medication coding)

## Sources Consulted
- MongoDB official documentation: `createIndex()` syntax, compound indexes, multikey indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB query documentation: `find()`, `sort()`, `$gte` operator — https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- ICD-10-CM code lookup: I10 (Essential hypertension), E11.9 (Type 2 diabetes without complications) — https://www.icd10data.com/
- CPT code reference: 99395 (preventive medicine, 18-39 years), 99396 (preventive medicine, 40-64 years) — AMA CPT code set
- LOINC code verification: 2951-2 (Sodium), 2345-7 (Glucose) — https://loinc.org/
- RxNorm code verification: 29046 (Lisinopril ingredient CUI) — https://mor.nlm.nih.gov/RxNav/
- Sodium reference range (136-145 mEq/L) and fasting glucose reference range (70-100 mg/dL) — standard clinical laboratory references

## Issues Found
- **CPT code mismatch with patient age**: The patient Jane Smith has a date of birth of 1985-03-15, making her 41 years old at the encounter date of 2026-03-15. The original CPT code `99395` covers ages 18-39. Changed to `99396` ("Periodic preventive medicine exam, 40-64 years") which is the correct code for a 41-year-old established patient.

## Review Notes
- The post tags include "FHIR" but the post does not actually discuss FHIR resources or FHIR-compliant schema design. The coding systems used (ICD-10, LOINC, RxNorm) are part of the FHIR ecosystem, but the document schemas shown are custom MongoDB schemas, not FHIR resource mappings. This is not a technical error but could set incorrect expectations for readers looking for FHIR guidance.
- The BMI value of 27.5 was verified as correct for the given height (65 inches) and weight (165 lbs).
- The compound multikey index on `labResults` (`patientId + results.loincCode + resultedAt`) is valid since only one field (`results.loincCode`) is within an array, which is within MongoDB's one-array-field-per-compound-index limitation.
- All MongoDB query syntax, operators, and index definitions are correct and use current (non-deprecated) APIs.
