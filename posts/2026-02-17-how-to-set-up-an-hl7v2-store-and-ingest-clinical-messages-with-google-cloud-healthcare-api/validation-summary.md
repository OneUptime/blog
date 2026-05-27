# Validation Summary: How to Set Up an HL7v2 Store and Ingest Clinical Messages

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Healthcare API
- HL7v2 stores and messages
- Google Cloud Pub/Sub notifications
- Google Cloud Functions
- Firestore
- Google Cloud MLLP adapter
- Python
- Google Cloud CLI
- Docker

## Sources Consulted
- Google Cloud Healthcare API: Creating and managing HL7v2 stores: https://docs.cloud.google.com/healthcare-api/docs/how-tos/hl7v2
- Google Cloud Healthcare API: Creating and managing HL7v2 messages: https://docs.cloud.google.com/healthcare-api/docs/how-tos/hl7v2-messages
- Google Cloud Healthcare API: REST messages.ingest reference: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/projects.locations.datasets.hl7V2Stores.messages/ingest
- Google Cloud Healthcare API: REST HL7v2 messages resource reference: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/projects.locations.datasets.hl7V2Stores.messages
- Google Cloud Healthcare API: REST HL7v2 stores resource reference: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/projects.locations.datasets.hl7V2Stores
- Google Cloud Healthcare API: Configure a schema to parse HL7v2 messages: https://docs.cloud.google.com/healthcare-api/docs/how-tos/parser-api
- Google Cloud Healthcare API: Configuring Pub/Sub notifications: https://docs.cloud.google.com/healthcare-api/docs/how-tos/pubsub
- Google Cloud Healthcare API: Transmitting HL7v2 messages over TCP/IP connections: https://docs.cloud.google.com/healthcare-api/docs/how-tos/mllp-adapter
- Google Cloud SDK reference: gcloud healthcare hl7v2-stores create: https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/hl7v2-stores/create

## Issues Found
- The gcloud HL7v2 store command used `--notification-config=pubsubTopic=...`, but the gcloud flag key is `pubsub-topic`. Changed it to `--notification-config=pubsub-topic=...`.
- The HL7v2 store examples omitted the recommended parser version and the Python API example used `V2`. Updated both to use the documented `V3` parser version for new stores.
- Pub/Sub notifications require the Healthcare API service agent to have publisher permission on the topic. Added the `roles/pubsub.publisher` IAM binding command.
- The package install command included `google-cloud-pubsub`, but the code uses Firestore and Functions Framework instead. Updated the install command.
- The parsed message example treated `parsedData` as a map of segment names. The API returns `parsedData.segments`, so the loop now iterates over that list and reads `segmentId`.
- The list filter used a compact `messageType="..."` expression and the text did not clarify that `messageType` is MSH-9.1. Updated the docstring and filter expression to match the documented filter form.
- The processing pipeline compared `message.messageType` to values like `ADT^A01`, but the API's `messageType` field is MSH-9.1 only. Added a small MSH parser and route on the full MSH-9 value from the raw message.
- The Cloud Function sample loaded a local service account key file, which is not appropriate for the deployed function as written. Updated it to use Application Default Credentials.
- The deployment command showed `process_hl7v2/main.py` as the function file location but did not set the source directory. Added `--source=process_hl7v2`.
- The MLLP adapter command used unsupported environment variables. Replaced it with the documented adapter executable and command-line flags, including the local ADC mount.
- The MLLP adapter comments described the `docker run` example as a GKE deployment and called port 2575 the standard MLLP port. Updated the text to describe a local container run and the configured listener port.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK and Cloud Healthcare API documentation rather than local `--help` output.
