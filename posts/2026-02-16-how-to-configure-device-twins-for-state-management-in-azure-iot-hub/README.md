# How to Configure Device Twins for State Management in Azure IoT Hub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure IoT Hub, Device Twins, IoT, State Management, Desired Properties, Reported Properties, JSON

Description: Learn how to use Azure IoT Hub device twins to manage device configuration, synchronize state, and query device properties across your IoT fleet.

---

In any IoT deployment, you need a way to manage device configuration remotely. You cannot physically access thousands of devices scattered across factories, buildings, or fields to change their settings. Azure IoT Hub device twins solve this problem by maintaining a JSON document for each device that stores configuration (desired properties), device-reported state (reported properties), and metadata (tags).

The twin acts as a bridge between the cloud and the device. You set desired properties from the cloud side, the device reads them and adjusts its behavior, then reports back its actual state. If the device is offline when you push a configuration change, it picks up the change the next time it connects.

## Device Twin Structure

A device twin is a JSON document with three main sections:

```json
{
    "deviceId": "sensor-temp-042",
    "etag": "AAAAAAAAAAM=",
    "status": "enabled",
    "tags": {
        "location": {
            "building": "B1",
            "floor": 3,
            "room": "305"
        },
        "environment": "production",
        "firmware": {
            "currentVersion": "2.1.0",
            "lastUpdated": "2026-02-10T14:30:00Z"
        }
    },
    "properties": {
        "desired": {
            "telemetryInterval": 30,
            "temperatureThreshold": {
                "min": 18.0,
                "max": 28.0
            },
            "firmwareVersion": "2.2.0",
            "$metadata": {},
            "$version": 7
        },
        "reported": {
            "telemetryInterval": 30,
            "temperatureThreshold": {
                "min": 18.0,
                "max": 28.0
            },
            "firmwareVersion": "2.1.0",
            "batteryLevel": 87,
            "lastBootTime": "2026-02-15T08:12:33Z",
            "$metadata": {},
            "$version": 12
        }
    }
}
```

**Tags** - Metadata set by the cloud side only. Devices cannot read or write tags. Used for organizing and querying devices (e.g., "all devices on floor 3 of building B1").

**Desired properties** - Configuration set by the cloud side. The device reads these and acts on them. Used for pushing settings like telemetry intervals, thresholds, and firmware versions.

**Reported properties** - State reported by the device. The cloud side reads these to understand what the device is actually doing. Used for reporting current configuration, battery level, firmware version, and health status.

## Prerequisites

- An Azure IoT Hub with devices registered
- Azure CLI with the IoT extension (`az extension add --name azure-iot`)
- A device client that supports device twin operations (Azure IoT SDKs support this)

## Step 1: Set Tags for Device Organization

Tags are your primary tool for organizing and querying devices. Set them from the cloud side using the CLI, SDK, or Azure portal.

```bash
# Update device twin tags for a specific device
# Tags are cloud-side only - the device never sees them
az iot hub device-twin update \
    --hub-name iothub-production-001 \
    --device-id sensor-temp-042 \
    --tags '{
        "location": {
            "building": "B1",
            "floor": 3,
            "room": "305",
            "zone": "manufacturing"
        },
        "deployment": {
            "wave": 2,
            "date": "2026-01-15"
        },
        "customer": "acme-corp"
    }'
```

Design your tag schema before deploying devices. A well-designed schema makes fleet management much easier. Common tag categories include:

- **Location** - Building, floor, room, GPS coordinates
- **Environment** - Production, staging, testing
- **Customer/tenant** - For multi-tenant deployments
- **Hardware** - Model, revision, manufacturing batch
- **Deployment** - Wave number, deployment date
- **Ownership** - Team, cost center

## Step 2: Set Desired Properties

Push configuration to devices by updating desired properties:

