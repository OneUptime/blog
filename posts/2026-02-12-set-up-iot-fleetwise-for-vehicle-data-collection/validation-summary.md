# Validation Summary: How to Set Up IoT FleetWise for Vehicle Data Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT FleetWise
- AWS IoT Core
- AWS CLI
- CAN bus and OBD-II vehicle data collection
- Amazon S3
- Amazon Timestream
- MQTT
- FleetWise Edge Agent

## Sources Consulted
- AWS IoT FleetWise Developer Guide: Create an AWS IoT FleetWise campaign - https://docs.aws.amazon.com/iot-fleetwise/latest/developerguide/create-campaign.html
- AWS IoT FleetWise Developer Guide: Logical expressions for AWS IoT FleetWise campaigns - https://docs.aws.amazon.com/iot-fleetwise/latest/developerguide/logical-expression.html
- AWS IoT FleetWise Developer Guide: Collect AWS IoT FleetWise data with campaigns - https://docs.aws.amazon.com/iot-fleetwise/latest/developerguide/campaigns.html
- AWS CLI Command Reference: create-signal-catalog - https://docs.aws.amazon.com/cli/latest/reference/iotfleetwise/create-signal-catalog.html
- AWS CLI Command Reference: create-model-manifest - https://docs.aws.amazon.com/cli/latest/reference/iotfleetwise/create-model-manifest.html
- AWS CLI Command Reference: update-model-manifest - https://docs.aws.amazon.com/cli/latest/reference/iotfleetwise/update-model-manifest.html
- AWS CLI Command Reference: create-decoder-manifest - https://docs.aws.amazon.com/cli/latest/reference/iotfleetwise/create-decoder-manifest.html
- AWS CLI Command Reference: create-vehicle - https://docs.aws.amazon.com/cli/latest/reference/iotfleetwise/create-vehicle.html
- AWS CLI Command Reference: update-campaign - https://docs.aws.amazon.com/cli/latest/reference/iotfleetwise/update-campaign.html
- AWS IoT FleetWise API Reference: CreateCampaign - https://docs.aws.amazon.com/iot-fleetwise/latest/APIReference/API_CreateCampaign.html
- AWS IoT FleetWise Edge Agent reference implementation - https://github.com/aws/aws-iot-fleetwise-edge

## Issues Found
- The post described the signal catalog as mapping raw CAN bus signals to named attributes. The signal catalog defines the logical vehicle signal model; the decoder manifest maps raw vehicle network data to those logical signals. Updated the explanation to separate those responsibilities.
- The decoder manifest example omitted the required `interfaceId` field on each signal decoder. Added `interfaceId: "can0"` to both CAN signal decoders so they reference the declared network interface.
- The condition-based campaign example used `"$Vehicle.Engine.CoolantTemperature > 105"`, which does not match FleetWise campaign expression syntax in AWS documentation. Updated it to `"$variable.\`Vehicle.Engine.CoolantTemperature\` > 105"`.
- The post did not mention AWS IoT FleetWise's current availability status. AWS documentation states that FleetWise is no longer open to new customers and remains available to existing customers, so a short caveat was added near the introduction.

## Review Notes
The examples still use placeholder ARNs, bucket names, and sample CAN message IDs, which is appropriate for a tutorial but would need to be replaced with real account-specific resources and a validated vehicle network definition before use. The AWS CLI was not installed in the local workspace, so command validation was performed against official AWS CLI command reference and AWS IoT FleetWise API/developer documentation.
