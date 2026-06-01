# How to Build Custom Dashboards with Real-Time Device Data in Azure IoT Central

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure IoT Central, Custom Dashboard, Real-Time Data, IoT Visualization, Device Monitoring, Data Analytics, Dashboard Design

Description: A practical guide to building custom dashboards in Azure IoT Central that display real-time device telemetry, properties, and fleet-level analytics.

---

Dashboards are the primary way operators interact with an IoT system day to day. A well-designed dashboard surfaces the information that matters, hides the noise, and enables quick decisions. Azure IoT Central provides a flexible dashboard builder that lets you create organization dashboards for fleet oversight, personal dashboards for individual users, and device-level views for drilling into individual devices. No coding is needed, but thoughtful design makes the difference between a dashboard people actually use and one they ignore.

This guide covers building both types of dashboards, selecting the right visualization tiles, and organizing everything for operational efficiency.

## Dashboard Types in IoT Central

IoT Central supports two kinds of application dashboards, plus device template views:

1. **Organization dashboards** - Shared dashboards visible to users who have access to the associated organization. These show fleet-level data, cross-device comparisons, and aggregate metrics.
2. **Personal dashboards** - Dashboards visible only to the user who creates them.
3. **Device template views** - Per-device views defined in the device template. These show up when an operator clicks on a specific device.

They use tile-based builders, but they serve different purposes. Organization and personal dashboards answer "how is my fleet doing?" while device views answer "what is this specific device doing?"

## Creating an Application Dashboard

Navigate to your IoT Central application and click Dashboard in the left navigation. If this is your first custom dashboard, you will see the default dashboard. Click Edit to modify it, or create a new one from the dashboard catalog by selecting Go to dashboard catalog and then +New.

### Adding a Fleet Overview Tile

Start with a Number of devices (Count) tile that shows the total count of devices in a device group. Click Add tile, select the count tile, and configure:

- **Title:** "Fleet Devices"
- **Device group:** All devices

This gives you an at-a-glance count of how many devices are in the selected device group.

### Adding a Telemetry Chart

For monitoring trends across your fleet, add a line chart tile.

- **Title:** "Temperature Across Fleet"
- **Device group:** Select your device group
- **Telemetry:** Temperature
- **Aggregation:** Average
- **Time range:** Last 24 hours
- **Devices:** Select the devices to show on the tile

This shows temperature trends for selected devices on a single chart, making it easy to spot outliers.

### Adding a Map Tile

If your devices report location data, a map tile provides spatial context.

- **Title:** "Device Locations"
- **Device group:** All devices
- **Location property:** Select the location property from your device template

### Adding a Property Tile

A property tile shows the current values for properties and cloud properties for one or more devices. This is useful for fleet management tasks.

- **Title:** "Device Status"
- **Device group:** All devices
- **Values:** Device name, firmware version, battery level, deployment location

Operators can use this tile to identify patterns like a batch of devices running outdated firmware. For sortable, query-driven tables, build a query in Data explorer and pin it to a dashboard.

## Designing Effective Dashboard Layouts

IoT Central's dashboard builder uses a grid layout where you can resize and position tiles freely. Here are layout principles that work well for operational dashboards:

**Put the most important information at the top left.** This is where people look first. Place your critical KPIs and status indicators here.

**Use the golden layout pattern.** Wide summary tiles across the top, detailed charts in the middle, and tables at the bottom.

```mermaid
graph TD
    subgraph topRow[Top Row - KPIs]
        A[Connected Devices]
        B[Average Temperature]
        C[Alert Count]
        D[Battery Low Count]
    end
    subgraph middleRow[Middle Row - Charts]
        E[Temperature Trend Chart]
        F[Device Map]
    end
    subgraph bottomRow[Bottom Row - Details]
        G[Device Status Table]
    end
```

**Limit tiles per dashboard to 8-12.** More than that creates visual overload. Create multiple dashboards for different audiences or purposes instead of cramming everything onto one page.

## Building Device Template Views

Device template views appear when an operator clicks into a specific device. These are defined in the device template and apply to all devices using that template.

Go to Device Templates, select your template, and click Views. You have several view types:

### Visualizing the Device

This is the default device dashboard. Add tiles that show the device's telemetry over time.

