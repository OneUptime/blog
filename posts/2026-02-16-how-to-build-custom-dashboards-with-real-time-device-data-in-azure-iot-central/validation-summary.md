# Validation Summary: How to Build Custom Dashboards with Real-Time Device Data in Azure IoT Central

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure IoT Central
- Azure IoT Central dashboards
- Azure IoT Central device templates and views
- Azure IoT Central device groups
- Azure IoT Central roles and permissions
- Azure IoT Central data export
- Azure Event Hubs
- Azure Service Bus
- Azure Data Explorer
- Azure Blob Storage

## Sources Consulted
- Microsoft Learn: Create and manage Azure IoT Central dashboards - https://learn.microsoft.com/en-us/azure/iot-central/core/howto-manage-dashboards
- Microsoft Learn: What are device templates? - https://learn.microsoft.com/en-us/azure/iot-central/core/concepts-device-templates
- Microsoft Learn: Create a device template in Azure IoT Central - https://learn.microsoft.com/en-us/azure/iot-central/core/howto-set-up-template
- Microsoft Learn: Manage users and roles in your IoT Central application - https://learn.microsoft.com/en-us/azure/iot-central/core/howto-manage-users-roles
- Microsoft Learn: Export data to Event Hubs - https://learn.microsoft.com/en-us/azure/iot-central/core/howto-export-to-event-hubs
- Microsoft Learn: Azure CLI az iot central export destination - https://learn.microsoft.com/en-us/cli/azure/iot/central/export/destination
- Microsoft Learn: Tutorial: Use device groups to analyze device telemetry - https://learn.microsoft.com/en-us/azure/iot-central/core/tutorial-use-device-groups
- Microsoft Learn: How to use the IoT Central REST API to manage devices - https://learn.microsoft.com/en-us/azure/iot-central/core/howto-manage-devices-with-rest-api

## Issues Found
- The post described two dashboard types as application dashboards and device template views. Updated this to reflect current IoT Central terminology: organization dashboards, personal dashboards, and device template views.
- The post said application dashboards are visible to all users by default. Updated this to explain organization dashboard visibility by organization access and personal dashboard visibility by creator.
- The post described creating a dashboard with a New dashboard button. Updated the workflow to use Go to dashboard catalog and +New, matching current documentation.
- The fleet overview section used a KPI tile with arbitrary telemetry Count aggregation to count connected devices. Updated it to use the Number of devices (Count) tile and changed the wording from connected devices to devices in the selected group.
- The telemetry chart section described grouping by device name. Updated it to select devices shown on the tile, which matches the documented line-chart tile configuration.
- The map tile section included telemetry-based marker color coding that was not supported by the consulted dashboard documentation. Removed that configuration item.
- The property grid section described a sortable/filterable property grid. Updated it to the documented Property tile and noted that query-driven tables should use a pinned Data explorer query.
- The device view section recommended dual-axis charts without documentation support. Reworded it to recommend separate chart tiles when metric scales differ.
- The real-time versus historical section overstated tile modes. Updated it to distinguish latest-value/property tiles from time-windowed aggregate chart and KPI tiles.
- The access-control section used outdated role names and permissions. Updated it to App Administrator, App Builder, and App Operator with current role descriptions.
- The data export section listed Azure Service Bus generically. Updated it to Azure Service Bus queues and topics.
- The Mermaid diagram used subgraph labels with spaces and hyphens directly in the subgraph declaration. Updated the diagram to use explicit subgraph IDs with bracketed titles for valid Mermaid syntax.

## Review Notes
The post contains no terminal commands or configuration snippets. The review focused on Azure IoT Central UI behavior, tile capabilities, device template concepts, roles, device groups, data export destinations, and the Mermaid diagram syntax.
