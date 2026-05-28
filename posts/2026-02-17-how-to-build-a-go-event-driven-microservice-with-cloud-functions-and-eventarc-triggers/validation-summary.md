# Validation Summary: How to Build a Go Event-Driven Microservice with Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Eventarc
- Go
- CloudEvents
- Cloud Storage events
- Firestore document events
- Cloud Audit Logs events
- gcloud CLI

## Sources Consulted
- Google Cloud: Write Cloud Run functions - https://docs.cloud.google.com/run/docs/write-functions
- Google Cloud: Cloud Storage Cloud Functions sample - https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Google Cloud: Trigger functions with Firestore documents - https://docs.cloud.google.com/run/docs/triggering/trigger-functions-with-firestore-documents
- Google Cloud: Eventarc CloudEvents format - https://docs.cloud.google.com/eventarc/docs/cloudevents
- Google Cloud: Determine event filters for Cloud Audit Logs - https://docs.cloud.google.com/eventarc/docs/determining-filters-cal
- Google Cloud: Runtime support for Cloud Run functions - https://docs.cloud.google.com/functions/docs/runtime-support
- Google Cloud: IAM audit logging - https://docs.cloud.google.com/iam/docs/audit-logging
- Google Cloud: Cloud SQL audit logging - https://docs.cloud.google.com/sql/docs/mysql/audit-logging
- Google Cloud SDK: gcloud functions deploy reference - https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy

## Issues Found
- The Firestore Go example decoded the event payload with `e.DataAs(&data)` into custom JSON structs. Current official Firestore Eventarc samples for Go decode Firestore event data as protobuf using `firestoredata.DocumentEventData` and `proto.UnmarshalOptions`. Updated the Firestore handler and helper signatures accordingly.
- The setup commands were missing the Firestore CloudEvents protobuf package and protobuf runtime dependency. Added `go get github.com/googleapis/google-cloudevents-go/cloud/firestoredata` and `go get google.golang.org/protobuf/proto`.
- The first Go import block included `encoding/json` even though the examples did not use it. Removed the unused import so the combined sample compiles.
- The deployment commands used `--runtime=go122`, which is deprecated as of 2026-05-28 and scheduled for decommissioning on 2026-07-28. Updated the examples to `--runtime=go125`, which is listed as supported in current Google Cloud runtime docs.
- The audit-log method examples used incorrect method names for IAM policy changes and Cloud SQL user updates. Updated them to `google.iam.admin.v1.SetIAMPolicy` and `cloudsql.users.update` to match official audit logging docs.

## Review Notes
- The Cloud Storage and Cloud Audit Logs examples are intentionally lightweight and use minimal local structs. For production code, Google recommends the generated Google CloudEvents data types where available, especially to tolerate schema evolution and unknown fields.