```bash
# Set desired properties for a device
# The device will receive these and adjust its behavior accordingly
az iot hub device-twin update \
    --hub-name iothub-production-001 \
    --device-id sensor-temp-042 \
    --desired '{
        "telemetryInterval": 15,
        "temperatureThreshold": {
            "min": 20.0,
            "max": 26.0,
            "alertEnabled": true
        },
        "loggingLevel": "info",
        "firmwareVersion": "2.2.0"
    }'
```

Desired properties are versioned. Every time you update them, the `$version` number increments. The device can use this version number to detect changes and avoid unnecessary processing.

### Bulk Update with IoT Hub Jobs

For updating desired properties across many devices at once, use IoT Hub jobs:

```bash
# Schedule a twin update job that targets all devices on floor 3
# This updates desired properties for every matching device
az iot hub job create \
    --hub-name iothub-production-001 \
    --job-id "update-floor3-interval-$(date +%s)" \
    --job-type scheduleUpdateTwin \
    --twin-patch '{"properties":{"desired":{"telemetryInterval":10}}}' \
    --query-condition "tags.location.floor = 3"
```

This is how you update hundreds of devices with a single command. The job runs asynchronously and you can monitor its progress.

## Step 3: Handle Desired Properties on the Device

The device needs to listen for desired property changes and act on them. Here is a Python example:

```python
# Device-side code for handling desired property changes
# This runs on the IoT device and responds to cloud configuration updates
from azure.iot.device import IoTHubDeviceClient
import json

# Connection string for the device (provisioned via DPS or manual registration)
CONNECTION_STRING = "HostName=iothub-production-001.azure-devices.net;DeviceId=sensor-temp-042;SharedAccessKey=..."

def desired_property_handler(patch):
    """
    Called whenever the cloud updates desired properties.
    The patch contains only the changed properties, not the full twin.
    """
    print(f"Received desired property update: {json.dumps(patch, indent=2)}")

    # Apply each changed property
    if "telemetryInterval" in patch:
        new_interval = patch["telemetryInterval"]
        print(f"Updating telemetry interval to {new_interval} seconds")
        # Apply the new interval to the device's telemetry loop
        apply_telemetry_interval(new_interval)

        # Report back the applied value
        reported = {"telemetryInterval": new_interval}
        client.patch_twin_reported_properties(reported)

    if "temperatureThreshold" in patch:
        thresholds = patch["temperatureThreshold"]
        print(f"Updating temperature thresholds: min={thresholds.get('min')}, max={thresholds.get('max')}")
        apply_temperature_thresholds(thresholds)

        # Report the applied thresholds
        reported = {"temperatureThreshold": thresholds}
        client.patch_twin_reported_properties(reported)

    if "firmwareVersion" in patch:
        target_version = patch["firmwareVersion"]
        current_version = get_current_firmware_version()
        if target_version != current_version:
            print(f"Firmware update requested: {current_version} -> {target_version}")
            # Report that update is in progress
            client.patch_twin_reported_properties({
                "firmwareUpdate": {
                    "status": "downloading",
                    "targetVersion": target_version
                }
            })
            # Start the firmware update process
            start_firmware_update(target_version)

def apply_telemetry_interval(interval):
    """Apply the new telemetry interval to the device."""
    global TELEMETRY_INTERVAL
    TELEMETRY_INTERVAL = interval

def apply_temperature_thresholds(thresholds):
    """Apply new temperature thresholds for alerting."""
    global TEMP_MIN, TEMP_MAX
    TEMP_MIN = thresholds.get("min", 18.0)
    TEMP_MAX = thresholds.get("max", 28.0)

# Connect and set up the handler
client = IoTHubDeviceClient.create_from_connection_string(CONNECTION_STRING)
client.connect()

# Register the handler for desired property changes
client.on_twin_desired_properties_patch_received = desired_property_handler

# On startup, also read the full twin to sync with current desired state
twin = client.get_twin()
desired = twin["desired"]
desired_property_handler(desired)

print("Device twin handler active, waiting for updates...")
```

