# Validation Summary: How to Set Up IoT Greengrass v2 on Edge Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Greengrass v2
- AWS IoT Core
- AWS CLI
- Greengrass component recipes
- Greengrass IPC for IoT Core MQTT and local pub/sub
- Python with AWS IoT Device SDK v2
- Docker components on Greengrass
- Amazon S3 component artifacts
- AWS IAM token exchange roles

## Sources Consulted
- AWS IoT Greengrass automatic provisioning installation guide: https://docs.aws.amazon.com/greengrass/v2/developerguide/quick-installation.html
- AWS IoT Greengrass manual provisioning installation guide: https://docs.aws.amazon.com/greengrass/v2/developerguide/manual-installation.html
- AWS IoT Greengrass nucleus requirements: https://docs.aws.amazon.com/greengrass/v2/developerguide/greengrass-nucleus-component.html
- AWS IoT Greengrass component recipe reference: https://docs.aws.amazon.com/greengrass/v2/developerguide/component-recipe-reference.html
- AWS IoT Greengrass IoT Core MQTT IPC documentation: https://docs.aws.amazon.com/greengrass/v2/developerguide/ipc-iot-core-mqtt.html
- AWS IoT Greengrass local pub/sub IPC documentation: https://docs.aws.amazon.com/greengrass/v2/developerguide/ipc-publish-subscribe.html
- AWS IoT Greengrass Docker application manager documentation: https://docs.aws.amazon.com/greengrass/v2/developerguide/docker-application-manager-component.html
- AWS IoT Greengrass open source documentation: https://docs.aws.amazon.com/greengrass/v2/developerguide/open-source.html

## Issues Found
- The setup flow mixed manual IoT thing/certificate provisioning with the automatic `--provision true` installer path. Replaced the manual certificate and IoT policy commands with AWS credential preparation and verification, because the automatic installer provisions the IoT thing, thing group, certificate, IAM token exchange role, role alias, and IoT policy.
- The installer command used `sudo java`, which can drop AWS credential environment variables. Changed it to `sudo -E java`, matching AWS's automatic provisioning example.
- The installer referenced the manually created `GreengrassV2Policy`, which lacked token exchange permissions. Changed it to `GreengrassV2IoTThingPolicy`, allowing the installer to create/use the expected Greengrass IoT policy.
- The RAM requirement and footprint claim said 256MB RAM. Updated both to AWS's documented Linux nucleus requirement of 96MB RAM allocated to the Greengrass Core software, plus additional resources for deployed components.
- The Greengrass diagram showed a default local MQTT broker. Changed it to local pub/sub IPC to avoid implying Greengrass v2 includes a local MQTT broker by default.
- The open source bullet said only the core SDK is open source. Updated it to state that the Greengrass nucleus and other Greengrass Core software components are open source.
- The custom component recipe did not grant IPC authorization for publishing to AWS IoT Core. Added `accessControl` for `aws.greengrass.ipc.mqttproxy` and `aws.greengrass#PublishToIoTCore`.
- The Python IoT Core publish example used constructor arguments and chained `activate(...).result(...)`, which does not match the documented IPC client v1 pattern. Updated it to create `PublishToIoTCoreRequest`, set fields, activate the operation, and wait on `operation.get_response()`.
- The local pub/sub subscriber snippet referenced an undefined `StreamHandler`, omitted the IPC client connection, and used an invalid request constructor. Replaced it with a documented-style stream handler, request setup, activation, response wait, and keepalive loop.
- The local pub/sub section did not mention the required IPC authorization policy. Added a minimal `aws.greengrass.ipc.pubsub` recipe configuration for `aws.greengrass#SubscribeToTopic`.

## Review Notes
- The AWS CLI examples still use placeholder account IDs, bucket names, component versions, and deployment IDs; readers must replace them with values from their own AWS account.
- The Docker component example assumes Docker is installed and that the Greengrass component user has permission to run Docker commands. AWS documents these as prerequisites for Docker components.
