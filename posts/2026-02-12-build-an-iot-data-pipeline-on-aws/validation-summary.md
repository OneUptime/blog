# Validation Summary: How to Build an IoT Data Pipeline on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core
- AWS IoT Rules Engine
- MQTT
- Eclipse Paho MQTT Python client
- AWS CLI
- Amazon Kinesis Data Streams
- AWS Lambda
- AWS SDK for JavaScript v3
- Amazon Timestream
- Amazon DynamoDB
- Amazon SNS
- AWS IoT Data Plane
- Amazon S3
- Grafana
- API Gateway

## Sources Consulted
- AWS CLI v2 `create-topic-rule` command reference: https://docs.aws.amazon.com/cli/latest/reference/iot/create-topic-rule.html
- AWS CLI v2 `describe-endpoint` command reference: https://docs.aws.amazon.com/cli/latest/reference/iot/describe-endpoint.html
- AWS IoT Core thing policy variables: https://docs.aws.amazon.com/iot/latest/developerguide/thing-policy-variables.html
- AWS IoT Core substitution templates: https://docs.aws.amazon.com/iot/latest/developerguide/iot-substitution-templates.html
- AWS IoT Core SQL reference: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-reference.html
- AWS SDK for JavaScript v3 Timestream Write `Record` reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-timestream-write/Interface/_Record
- AWS SDK for JavaScript v3 IoT Data Plane `PublishCommand` reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/iot-data-plane/command/PublishCommand/
- Amazon DynamoDB JavaScript developer guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html
- AWS SDK for JavaScript v3 `@aws-sdk/lib-dynamodb` reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- Amazon Timestream writes documentation: https://docs.aws.amazon.com/timestream/latest/developerguide/writes.html
- Amazon Timestream date/time functions documentation: https://docs.aws.amazon.com/timestream/latest/developerguide/date-time-functions.html
- Eclipse Paho MQTT Python client documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html
- Eclipse Paho MQTT Python examples and callback API notes: https://eclipse.dev/paho/files/paho.mqtt.python/html/index.html

## Issues Found
- The Paho MQTT firmware snippet used the older callback API shape and constructed `Client` without specifying the current callback API version. Updated it to use `CallbackAPIVersion.VERSION2` and the corresponding `on_connect(client, userdata, flags, reason_code, properties)` signature.
- The stream processor imported `DynamoDBDocumentClient` and used `docClient`, but never imported `DynamoDBClient` or initialized `docClient`. Added the required AWS SDK v3 DynamoDB client import and `DynamoDBDocumentClient.from(new DynamoDBClient({}))`.
- The stream processor's DynamoDB update did not write the `status` or `GSI1PK` attributes that the later `StatusIndex` query depends on. Added `status: 'active'` to device state and updated the DynamoDB `UpdateExpression` and values to maintain the status index key.
- The Device Management API snippet used `docClient`, `GetCommand`, and `QueryCommand` without importing or initializing them. Added the required AWS SDK v3 DynamoDB imports and document client initialization.

## Review Notes
- AWS CLI was not installed in the local environment, so CLI validation was performed against the official AWS CLI v2 command reference.
- JavaScript snippets were syntax-checked with `node --check` using Node.js v22.22.0.
- The Python firmware snippet was syntax-checked with `python3 -m py_compile` using Python 3.12.3. The Paho package was not installed locally, so API validation was checked against the official Eclipse Paho documentation.
