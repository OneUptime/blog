# Validation Summary: How to Configure Rules and Email Alerts in Azure IoT Central Based

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure IoT Central
- IoT Central rules
- Email actions
- Webhook actions
- Azure Monitor action groups
- Power Automate
- Azure Logic Apps
- Device telemetry and properties

## Sources Consulted
- Microsoft Learn: Tutorial - Create a rule and set up notifications in your Azure IoT Central application: https://learn.microsoft.com/en-us/azure/iot-central/core/tutorial-create-telemetry-rules
- Microsoft Learn: Configure rules and actions in Azure IoT Central: https://learn.microsoft.com/en-us/azure/iot-central/core/howto-configure-rules
- Microsoft Learn: Use workflows to integrate your Azure IoT Central application with other cloud services: https://learn.microsoft.com/en-us/azure/iot-central/core/howto-configure-rules-advanced
- Microsoft Learn: Azure IoT Central quotas and limits: https://learn.microsoft.com/en-us/azure/iot-central/core/concepts-quotas-limits
- Microsoft Learn: What is Azure IoT Central?: https://learn.microsoft.com/en-us/azure/iot-central/core/overview-iot-central

## Issues Found
- Corrected the email recipient requirement. Microsoft documentation states that email action recipients must be users in the IoT Central application and must have signed in at least once, so the prerequisite and email action instructions were updated.
- Replaced the unsupported generic "default 5 minute cooldown" claim with documented action-rate limits: email actions are limited to one alert every minute per rule, and webhook, Power Automate, Logic Apps, and Azure Monitor action group actions are limited to one alert every 10 seconds per action.
- Corrected the multi-condition rule explanation. IoT Central lets you choose whether all conditions or any condition must be met, so the statement that OR logic is unsupported within a single rule was removed.
- Removed the telemetry-count silence detection example and the related "no data for 15 min" diagram branch because the official rules documentation describes rules as evaluating telemetry values that are received and does not document that pattern as a reliable device-offline rule.
- Updated the rule capability description and property-based rule example to refer to telemetry and properties defined in the device template, rather than labeling battery level as telemetry.
- Replaced the webhook payload example with the current documented schema shape, including action, application, device, telemetry nested under device, and rule details.
- Corrected the Power Automate integration instructions. Current documentation describes creating a Power Automate flow with the Azure IoT Central V3 connector's "When a rule is fired" trigger, rather than selecting Power Automate directly from the IoT Central rule action section.

## Review Notes
None.
