# Validation Summary: How to Use IoT Core Message Broker with MQTT

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core message broker
- MQTT 3.1.1 and MQTT 5 concepts
- AWS CLI
- Python paho-mqtt
- Node.js aws-iot-device-sdk-v2
- Eclipse Mosquitto command-line clients
- TLS mutual authentication with X.509 certificates

## Sources Consulted
- AWS IoT Core MQTT documentation: https://docs.aws.amazon.com/iot/latest/developerguide/mqtt.html
- AWS IoT Core device communication protocols: https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html
- AWS IoT Core endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/iot-core.html
- AWS CLI describe-endpoint command reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iot/describe-endpoint.html
- Eclipse Paho MQTT Python client documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html
- Eclipse Paho MQTT Python migration notes: https://eclipse.dev/paho/files/paho.mqtt.python/html/migrations.html
- AWS IoT Device SDK for JavaScript v2 API documentation: https://aws.github.io/aws-iot-device-sdk-js-v2/node/classes/iot.AwsIotMqttConnectionConfigBuilder.html
- Eclipse Mosquitto mosquitto_pub man page: https://mosquitto.org/man/mosquitto_pub-1.html

## Issues Found
- The architecture diagram showed a Lambda rule subscribing directly to the broker. Updated it to show routing through an IoT rule to a Lambda action, which matches AWS IoT Rules Engine behavior.
- The connection section said every device connects with TLS mutual authentication. Updated it to "certificate-based devices" because AWS IoT Core also supports MQTT over WebSocket with SigV4 and custom authentication options.
- The Python paho-mqtt example used the older callback signatures and implicit VERSION1 callback API. Updated it to use `CallbackAPIVersion.VERSION2` and the current callback parameters.
- The wildcard explanation said `#` matches zero or more levels without AWS IoT Core's parent-topic caveat. Added the AWS IoT-specific behavior that `sensor/#` does not match `sensor`.
- The retained-message section did not mention that retained messages are delivered on subscription only for exact topic filters. Added the exact-subscription caveat and wildcard behavior.
- The retained-message quota was listed as 4,000 per account. Updated it to the current AWS quota of 500,000 by default, or 100,000 in select AWS Regions, adjustable.
- The limits table described topic depth as "7 levels deep." Updated it to AWS IoT Core's actual quota: 7 forward slashes in a topic or topic filter.
- The limits table stated connection duration as up to 24 hours. Updated it to distinguish X.509 certificate connections, which are 1-2 weeks under ideal conditions, from SigV4 connections, which are up to 24 hours.

## Review Notes
The Node.js AWS IoT Device SDK v2 example, AWS CLI endpoint command, QoS descriptions, LWT usage, retained-message deletion command, shared subscription syntax, and Mosquitto publish/subscribe examples were consistent with the consulted official documentation. Future updates should re-check AWS IoT Core quotas because several are region-specific and adjustable.