A good device view includes:

**Temperature and humidity line chart** - Shows the primary sensor data over the last 24 hours. If the scales differ significantly, consider separate chart tiles so each metric remains easy to read.

**Air quality KPI** - A KPI or last-known-value tile showing the current AQI reading with color-coded thresholds. Set ranges like 0-50 (green), 51-100 (yellow), 101-200 (orange), 201+ (red).

**Battery level indicator** - A simple last-known-value tile with a warning threshold at 20%.

**Event timeline** - If your device sends event telemetry (errors, warnings, state changes), a table showing recent events with timestamps.

### Editing Device and Cloud Data

Create a form view that lets operators modify writable properties. This is the operator's interface for configuring individual devices.

Add form fields for:

- Reporting interval (with min/max validation)
- Temperature calibration offset
- Device display name (cloud property)
- Deployment notes (cloud property)

Cloud properties are stored in IoT Central only and are not sent to the device. They are useful for metadata like deployment location, asset tags, or notes.

### About View

This view shows static device information - properties that rarely change.

Include:

- Device ID
- Firmware version
- Manufacturer
- Model number
- Serial number
- Provisioning date

## Adding Conditional Formatting

Some tiles support conditional formatting, which changes the appearance based on data values. This is particularly useful for KPI and last-known-value tiles.

For a temperature KPI tile, set up conditional formatting:

| Condition | Color | Meaning |
|---|---|---|
| Value < 20 | Blue | Below normal range |
| 20 <= Value <= 30 | Green | Normal operating range |
| 30 < Value <= 35 | Orange | Warning range |
| Value > 35 | Red | Critical - action needed |

Conditional formatting turns your dashboard into an at-a-glance status board where operators can spot problems by color alone.

## Using Device Groups for Dashboard Filtering

Device groups let you segment your fleet by device template and matching properties. Create groups like:

- "Building A Sensors" - filtered by a cloud property for building assignment
- "Low Battery Devices" - filtered by a battery-level property or cloud property < 20%
- "Firmware v1.x" - filtered by firmware version property
- "High Priority" - filtered by a priority cloud property

Each dashboard tile can be scoped to a specific device group. This lets you create focused dashboards for different buildings, regions, or device types without duplicating the entire dashboard.

## Real-Time vs. Historical Data

IoT Central dashboard tiles can show latest values or time-windowed data:

**Latest values** - Last-known-value and property tiles show the most recent telemetry or property values. Use this for operational dashboards where operators need to see current conditions. The freshness depends on how frequently devices send telemetry or report property changes.

**Historical** - Chart and KPI tiles show aggregate values over a configurable time window. Use this for trend analysis and capacity planning dashboards.

A good operational dashboard typically mixes both: latest-value tiles at the top showing current state, and historical charts below showing trends.

## Sharing and Access Control

Organization dashboards are visible to users with access to the associated organization, and personal dashboards are visible only to their creator. IoT Central supports role-based access with three built-in application roles:

- **App Administrator** - Full access to every part of the application, including billing
- **App Builder** - Can manage most of the app, but cannot make changes on the Application or Data Export tabs
- **App Operator** - Can monitor device health and status, add and delete devices, manage device sets, and run analytics and jobs, but cannot modify templates or administer the application

For external stakeholders who need visibility but should not modify anything, create custom roles with read-only dashboard access.

## Exporting Dashboard Data

Sometimes a dashboard is not enough and operators need the underlying data. IoT Central supports continuous data export to destinations like:

- Azure Event Hubs
- Azure Service Bus queues and topics
- Webhook endpoints
- Azure Data Explorer
- Blob Storage

Set up a data export to feed the same telemetry into Power BI for richer analytics, or into a data lake for long-term storage and machine learning.

## Wrapping Up

Building effective dashboards in Azure IoT Central is less about mastering the tile builder and more about understanding what your operators need to see. Start with a clear question - "what decisions does this dashboard help me make?" - and work backward to the data and visualizations that support those decisions. Keep fleet dashboards focused on anomalies and status, device views focused on recent history and configuration, and resist the temptation to show everything on a single screen. A dashboard that surfaces three critical signals clearly is worth more than one that shows fifty metrics nobody reads.
