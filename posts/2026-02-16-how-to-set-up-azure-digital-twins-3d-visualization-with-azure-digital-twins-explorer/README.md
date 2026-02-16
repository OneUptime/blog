# How to Set Up Azure Digital Twins 3D Visualization with Azure Digital Twins Explorer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Digital Twins, 3D Visualization, Digital Twins Explorer, IoT, Building Management, Twin Graph, DTDL

Description: Learn how to set up Azure Digital Twins with 3D visualization using Digital Twins Explorer to model and visualize physical environments like buildings and factories.

---

Azure Digital Twins lets you create digital representations of physical environments - buildings, factories, cities, energy grids. These digital twins model the relationships between things (rooms are part of floors, floors are part of buildings, sensors are installed in rooms) and reflect real-time state from IoT sensors. The Azure Digital Twins Explorer provides a visual interface for exploring and managing these twin graphs, and with 3D Scenes Studio, you can overlay twin data onto 3D models of your physical spaces. This guide walks through setting up the entire stack.

## What Azure Digital Twins Explorer Does

Digital Twins Explorer is a web-based tool that lets you:
- Visualize the twin graph (nodes and relationships)
- Create, edit, and delete twins
- Upload and manage DTDL (Digital Twins Definition Language) models
- Query the twin graph using SQL-like syntax
- View 3D scenes that connect twin data to 3D models

Think of it as the visual interface for your digital twin instance. While you can do everything through the REST API or CLI, Explorer makes it much easier to understand the structure of your twin graph and debug issues.

## Prerequisites

- An Azure subscription
- Azure CLI installed
- An Azure Digital Twins instance
- A 3D model of your environment in GLB/GLTF format (for 3D visualization)
- A storage account for hosting 3D assets

## Step 1: Create an Azure Digital Twins Instance

```bash
# Set up variables
RESOURCE_GROUP="rg-digital-twins"
ADT_NAME="adt-building-ops"
LOCATION="eastus"

# Create the resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create the Azure Digital Twins instance
az dt create \
    --dt-name $ADT_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION

# Assign yourself the Azure Digital Twins Data Owner role
USER_ID=$(az ad signed-in-user show --query id -o tsv)
ADT_ID=$(az dt show --dt-name $ADT_NAME --resource-group $RESOURCE_GROUP --query id -o tsv)

az role assignment create \
    --role "Azure Digital Twins Data Owner" \
    --assignee $USER_ID \
    --scope $ADT_ID
```

## Step 2: Define Your DTDL Models

DTDL models define the types of twins in your environment. Here are models for a building scenario:

```json
[
    {
        "@id": "dtmi:com:example:Building;1",
        "@type": "Interface",
        "displayName": "Building",
        "@context": "dtmi:dtdl:context;2",
        "contents": [
            {
                "@type": "Property",
                "name": "name",
                "schema": "string"
            },
            {
                "@type": "Property",
                "name": "address",
                "schema": "string"
            },
            {
                "@type": "Property",
                "name": "totalArea",
                "schema": "double"
            },
            {
                "@type": "Relationship",
                "name": "hasFloor",
                "target": "dtmi:com:example:Floor;1"
            }
        ]
    },
    {
        "@id": "dtmi:com:example:Floor;1",
        "@type": "Interface",
        "displayName": "Floor",
        "@context": "dtmi:dtdl:context;2",
        "contents": [
            {
                "@type": "Property",
                "name": "floorNumber",
                "schema": "integer"
            },
            {
                "@type": "Property",
                "name": "occupancy",
                "schema": "integer"
            },
            {
                "@type": "Relationship",
                "name": "hasRoom",
                "target": "dtmi:com:example:Room;1"
            }
        ]
    },
    {
        "@id": "dtmi:com:example:Room;1",
        "@type": "Interface",
        "displayName": "Room",
        "@context": "dtmi:dtdl:context;2",
        "contents": [
            {
                "@type": "Property",
                "name": "roomName",
                "schema": "string"
            },
            {
                "@type": "Property",
                "name": "temperature",
                "schema": "double"
            },
            {
                "@type": "Property",
                "name": "humidity",
                "schema": "double"
            },
            {
                "@type": "Property",
                "name": "occupied",
                "schema": "boolean"
            },
            {
                "@type": "Telemetry",
                "name": "temperatureReading",
                "schema": "double"
            },
            {
                "@type": "Relationship",
                "name": "hasSensor",
                "target": "dtmi:com:example:Sensor;1"
            }
        ]
    },
    {
        "@id": "dtmi:com:example:Sensor;1",
        "@type": "Interface",
        "displayName": "Sensor",
        "@context": "dtmi:dtdl:context;2",
        "contents": [
            {
                "@type": "Property",
                "name": "sensorType",
                "schema": "string"
            },
            {
                "@type": "Property",
                "name": "lastReading",
                "schema": "double"
            },
            {
                "@type": "Property",
                "name": "batteryLevel",
                "schema": "integer"
            },
            {
                "@type": "Property",
                "name": "status",
                "schema": "string"
            }
        ]
    }
]
```

