# Validation Summary: How to Connect IoT Devices to Google Cloud Pub/Sub Using MQTT Bridge with

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud IAM service accounts
- Google Compute Engine
- EMQX
- MQTT 3.1.1 / MQTT 5.0
- TLS / mutual TLS certificates
- Python
- Eclipse Paho MQTT Python client

## Sources Consulted
- Google Cloud Pub/Sub gcloud quickstart: https://docs.cloud.google.com/pubsub/docs/publish-receive-messages-gcloud
- Google Cloud Pub/Sub pull subscriptions: https://cloud.google.com/pubsub/docs/create-subscription
- Google Cloud SDK service account key command reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud IAM service account key documentation: https://docs.cloud.google.com/iam/docs/keys-create-delete
- EMQX Ubuntu installation documentation: https://docs.emqx.com/en/emqx/latest/deploy/install-ubuntu.html
- EMQX GCP Pub/Sub data integration documentation: https://docs.emqx.com/en/emqx/latest/data-integration/data-bridge-gcp-pubsub.html
- EMQX Dashboard documentation: https://docs.emqx.com/en/emqx/latest/dashboard/introduction.html
- EMQX TLS listener documentation: https://docs.emqx.com/en/emqx/latest/network/emqx-mqtt-tls.html
- EMQX listener configuration documentation: https://docs.emqx.com/en/emqx/latest/configuration/listener.html
- Eclipse Paho MQTT Python client documentation: https://pypi.org/project/paho-mqtt/2.0.0/

## Issues Found
- The post said connecting IoT devices to GCP requires a third-party MQTT broker. That was too absolute because the requirement is specific to MQTT-based device ingestion patterns after IoT Core retirement. The wording now says MQTT-based devices often use a third-party broker.
- The post described EMQX as open source while using the native GCP Pub/Sub data integration documented for EMQX Enterprise. The wording now identifies the guide as using EMQX Enterprise.
- The EMQX Ubuntu install command used an outdated `assets.emqx.com` install script. It now uses the current EMQX package repository command from the official Ubuntu installation documentation.
- The EMQX Pub/Sub setup used older "Resources" and "bridge" terminology. Current EMQX documentation uses Integration -> Connectors with Google PubSub Producer connectors and sink actions, so the dashboard steps and rule mapping text were updated.
- The post created a `device-commands` Pub/Sub topic and subscribed devices to MQTT command topics but did not describe the required Pub/Sub-to-MQTT path. It now notes that cloud-to-device command flow needs a Google PubSub Consumer source plus a Republish action.
- The EMQX TLS listener configuration was shown as YAML. EMQX configuration files use HOCON syntax for this listener block, so the snippet was changed to a HOCON example using `listeners.ssl.default`.
- The Python example used the legacy Paho MQTT callback signature and `mqtt.Client(client_id=...)` construction. It now uses `mqtt.CallbackAPIVersion.VERSION2` and the current `on_connect(client, userdata, flags, reason_code, properties)` signature.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so command verification used official Google Cloud SDK and Pub/Sub documentation rather than local `--help` output. The article is still a high-level guide and does not include complete production hardening details such as dashboard firewall rules, managed instance service accounts, keyless authentication, or exact Pub/Sub-to-MQTT command payload templates.
