# How to Create a Custom Device Template in Azure IoT Central for Sensor Telemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure IoT Central, Device Template, Sensor Telemetry, DTDL, IoT Modeling, Device Management, Azure IoT

Description: A hands-on guide to creating custom device templates in Azure IoT Central for sensor telemetry using DTDL models and the IoT Central portal.

---

Azure IoT Central uses device templates as blueprints that define what a device can do - what telemetry it sends, what properties it has, and what commands it accepts. If you are working with custom hardware or sensors that do not match any of the built-in templates, you need to create your own. This is where things get interesting because the template is more than just a schema definition. It drives the entire experience in IoT Central, from the data visualization to the rules engine to the export pipeline.

This guide walks through building a custom device template for a multi-sensor environmental monitoring device from scratch. By the end, you will have a fully functional template that handles temperature, humidity, pressure, and air quality telemetry.

## What is a Device Template

A device template in IoT Central consists of three parts:

1. **Device model** - A Digital Twins Definition Language (DTDL) document that describes the device's capabilities (telemetry, properties, commands)
2. **Views** - Custom dashboards and forms that define how operators interact with the device
3. **Customizations** - Display names, units, and formatting options layered on top of the model

The DTDL model is the core. It uses a well-defined JSON-LD schema that IoT Central (and Azure Digital Twins) can parse and validate. Everything else builds on top of it.

## Step 1: Define the DTDL Model

Start by writing the DTDL model for our environmental sensor. This model defines four telemetry channels, two writable properties for configuration, and one command.

```json
{
  "@id": "dtmi:myorg:EnvironmentalSensor;1",
  "@type": "Interface",
  "@context": "dtmi:dtdl:context;2",
  "displayName": "Environmental Sensor",
  "description": "Multi-sensor device for environmental monitoring",
  "contents": [
    {
      "@type": ["Telemetry", "Temperature"],
      "name": "temperature",
      "displayName": "Temperature",
      "schema": "double",
      "unit": "degreeCelsius"
    },
    {
      "@type": ["Telemetry", "RelativeHumidity"],
      "name": "humidity",
      "displayName": "Humidity",
      "schema": "double",
      "unit": "percent"
    },
    {
      "@type": ["Telemetry", "Pressure"],
      "name": "pressure",
      "displayName": "Barometric Pressure",
      "schema": "double",
      "unit": "hectopascal"
    },
    {
      "@type": "Telemetry",
      "name": "airQualityIndex",
      "displayName": "Air Quality Index",
      "schema": "integer",
      "comment": "AQI value from 0 (good) to 500 (hazardous)"
    },
    {
      "@type": "Telemetry",
      "name": "batteryLevel",
      "displayName": "Battery Level",
      "schema": "double",
      "unit": "percent"
    },
    {
      "@type": "Property",
      "name": "reportingInterval",
      "displayName": "Reporting Interval (seconds)",
      "schema": "integer",
      "writable": true,
      "comment": "How frequently the device sends telemetry"
    },
    {
      "@type": "Property",
      "name": "temperatureOffset",
      "displayName": "Temperature Calibration Offset",
      "schema": "double",
      "writable": true,
      "comment": "Calibration offset applied to raw temperature readings"
    },
    {
      "@type": "Property",
      "name": "firmwareVersion",
      "displayName": "Firmware Version",
      "schema": "string",
      "writable": false
    },
    {
      "@type": "Property",
      "name": "location",
      "displayName": "Device Location",
      "schema": {
        "@type": "Object",
        "fields": [
          { "name": "lat", "schema": "double" },
          { "name": "lon", "schema": "double" },
          { "name": "alt", "schema": "double" }
        ]
      },
      "writable": false
    },
    {
      "@type": "Command",
      "name": "reboot",
      "displayName": "Reboot Device",
      "request": {
        "name": "delay",
        "displayName": "Delay (seconds)",
        "schema": "integer"
      },
      "response": {
        "name": "status",
        "displayName": "Reboot Status",
        "schema": "string"
      }
    },
    {
      "@type": "Command",
      "name": "runDiagnostics",
      "displayName": "Run Diagnostics",
      "response": {
        "name": "diagnosticReport",
        "displayName": "Diagnostic Report",
        "schema": {
          "@type": "Object",
          "fields": [
            { "name": "memoryFree", "schema": "integer" },
            { "name": "uptime", "schema": "integer" },
            { "name": "sensorStatus", "schema": "string" }
          ]
        }
      }
    }
  ]
}
```

