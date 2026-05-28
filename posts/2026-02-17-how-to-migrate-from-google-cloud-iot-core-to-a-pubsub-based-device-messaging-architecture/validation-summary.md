# Validation Summary: How to Migrate from Google Cloud IoT Core to a Pub/Sub-Based Device Messaging

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud IoT Core
- Google Cloud Pub/Sub
- Google Cloud Firestore
- Google Cloud Functions
- Google Kubernetes Engine
- Compute Engine
- BigQuery
- EMQX
- MQTT
- Python
- PyJWT

## Sources Consulted
- Google Cloud IoT Python client reference: https://cloud.google.com/python/docs/reference/cloudiot/latest/google.cloud.iot_v1.types.DeviceCredential
- Google Cloud IoT .NET client retirement notice: https://cloud.google.com/dotnet/docs/reference/Google.Cloud.Iot.V1/latest
- Google Cloud SDK reference for `gcloud container clusters create`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud SDK reference for `gcloud compute instances create`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud Pub/Sub documentation: https://cloud.google.com/pubsub/docs
- EMQX HTTP authentication documentation: https://docs.emqx.com/en/emqx/latest/access-control/authn/http.html
- EMQX authentication overview: https://docs.emqx.com/en/emqx/latest/access-control/authn/authn.html
- EMQX rule SQL reference: https://docs.emqx.com/en/emqx/latest/data-integration/rule-sql-syntax.html
- EMQX GCP Pub/Sub integration documentation: https://docs.emqx.com/en/emqx/latest/data-integration/data-bridge-gcp-pubsub.html
- PyJWT API documentation: https://pyjwt.readthedocs.io/en/latest/api.html
- Protocol Buffers Timestamp documentation: https://protobuf.dev/reference/protobuf/google.protobuf/

## Issues Found
- The post implied IoT Core might still be running and that users could still export directly before shutdown. Updated the wording to reflect that IoT Core was retired on August 16, 2023 and that this path depends on an existing export or legacy access.
- The export example called `.isoformat()` directly on IoT Core protobuf `Timestamp` fields. Added a helper that uses `ToDatetime().isoformat()`.
- Removed an unused `json` import from the export script.
- The EMQX install section claimed it configured Pub/Sub integration before showing only installation commands. Adjusted the wording and added the missing note that the rule must have a GCP Pub/Sub action attached.
- The TLS note suggested reusing the IoT Core root CA. Reworded it to use a server certificate chain trusted by the devices.
- The Cloud Function auth example did not handle missing JSON bodies and did not return the `application/json` content type required by EMQX HTTP authentication. Added safe JSON parsing and a shared JSON response helper.
- The JWT example disabled audience verification while the firmware section said the audience changes. Added a broker audience constant, enabled audience verification, and added a five-minute leeway for clock skew.
- The EMQX auth configuration block was labeled `yaml` even though EMQX uses HOCON-style configuration. Changed the fence to `hocon` and corrected the `Content-Type` header key.
- The migration tracker divided by zero if the registry collection was empty. Added a zero-safe progress calculation.

## Review Notes
The GCP CLI examples use documented flags, but `gcloud` was not installed in the local environment, so they were verified against Google Cloud SDK reference documentation rather than local `--help` output. The MQTT client snippet remains illustrative because client ID and TLS setup vary by device library.
