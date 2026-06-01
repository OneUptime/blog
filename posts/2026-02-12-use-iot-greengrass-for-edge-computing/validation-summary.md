# Validation Summary: How to Use IoT Greengrass for Edge Computing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Greengrass V2
- AWS IoT Core
- Greengrass components and recipes
- Greengrass IPC local publish/subscribe
- AWS Lambda functions on Greengrass
- Machine learning inference at the edge
- Stream Manager
- Python
- AWS CLI
- Amazon S3

## Sources Consulted
- AWS IoT Greengrass V2 automatic resource provisioning: https://docs.aws.amazon.com/greengrass/v2/developerguide/quick-installation.html
- AWS IoT Greengrass nucleus requirements: https://docs.aws.amazon.com/greengrass/v2/developerguide/greengrass-nucleus-component.html
- AWS IoT Greengrass component recipe reference: https://docs.aws.amazon.com/greengrass/v2/developerguide/component-recipe-reference.html
- AWS IoT Greengrass local publish/subscribe IPC: https://docs.aws.amazon.com/greengrass/v2/developerguide/ipc-publish-subscribe.html
- AWS IoT Greengrass component publishing: https://docs.aws.amazon.com/greengrass/v2/developerguide/publish-components.html
- AWS CLI greengrassv2 create-deployment reference: https://docs.aws.amazon.com/cli/latest/reference/greengrassv2/create-deployment.html
- AWS IoT Greengrass Lambda functions: https://docs.aws.amazon.com/greengrass/v2/developerguide/run-lambda-functions.html
- AWS IoT Greengrass Lambda component import: https://docs.aws.amazon.com/greengrass/v2/developerguide/import-lambda-function-console.html
- AWS IoT Greengrass machine learning inference: https://docs.aws.amazon.com/greengrass/v2/developerguide/perform-machine-learning-inference.html
- AWS IoT Greengrass Stream Manager component: https://docs.aws.amazon.com/greengrass/v2/developerguide/stream-manager-component.html
- AWS IoT Greengrass StreamManagerClient usage: https://docs.aws.amazon.com/greengrass/v2/developerguide/work-with-streams.html

## Issues Found
- Corrected the Greengrass Core minimum RAM requirement from 128 MB to 96 MB allocated to Greengrass Core software, matching the current nucleus requirements.
- Updated the Python IPC publish example to use the documented request object and operation response pattern instead of relying on constructor shortcuts.
- Added required `accessControl` permissions to the Greengrass component recipe so the component can publish to the local pub/sub topic.
- Changed the component lifecycle command to the documented Greengrass V2 recipe format and updated the install command to use `python3 -m pip install --user awsiotsdk`.
- Made the `publishInterval` deployment configuration actually affect the component by passing it through a recipe configuration variable.
- Corrected the example deployment target ARN to use a 12-digit AWS account ID.
- Clarified that publishing to a `cloud/...` local topic is not automatically cloud-synced unless an MQTT bridge or equivalent routing component forwards it to AWS IoT Core.
- Fixed the local subscriber example to import and subclass the documented Greengrass IPC client stream handler, added the subscription response wait, and avoided a runtime error when JSON payloads are already decoded.
- Added a placeholder `activate_fan()` function so the subscriber example does not raise `NameError` when the threshold branch runs.
- Changed the ML inference example to receive the model path through `MODEL_PATH` instead of using an invalid hard-coded Greengrass artifacts path.
- Updated the ML publish example to use the documented IPC request and response pattern.
- Added concise notes that subscriber, ML, and Stream Manager examples require the corresponding IPC permissions, model path, component dependency, and SDK setup.
- Changed component IPC wording from local MQTT to local pub/sub where the examples use Greengrass IPC rather than MQTT client-device connectivity.
- Replaced the unsupported guarantee of "sub-millisecond" response times with "millisecond-scale" response times.

## Review Notes
The examples are still intentionally minimal. A production Greengrass deployment should tighten IPC access-control resources, add exception handling around IPC and Stream Manager calls, pin component versions deliberately, and ensure the token exchange role grants only the S3 and cloud service permissions required by the deployed components.