Upload the models using the CLI:

```bash
# Upload DTDL models to the Digital Twins instance
az dt model create \
    --dt-name $ADT_NAME \
    --resource-group $RESOURCE_GROUP \
    --models building-models.json

# Verify models were uploaded
az dt model list --dt-name $ADT_NAME --resource-group $RESOURCE_GROUP -o table
```

## Step 3: Create the Twin Graph

Now create actual twins and relationships:

```bash
# Create the building twin
az dt twin create \
    --dt-name $ADT_NAME \
    --dtmi "dtmi:com:example:Building;1" \
    --twin-id "building-hq" \
    --properties '{"name": "Headquarters", "address": "123 Tech Avenue", "totalArea": 50000}'

# Create floor twins
az dt twin create \
    --dt-name $ADT_NAME \
    --dtmi "dtmi:com:example:Floor;1" \
    --twin-id "floor-1" \
    --properties '{"floorNumber": 1, "occupancy": 45}'

az dt twin create \
    --dt-name $ADT_NAME \
    --dtmi "dtmi:com:example:Floor;1" \
    --twin-id "floor-2" \
    --properties '{"floorNumber": 2, "occupancy": 38}'

# Create room twins
az dt twin create \
    --dt-name $ADT_NAME \
    --dtmi "dtmi:com:example:Room;1" \
    --twin-id "room-101" \
    --properties '{"roomName": "Conference Room A", "temperature": 22.5, "humidity": 45, "occupied": true}'

az dt twin create \
    --dt-name $ADT_NAME \
    --dtmi "dtmi:com:example:Room;1" \
    --twin-id "room-102" \
    --properties '{"roomName": "Open Office", "temperature": 23.1, "humidity": 42, "occupied": true}'

# Create sensor twins
az dt twin create \
    --dt-name $ADT_NAME \
    --dtmi "dtmi:com:example:Sensor;1" \
    --twin-id "sensor-temp-101" \
    --properties '{"sensorType": "temperature", "lastReading": 22.5, "batteryLevel": 85, "status": "active"}'

# Create relationships
az dt twin relationship create \
    --dt-name $ADT_NAME \
    --twin-id "building-hq" \
    --relationship "hasFloor" \
    --relationship-id "building-to-floor1" \
    --target "floor-1"

az dt twin relationship create \
    --dt-name $ADT_NAME \
    --twin-id "building-hq" \
    --relationship "hasFloor" \
    --relationship-id "building-to-floor2" \
    --target "floor-2"

az dt twin relationship create \
    --dt-name $ADT_NAME \
    --twin-id "floor-1" \
    --relationship "hasRoom" \
    --relationship-id "floor1-to-room101" \
    --target "room-101"

az dt twin relationship create \
    --dt-name $ADT_NAME \
    --twin-id "room-101" \
    --relationship "hasSensor" \
    --relationship-id "room101-to-sensor" \
    --target "sensor-temp-101"
```

## Step 4: Explore with Digital Twins Explorer

Open Digital Twins Explorer:

1. Go to your Azure Digital Twins instance in the Azure portal
2. Click **Open Azure Digital Twins Explorer** at the top of the overview page
3. The Explorer opens in a new tab

In the Explorer, you can:

**View the twin graph**: The graph visualization shows all twins as nodes and relationships as edges. You can drag nodes around, zoom in and out, and click on individual twins to see their properties.

**Run queries**: Use the query panel to search for specific twins:

```sql
-- Find all rooms with temperature above 23 degrees
SELECT * FROM digitaltwins T
WHERE IS_OF_MODEL(T, 'dtmi:com:example:Room;1')
AND T.temperature > 23

-- Find all sensors with low battery
SELECT * FROM digitaltwins T
WHERE IS_OF_MODEL(T, 'dtmi:com:example:Sensor;1')
AND T.batteryLevel < 20

-- Traverse relationships to find all rooms in a building
SELECT Room FROM digitaltwins Building
JOIN Floor RELATED Building.hasFloor
JOIN Room RELATED Floor.hasRoom
WHERE Building.$dtId = 'building-hq'
```