A few things to note about this model. The `@type` array on telemetry fields like `["Telemetry", "Temperature"]` uses DTDL semantic types. These tell IoT Central that the value represents a temperature, which enables automatic unit conversion and appropriate default visualizations. The `writable: true` flag on properties means the back end can set these values and the device should respond to changes.

## Step 2: Create the Template in IoT Central

There are two ways to create the template: through the portal UI or by importing the DTDL JSON directly.

To import the model through the portal:

1. Navigate to your IoT Central application
2. Go to Device Templates in the left navigation
3. Click New and select IoT Device
4. Give the template a name like "Environmental Sensor v1"
5. Click Custom Model, then Import a Model
6. Upload the JSON file from Step 1

IoT Central validates the DTDL and shows you the parsed capabilities. If there are any syntax errors, it will flag them here.

## Step 3: Add Custom Views

Views define how operators see and interact with devices using this template. Let us create a dashboard view for real-time monitoring.

In the template editor, click Views, then Visualizing the device. Add these tiles:

**Temperature and Humidity Chart** - Add a line chart tile. Select both `temperature` and `humidity` as data sources. Set the time range to Last 24 hours. This gives operators an at-a-glance view of environmental conditions over time.

**Air Quality Gauge** - Add a KPI tile for `airQualityIndex`. Set thresholds: green for 0-50 (good), yellow for 51-100 (moderate), orange for 101-150 (unhealthy for sensitive groups), red for 151+ (unhealthy).

**Battery Level** - Add a last known value tile for `batteryLevel`. Set a warning threshold at 20%.

**Location Map** - Add a map tile bound to the `location` property. This shows where the device is deployed on a map.

## Step 4: Configure Property Forms

Create an editing form so operators can modify writable properties without touching code.

Click Views, then Editing device and cloud data. Add form fields for:

- `reportingInterval` with min/max validation (10 to 3600 seconds)
- `temperatureOffset` with a range of -10.0 to 10.0

When an operator changes these values through the form, IoT Central updates the device twin desired properties, and the device receives the new values.

## Step 5: Write Device Code That Matches the Template

Here is a Node.js device implementation that sends telemetry matching our template definition.

