# Validation Summary: How to Create IoT Core Thing Shadows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS IoT Core
- AWS IoT Device Shadow service
- AWS CLI `iot-data`
- AWS IoT Device SDK for Python v2
- Boto3 IoT Data Plane client
- MQTT shadow topics

## Sources Consulted
- AWS IoT Core Developer Guide: Device Shadow service: https://docs.aws.amazon.com/iot/latest/developerguide/iot-device-shadows.html
- AWS IoT Core Developer Guide: Device Shadow service documents: https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-document.html
- AWS IoT Core Developer Guide: Device Shadow MQTT topics: https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-mqtt.html
- AWS IoT Core Developer Guide: Interacting with shadows: https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-data-flow.html
- AWS CLI Command Reference: `iot-data update-thing-shadow`: https://docs.aws.amazon.com/cli/latest/reference/iot-data/update-thing-shadow.html
- AWS CLI Command Reference: `iot-data get-thing-shadow`: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iot-data/get-thing-shadow.html
- Boto3 IoTDataPlane `update_thing_shadow`: https://docs.aws.amazon.com/boto3/latest/reference/services/iot-data/client/update_thing_shadow.html
- Boto3 IoTDataPlane service reference: https://docs.aws.amazon.com/boto3/latest/reference/services/iot-data.html
- AWS IoT Device SDK for Python v2 `awsiot.iotshadow`: https://aws.github.io/aws-iot-device-sdk-python-v2/awsiot/iotshadow.html
- AWS General Reference: AWS IoT Core Device Shadow quotas: https://docs.aws.amazon.com/general/latest/gr/iot-core.html

## Issues Found
- The original text implied every outdated simultaneous update is rejected. AWS IoT only performs version matching when a request includes a `version`; requests without a version bypass version matching. Updated the explanation to state that conflict rejection applies when clients include a version in the update request.
- The device-side Python sample subscribed to delta and get-accepted topics and immediately published startup shadow requests. Updated the sample to wait for the subscription futures before publishing, reducing the risk of missing the startup get response.

## Review Notes
- The AWS CLI examples use current `iot-data` commands, `--cli-binary-format raw-in-base64-out`, `--payload`, `--shadow-name`, and output file syntax.
- The MQTT topic prefixes for classic and named shadows match AWS IoT reserved shadow topic documentation.
- The 8 KB shadow document limit is correct; AWS notes that metadata does not count toward that limit.