## Step 4: Report Device State

Devices should regularly report their current state through reported properties:

```python
# Report device state to the cloud
# This code runs periodically on the device to update reported properties
import psutil
import time

def report_device_state(client):
    """
    Report the current device state to IoT Hub.
    Call this periodically or when significant state changes occur.
    """
    reported_properties = {
        "telemetryInterval": TELEMETRY_INTERVAL,
        "temperatureThreshold": {
            "min": TEMP_MIN,
            "max": TEMP_MAX
        },
        "firmwareVersion": get_current_firmware_version(),
        "systemHealth": {
            "cpuPercent": psutil.cpu_percent(),
            "memoryPercent": psutil.virtual_memory().percent,
            "diskPercent": psutil.disk_usage('/').percent,
            "uptimeHours": round((time.time() - psutil.boot_time()) / 3600, 1)
        },
        "networkInfo": {
            "ipAddress": get_device_ip(),
            "signalStrength": get_wifi_signal()  # or cellular signal
        },
        "lastReportTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    # Send the reported properties to IoT Hub
    client.patch_twin_reported_properties(reported_properties)
    print("Device state reported successfully")
```

## Step 5: Query Devices Using Twin Data

One of the most powerful features of device twins is the ability to query across your entire fleet using SQL-like syntax.

```bash
# Query all devices on floor 3 that have low battery
az iot hub query \
    --hub-name iothub-production-001 \
    --query-command "SELECT deviceId, tags.location, properties.reported.batteryLevel FROM devices WHERE tags.location.floor = 3 AND properties.reported.batteryLevel < 20"

# Find devices that haven't applied the latest desired configuration
az iot hub query \
    --hub-name iothub-production-001 \
    --query-command "SELECT deviceId FROM devices WHERE properties.desired.firmwareVersion != properties.reported.firmwareVersion"

# Count devices by building
az iot hub query \
    --hub-name iothub-production-001 \
    --query-command "SELECT tags.location.building, COUNT() AS deviceCount FROM devices GROUP BY tags.location.building"

# Find offline devices (last activity more than 1 hour ago)
az iot hub query \
    --hub-name iothub-production-001 \
    --query-command "SELECT deviceId, connectionState, lastActivityTime FROM devices WHERE connectionState = 'Disconnected'"
```

These queries are invaluable for fleet management. You can quickly identify devices that need attention, verify configuration rollouts, and generate inventory reports.

## Step 6: Use Twin Change Notifications

Set up routing to trigger actions when twin properties change:

1. In IoT Hub, go to "Message routing"
2. Add a new route with source "Twin Change Events"
3. Set the endpoint (Event Hub, Service Bus, Storage, etc.)
4. Optionally add a query filter

This lets you build reactive workflows. For example, when a device reports low battery, route the twin change event to a Service Bus queue that triggers a work order in your maintenance system.

## Best Practices

**Keep twin size manageable.** The maximum twin size is 32 KB total. Do not store large data payloads in twins. Use device-to-cloud messages for telemetry and blobs for large data.

**Use desired/reported pattern consistently.** For every desired property you set, have the device report back the applied value in reported properties. This creates a feedback loop that lets you verify configuration changes.

**Version your schema.** Include a schema version in your twin so you can evolve the structure over time without breaking older devices.

**Handle partial updates.** Desired property patches contain only changed properties, not the full document. Your device handler must merge changes, not replace the entire configuration.

**Avoid frequent small updates.** Each twin update counts against IoT Hub throttling limits. Batch related changes into a single update rather than making many small updates.

## Wrapping Up

Device twins are the backbone of IoT device management in Azure IoT Hub. They provide a reliable, offline-capable mechanism for pushing configuration to devices and reading their state. Tags let you organize and query your fleet efficiently. The desired/reported property pattern creates a clean separation between what you want the device to do and what it is actually doing. Master device twins, and managing a fleet of thousands of devices becomes not much harder than managing a handful.