```javascript
// env-sensor-device.js - Simulated environmental sensor
const { Mqtt } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');
const { ProvisioningDeviceClient } = require('azure-iot-provisioning-device');
const { Mqtt: ProvMqtt } = require('azure-iot-provisioning-device-mqtt');
const { SymmetricKeySecurityClient } = require('azure-iot-security-symmetric-key');

// Device provisioning credentials from IoT Central
const scopeId = 'your-scope-id';
const deviceId = 'env-sensor-001';
const symmetricKey = 'your-device-key';

// Configuration defaults
let reportingInterval = 60;
let temperatureOffset = 0;

async function provisionDevice() {
  // Provision through DPS to get the IoT Hub assignment
  const securityClient = new SymmetricKeySecurityClient(deviceId, symmetricKey);
  const provClient = ProvisioningDeviceClient.create(
    'global.azure-devices-provisioning.net',
    scopeId,
    new ProvMqtt(),
    securityClient
  );

  const result = await provClient.register();
  console.log(`Provisioned to hub: ${result.assignedHub}`);

  // Build the connection string from provisioning result
  return `HostName=${result.assignedHub};DeviceId=${result.deviceId};SharedAccessKey=${symmetricKey}`;
}

function generateTelemetry() {
  // Simulate sensor readings with some random variation
  return {
    temperature: 22.0 + (Math.random() * 5 - 2.5) + temperatureOffset,
    humidity: 55.0 + (Math.random() * 20 - 10),
    pressure: 1013.25 + (Math.random() * 10 - 5),
    airQualityIndex: Math.floor(30 + Math.random() * 40),
    batteryLevel: 85.0 - (Math.random() * 2)
  };
}

async function main() {
  const connStr = await provisionDevice();
  const client = Client.fromConnectionString(connStr, Mqtt);
  await client.open();

  // Report read-only properties
  const twin = await client.getTwin();
  twin.properties.reported.update({
    firmwareVersion: '1.2.0',
    location: { lat: 47.6062, lon: -122.3321, alt: 56.0 }
  });

  // Handle writable property updates from IoT Central
  twin.on('properties.desired', (delta) => {
    if (delta.reportingInterval !== undefined) {
      reportingInterval = delta.reportingInterval;
      console.log(`Reporting interval changed to ${reportingInterval}s`);

      // Acknowledge the property update with status
      twin.properties.reported.update({
        reportingInterval: {
          value: reportingInterval,
          status: 'completed',
          desiredVersion: delta.$version
        }
      });
    }

    if (delta.temperatureOffset !== undefined) {
      temperatureOffset = delta.temperatureOffset;
      console.log(`Temperature offset changed to ${temperatureOffset}`);

      twin.properties.reported.update({
        temperatureOffset: {
          value: temperatureOffset,
          status: 'completed',
          desiredVersion: delta.$version
        }
      });
    }
  });

  // Register command handlers
  client.onDeviceMethod('reboot', (req, res) => {
    const delay = req.payload?.delay || 5;
    res.send(200, { status: `Rebooting in ${delay} seconds` });
  });

  client.onDeviceMethod('runDiagnostics', (req, res) => {
    res.send(200, {
      diagnosticReport: {
        memoryFree: 45000,
        uptime: Math.floor(process.uptime()),
        sensorStatus: 'all sensors operational'
      }
    });
  });

  // Send telemetry on the configured interval
  const sendTelemetry = async () => {
    const data = generateTelemetry();
    const msg = new Message(JSON.stringify(data));
    msg.contentType = 'application/json';
    msg.contentEncoding = 'utf-8';
    await client.sendEvent(msg);
    console.log(`Sent telemetry: temp=${data.temperature.toFixed(1)}, humidity=${data.humidity.toFixed(1)}`);
  };

  // Initial send and then on interval
  await sendTelemetry();
  setInterval(sendTelemetry, reportingInterval * 1000);
}

main().catch(console.error);
```

## Step 6: Publish the Template

Once you have defined the model, views, and customizations, click Publish in the template editor. Published templates are immutable - you cannot change the model after publishing. If you need to modify it later, you will need to create a new version of the template.

Before publishing, double-check:

- All telemetry names match what your device code sends
- Writable properties have appropriate default values
- Views display the data in a useful way for operators
- Commands have clear names and parameter descriptions

## Versioning Strategy

As your device hardware evolves, you will need to update the template. IoT Central supports template versioning through the DTDL model's `@id` field. Increment the version number (e.g., from `;1` to `;2`) when making breaking changes. You can then migrate devices from the old template to the new one, or run both versions in parallel during a transition period.

## Wrapping Up

A well-designed device template is the foundation of a good IoT Central experience. It determines what data shows up in dashboards, what rules you can create, what properties operators can configure, and what data you can export. Taking the time to model your device capabilities correctly in DTDL pays off throughout the entire lifecycle of your IoT solution. Start with the telemetry and properties your device actually produces, add commands for the actions operators need, build views that surface the most important information, and publish when you are confident the model is stable.