**Edit properties**: Click on any twin in the graph view to see and edit its properties in the property panel. Changes are saved immediately to the Digital Twins instance.

## Step 5: Set Up 3D Scenes Studio

3D Scenes Studio lets you overlay twin data onto 3D models. You need a 3D model of your building in GLB format and a storage account to host it.

### Configure Storage for 3D Assets

```bash
# Create a storage account for 3D scene assets
STORAGE_ACCOUNT="adt3dscenes01"
CONTAINER_NAME="3dscenes"

az storage account create \
    --name $STORAGE_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku Standard_LRS \
    --kind StorageV2

# Create a container for the 3D files
az storage container create \
    --name $CONTAINER_NAME \
    --account-name $STORAGE_ACCOUNT

# Enable CORS for the storage account (required for the 3D viewer)
az storage cors add \
    --account-name $STORAGE_ACCOUNT \
    --services b \
    --methods GET HEAD OPTIONS \
    --origins "https://explorer.digitaltwins.azure.net" \
    --allowed-headers "*" \
    --exposed-headers "*" \
    --max-age 3600

# Upload your 3D model
az storage blob upload \
    --account-name $STORAGE_ACCOUNT \
    --container-name $CONTAINER_NAME \
    --name "building-model.glb" \
    --file ./models/building-model.glb
```

### Create a 3D Scene Configuration

In Digital Twins Explorer, navigate to the 3D Scenes tab:

1. Click **Create scene**
2. Provide the storage account container URL
3. Upload or select your GLB model
4. The 3D model loads in the viewer

### Link Twins to 3D Elements

The key step is mapping parts of your 3D model to digital twins:

1. Click on a room in the 3D model
2. Select **Add element behavior**
3. Link it to the corresponding twin (e.g., room-101)
4. Configure visual rules based on twin properties

For example, you can set up a rule that colors a room red when its temperature exceeds 25 degrees and green when it is in the comfortable range. The 3D view updates in real time as the twin properties change.

## Step 6: Connect Live IoT Data

To make the 3D visualization truly useful, connect it to live sensor data through IoT Hub:

```python
# iot_to_twins.py
# Route IoT Hub telemetry to update Azure Digital Twins
import os
from azure.digitaltwins.core import DigitalTwinsClient
from azure.identity import DefaultAzureCredential
from azure.functions import EventHubEvent

ADT_URL = os.environ["ADT_INSTANCE_URL"]
credential = DefaultAzureCredential()
client = DigitalTwinsClient(ADT_URL, credential)

def process_iot_event(event: EventHubEvent):
    """Process an IoT Hub message and update the corresponding digital twin."""
    body = event.get_body().decode("utf-8")
    data = json.loads(body)

    # Extract the device ID and sensor reading
    device_id = event.system_properties[b"iothub-connection-device-id"].decode()
    temperature = data.get("temperature")
    humidity = data.get("humidity")

    # Map device ID to twin ID (in production, use a lookup table)
    twin_id = f"sensor-{device_id}"

    # Update the sensor twin with the latest reading
    patch = [
        {"op": "replace", "path": "/lastReading", "value": temperature},
        {"op": "replace", "path": "/status", "value": "active"}
    ]
    client.update_digital_twin(twin_id, patch)

    # Also update the room twin that contains this sensor
    room_twin_id = get_parent_room(twin_id)
    if room_twin_id and temperature is not None:
        room_patch = [
            {"op": "replace", "path": "/temperature", "value": temperature}
        ]
        if humidity is not None:
            room_patch.append({"op": "replace", "path": "/humidity", "value": humidity})

        client.update_digital_twin(room_twin_id, room_patch)
```

## Summary

Azure Digital Twins with 3D visualization gives you a live, interactive model of your physical environment. The setup involves creating DTDL models that define your entity types, building a twin graph that represents your specific environment, and optionally overlaying twin data onto 3D models in the Scenes Studio. When connected to live IoT data, the 3D visualization becomes a real-time operations dashboard where you can see temperature readings, occupancy status, and alert conditions overlaid on a 3D model of your building. Digital Twins Explorer serves as the primary interface for exploring, querying, and managing the twin graph throughout this process.
