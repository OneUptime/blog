# Validation Summary: How to Configure Firestore TTL Policies to Auto-Delete Expired Documents

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Firestore
- Firebase
- Firestore TTL policies
- Google Cloud CLI (`gcloud`)
- Firebase CLI
- JavaScript Firebase Web SDK
- Python Google Cloud Firestore client
- Cloud Monitoring

## Sources Consulted
- Google Cloud Firestore TTL policies documentation: https://cloud.google.com/firestore/native/docs/ttl
- Google Cloud CLI `gcloud firestore fields ttls update` reference: https://cloud.google.com/sdk/gcloud/reference/firestore/fields/ttls/update
- Google Cloud CLI `gcloud firestore fields ttls list` reference: https://cloud.google.com/sdk/gcloud/reference/firestore/fields/ttls/list
- Firebase Cloud Firestore index definition reference: https://firebase.google.com/docs/reference/firestore/indexes
- Firestore REST API field and TTL configuration reference: https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.collectionGroups.fields
- Firebase JavaScript Firestore API reference: https://firebase.google.com/docs/reference/js/firestore_
- Google Cloud Firestore Python client samples: https://cloud.google.com/firestore/docs/samples/firestore-data-set-server-timestamp

## Issues Found
- The Firebase CLI `firestore.indexes.json` example enabled `ttl` in `fieldOverrides` without an `indexes` array. The Firebase index definition reference requires `indexes` on field overrides, so I added `"indexes": []`. This also follows Google Cloud's recommendation that TTL timestamp fields can be exempted from indexing to avoid hotspot risk at high write rates.
- The Google Cloud Console navigation described a "TTL" tab directly under Firestore. Current Google Cloud documentation uses the Firestore Databases page, database selection, and the "Time-to-live" navigation item. I updated the wording.
- The post stated that the TTL field must always be a Timestamp. Current Google Cloud documentation distinguishes Firestore Standard edition, where the field must be a Date and time value, from Firestore Enterprise edition, where the TTL field can also be an array containing a Date and time value. I clarified the Standard edition wording and added the Enterprise caveat in the limitations section.

## Review Notes
The `gcloud firestore fields ttls update` and `gcloud firestore fields ttls list` commands are current. The JavaScript examples use the current modular Firebase Web SDK APIs. The Python examples use Firestore-supported `datetime` values and `SERVER_TIMESTAMP`; in production code, timezone-aware UTC datetimes are preferable to `datetime.utcnow()`, but the examples remain technically valid.
