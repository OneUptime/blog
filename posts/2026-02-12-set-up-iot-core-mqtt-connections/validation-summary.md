# Validation Summary: How to Set Up IoT Core MQTT Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core
- MQTT and MQTT over WebSocket Secure
- TLS and ALPN
- X.509 certificate authentication
- IAM Signature Version 4 authentication
- AWS IoT Device SDK v2 for Python
- AWS IoT Device SDK v2 for JavaScript
- AWS CLI and CloudWatch Logs

## Sources Consulted
- AWS IoT Core MQTT documentation: https://docs.aws.amazon.com/iot/latest/developerguide/mqtt.html
- AWS IoT Core device communication protocols: https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html
- AWS IoT Core message broker and protocol quotas: https://docs.aws.amazon.com/general/latest/gr/iot-core.html
- AWS IoT logging configuration: https://docs.aws.amazon.com/iot/latest/developerguide/configure-logging.html
- AWS CLI filter-log-events command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/filter-log-events.html
- AWS IoT Device SDK v2 for Python mqtt_connection_builder API: https://aws.github.io/aws-iot-device-sdk-python-v2/awsiot/mqtt_connection_builder.html
- AWS CRT Python MQTT API: https://awslabs.github.io/aws-crt-python/api/mqtt.html
- AWS IoT Device SDK v2 for JavaScript browser API: https://aws.github.io/aws-iot-device-sdk-js-v2/browser/classes/iot.AwsIotMqttConnectionConfigBuilder.html

## Issues Found
- The first Python mTLS snippet passed `on_connection_interrupted` and `on_connection_resumed` before defining those functions. Moved the callbacks before the builder call and replaced the undefined `resubscribe()` helper with the SDK's `connection.resubscribe_existing_topics()`.
- The Python WebSocket snippet referenced `client_bootstrap` without creating it. Added the event loop, host resolver, and client bootstrap setup used by the AWS IoT Device SDK examples.
- The JavaScript browser snippet fetched credentials but did not use them and left `credentials_provider` as a placeholder. Updated it to use `new_with_websockets()` with `.with_credentials(...)`, matching the browser SDK API for static temporary credentials.
- The persistent session section said the queue holds up to 10 QoS 1 messages per subscription. AWS IoT Core now documents a 1-hour default persistent session expiry, delivery of stored messages at up to 10 messages per second, and account-level queuing quotas instead. Updated the text accordingly.
- The connection-rate quota was listed as 500 connections per second per account. AWS currently documents 3,000 MQTT CONNECT requests per second per account in most regions, with lower defaults in some regions. Updated the limit.
- Several snippets used `json`, `time`, or `mqtt.Will` without local imports. Added the missing imports to keep the examples technically complete.

## Review Notes
The article uses MQTT 3 terminology such as `clean_session`, which is appropriate for the shown AWS IoT Device SDK v2 MQTT connection builder. AWS IoT Core also supports MQTT 5, where Clean Start and Session Expiry provide more flexible persistent-session behavior; that could be covered in a future update but is not required for correctness here.
