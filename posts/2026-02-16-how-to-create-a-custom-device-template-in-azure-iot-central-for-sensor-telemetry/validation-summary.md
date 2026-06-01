# Validation Summary: How to Create a Custom Device Template in Azure IoT Central for Sensor Telemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure IoT Central
- Device templates
- Digital Twins Definition Language (DTDL) v2
- IoT Plug and Play conventions
- Azure IoT Device Provisioning Service (DPS)
- Azure IoT SDK for Node.js
- JavaScript

## Sources Consulted
- Microsoft Learn: What are device templates in Azure IoT Central - https://learn.microsoft.com/en-us/azure/iot-central/core/concepts-device-templates
- Microsoft Learn: Create a device template in Azure IoT Central - https://learn.microsoft.com/en-us/azure/iot-central/core/howto-set-up-template
- Microsoft Learn: Use properties in an Azure IoT Central solution - https://learn.microsoft.com/en-us/azure/iot-central/core/howto-use-properties
- Microsoft Learn: Use location data in an Azure IoT Central solution - https://learn.microsoft.com/en-us/azure/iot-central/core/howto-use-location-data
- Microsoft Learn: Tutorial - Connect a client app to Azure IoT Central - https://learn.microsoft.com/en-us/azure/iot-central/core/tutorial-connect-device-nodejs/
- Microsoft Learn: Device implementation and best practices for IoT Central - https://learn.microsoft.com/en-us/azure/iot-central/core/concepts-device-implementation
- Microsoft Learn: Plug and Play device message payloads - https://learn.microsoft.com/en-us/previous-versions/azure/iot/concepts-message-payloads
- Microsoft Learn: Azure IoT Device SDK for Node.js Twin class - https://learn.microsoft.com/en-us/javascript/api/azure-iot-device/twin
- Azure opendigitaltwins-dtdl GitHub repository: DTDL v2 specification - https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/DTDL.v2.md

## Issues Found
- The DTDL model description said it defined four telemetry channels and one command, but the snippet defined five telemetry channels and two commands. Updated the text to match the model.
- The pressure telemetry used `hectopascal`, which is not a valid DTDL v2 `Pressure` unit. Changed it to `millibar`, a valid DTDL v2 pressure unit with the same numeric value for barometric readings commonly expressed in hPa.
- The `location` property was modeled as a generic object, but IoT Central map tiles expect location data modeled with the `Location` semantic type and `geopoint` schema. Updated the model to use `["@type": ["Property", "Location"]]`, `schema: "geopoint"`, and added the IoT Central DTDL extension context.
- The DPS provisioning code did not send the model ID, which IoT Central uses to assign the device to the correct template during provisioning. Added a `modelId` constant and `setProvisioningPayload({ modelId })`.
- The writable property acknowledgments used nonstandard `status` and `desiredVersion` fields. Updated the sample to use IoT Plug and Play acknowledgment fields: `value`, `ac`, `ad`, and `av`.
- The `reportingInterval` writable property changed a variable but did not reschedule the telemetry timer. Added timer rescheduling when the interval is updated.
- The command handlers returned payload shapes that did not match DTDL command serialization rules. Updated the `reboot` command to receive and return primitive values and the `runDiagnostics` command to return the object fields directly.
- The publishing section incorrectly stated that published templates are immutable and cannot be changed. Updated it to reflect IoT Central behavior: templates can be modified and republished, while breaking model changes should use a new version.

## Review Notes
The post is technically relevant and remains a useful Azure IoT Central tutorial. The Node.js sample was checked for JavaScript syntax, and the DTDL snippet was checked for JSON syntax after edits. Azure IoT Central is still documented by Microsoft, but teams building new long-lived IoT solutions should also track Microsoft's broader Azure IoT platform guidance and lifecycle announcements.
