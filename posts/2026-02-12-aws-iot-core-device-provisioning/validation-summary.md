# Validation Summary: How to Set Up AWS IoT Core Device Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core
- AWS IoT device provisioning
- AWS IoT policies
- X.509 certificates and CA registration
- AWS CLI
- OpenSSL
- IAM roles for AWS IoT provisioning

## Sources Consulted
- AWS IoT Core Developer Guide: Device provisioning - https://docs.aws.amazon.com/iot/latest/developerguide/iot-provision.html
- AWS IoT Core Developer Guide: Provisioning devices that have device certificates - https://docs.aws.amazon.com/iot/latest/developerguide/provision-w-cert.html
- AWS IoT Core Developer Guide: Just-in-time provisioning - https://docs.aws.amazon.com/iot/latest/developerguide/jit-provisioning.html
- AWS IoT Core Developer Guide: Provisioning templates - https://docs.aws.amazon.com/iot/latest/developerguide/provision-template.html
- AWS IoT Core Developer Guide: Provisioning devices that don't have device certificates using fleet provisioning - https://docs.aws.amazon.com/iot/latest/developerguide/provision-wo-cert.html
- AWS IoT Core Developer Guide: Reserved topics / Fleet provisioning topics - https://docs.aws.amazon.com/iot/latest/developerguide/reserved-topics.html
- AWS CLI Command Reference: create-provisioning-template - https://docs.aws.amazon.com/cli/latest/reference/iot/create-provisioning-template.html
- AWS IoT Core Developer Guide: Attach a principal to a thing - https://docs.aws.amazon.com/iot/latest/developerguide/attach-thing-principal.html

## Issues Found
- The single-thing example used `--thing-type-name "TemperatureSensor"` without creating or noting the required thing type. Added an `aws iot create-thing-type` command so the example does not fail when the thing type is absent.
- Several sample ARNs used a 9-digit account placeholder. Updated them to the standard 12-digit AWS account ID placeholder used in AWS documentation.
- The JITP provisioning template was shown as a `registration-config` JSON file with `templateBody` as an object. AWS expects a JITP template body for `create-provisioning-template --type JITP`, or a registration config where `templateBody` is an escaped string plus role information. Reworked the example to create a named JITP provisioning template and register the CA with `--registration-config templateName=JitpSensorTemplate`.
- The JITP section omitted the provisioning role requirement for template creation. Added the AWS IoT trust policy example and the managed `AWSIoTThingsRegistration` policy attachment.
- The JITP claim that any CA-signed device would be provisioned omitted AWS IoT Core's SNI requirement. Updated the sentence to include the Server Name Indication requirement.
- The fleet provisioning template referenced `FleetSensorPolicy` without creating it. Added an `aws iot create-policy` command before creating the provisioning template.
- The fleet provisioning template used a thing group that must exist before a provisioned thing can be added to it. Added an `aws iot create-thing-group` command for `fleet-sensors`.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI validation was performed against current official AWS CLI and AWS IoT Core documentation rather than local `aws ... help` output. The examples still use placeholder account IDs, regions, ARNs, role names, thing groups, and policies that users must adapt to their own AWS account.
