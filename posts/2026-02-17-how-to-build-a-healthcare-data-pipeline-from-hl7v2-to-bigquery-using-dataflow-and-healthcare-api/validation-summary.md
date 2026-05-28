# Validation Summary: How to Build a Healthcare Data Pipeline from HL7v2 to BigQuery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Healthcare API
- HL7v2
- MLLP Adapter
- Pub/Sub
- Dataflow
- Apache Beam Python SDK
- BigQuery
- Google Cloud CLI

## Sources Consulted
- Google Cloud SDK reference for `gcloud healthcare hl7v2-stores create`: https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/hl7v2-stores/create
- Cloud Healthcare API HL7v2 store guide: https://docs.cloud.google.com/healthcare-api/docs/how-tos/hl7v2
- Cloud Healthcare API Pub/Sub notifications guide: https://docs.cloud.google.com/healthcare-api/docs/how-tos/pubsub
- Cloud Healthcare API Pub/Sub notification concepts: https://docs.cloud.google.com/healthcare-api/docs/concepts/pubsub
- Cloud Healthcare API HL7v2 parser configuration guide: https://docs.cloud.google.com/healthcare-api/docs/how-tos/parser-api
- Cloud Healthcare API default schematized parser guide: https://docs.cloud.google.com/healthcare-api/docs/how-tos/hl7v2-default-parser
- Cloud Healthcare API HL7v2 RPC reference: https://docs.cloud.google.com/healthcare-api/docs/reference/rpc/google.cloud.healthcare.v1/hl7v2
- Cloud Healthcare API MLLP adapter guide: https://docs.cloud.google.com/healthcare-api/docs/how-tos/mllp-adapter
- Cloud Healthcare API message view reference: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/MessageView
- Apache Beam `ReadFromPubSub` Python reference: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.pubsub.html
- Apache Beam `WriteToBigQuery` Python reference: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.bigquery.html

## Issues Found
- The HL7v2 store creation command used `pubsubTopic` in the `--notification-config` flag. The current `gcloud` flag syntax uses `pubsub-topic`, so the command was updated.
- The HL7v2 store creation command did not specify the recommended immutable V3 parser version. Added `--parser-version=v3`.
- The parser configuration section implied message-type acceptance and used an overbroad `updateMask=parserConfig`. Updated the explanation and PATCH example to match the default schematized parsing workflow with `updateMask=parser_config.schema`.
- The Dataflow code parsed Healthcare API Pub/Sub notifications as JSON with a `name` field. Official Healthcare API notifications put the HL7v2 message resource name in the Pub/Sub message data, so the code now treats the decoded Pub/Sub payload as the message name.
- The Dataflow code treated `message.parsed_data` as a dictionary keyed by segment IDs. The Healthcare API returns `ParsedData.segments`, so helper functions were added to group segments and read fields from the segment `fields` map.
- The ADT event type logic previously used only `message.message_type`, while the sample query filters on values such as `ADT^A01`. The code now derives the trigger event from MSH-9.2 when present and writes an event type such as `ADT^A01`.
- The code wrote raw HL7 timestamp strings to BigQuery `TIMESTAMP` columns. Added a small converter for common HL7 TS formats so BigQuery receives RFC3339-compatible timestamp values or `NULL`.

## Review Notes
The local environment did not have `gcloud` or `bq` installed, so CLI details were verified against current official Google Cloud documentation rather than local `--help` output. The Python code block was syntax-checked with `python3` AST parsing.
