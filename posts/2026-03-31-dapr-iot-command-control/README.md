# How to Build IoT Command and Control with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, IoT, Command, Actor, State Management

Description: Learn how to implement bidirectional IoT command and control using Dapr Actors for command queuing and pub/sub for device delivery.

---

Command and control systems send instructions to IoT devices and track whether commands were executed. Challenges include delivering commands to devices that may be offline, ensuring commands execute exactly once, and correlating responses with original requests. Dapr Actors handle per-device command queues while pub/sub delivers to connected devices.

## Command Flow

```text
Operator API -> Device Actor (command queue) -> Pub/Sub -> MQTT Gateway -> Device
                                              <- ACK event <- Device
```

## Define the Command Model

```python
from dataclasses import dataclass
from enum import Enum

class CommandStatus(str, Enum):
    PENDING = "pending"
    DELIVERED = "delivered"
    ACKNOWLEDGED = "acknowledged"
    FAILED = "failed"
    EXPIRED = "expired"

@dataclass
class DeviceCommand:
    commandId: str
    deviceId: str
    type: str
    params: dict
    issuedAt: str
    expiresAt: str
    status: str = CommandStatus.PENDING
```

## Device Actor with Command Queue

```csharp
[Actor(TypeName = "DeviceActor")]
public class DeviceActor : Actor, IDeviceActor
{
    public async Task<string> QueueCommand(DeviceCommand command)
    {
        var commands = await StateManager.GetOrAddStateAsync(
            "pending-commands", new List<DeviceCommand>());

        command.CommandId = Guid.NewGuid().ToString();
        command.IssuedAt = DateTime.UtcNow.ToString("O");
        command.ExpiresAt = DateTime.UtcNow.AddMinutes(30).ToString("O");
        command.Status = "pending";

        commands.Add(command);
        await StateManager.SetStateAsync("pending-commands", commands);

        // Attempt immediate delivery if device is online
        var shadow = await StateManager.GetOrAddStateAsync("shadow", new DeviceShadow());
        if (shadow.ConnectionStatus == "connected")
        {
            await DeliverCommand(command);
        }

        // Set expiry reminder
        await RegisterReminderAsync(
            $"expire-{command.CommandId}",
            System.Text.Encoding.UTF8.GetBytes(command.CommandId),
            TimeSpan.FromMinutes(30),
            TimeSpan.FromMilliseconds(-1)
        );

        return command.CommandId;
    }

    private async Task DeliverCommand(DeviceCommand command)
    {
        var daprClient = new DaprClientBuilder().Build();
        await daprClient.PublishEventAsync(
            "pubsub",
            $"device-{Id.GetId()}-commands",
            command
        );

        command.Status = "delivered";
        await UpdateCommandStatus(command.CommandId, "delivered");
    }

    public async Task AcknowledgeCommand(string commandId)
    {
        await UpdateCommandStatus(commandId, "acknowledged");

        var daprClient = new DaprClientBuilder().Build();
        await daprClient.PublishEventAsync("pubsub", "command-acks", new
        {
            CommandId = commandId,
            DeviceId = Id.GetId(),
            AcknowledgedAt = DateTime.UtcNow
        });
    }
}
```

## MQTT-to-Dapr Gateway

Bridge MQTT messages to Dapr events:

```python
import paho.mqtt.client as mqtt
from dapr.clients import DaprClient
import json
import requests

DAPR_HTTP_PORT = 3500

def on_message(client, userdata, msg):
    topic_parts = msg.topic.split('/')
    device_id = topic_parts[1]
    message_type = topic_parts[2]

    payload = json.loads(msg.payload)

    if message_type == 'telemetry':
        with DaprClient() as dapr:
            dapr.publish_event('pubsub', 'iot-events',
                               json.dumps(payload),
                               data_content_type='application/json')
    elif message_type == 'ack':
        # Route ACK to device actor via Dapr HTTP API
        requests.post(
            f'http://localhost:{DAPR_HTTP_PORT}/v1.0/actors/DeviceActor/{device_id}/method/acknowledgeCommand',
            json=payload['commandId']
        )

mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
mqtt_client.on_message = on_message
mqtt_client.connect('mqtt-broker', 1883)
mqtt_client.subscribe('devices/+/telemetry')
mqtt_client.subscribe('devices/+/ack')
mqtt_client.loop_forever()
```

## Issue Commands via API

```python
import requests as http_requests

DAPR_HTTP_PORT = 3500

@app.route('/devices/<device_id>/commands', methods=['POST'])
def send_command(device_id: str):
    command = request.json

    response = http_requests.post(
        f'http://localhost:{DAPR_HTTP_PORT}/v1.0/actors/DeviceActor/{device_id}/method/queueCommand',
        json=command
    )

    command_id = response.json()
    return jsonify({"commandId": command_id}), 202
```

## Check Command Status

```python
@app.route('/commands/<command_id>/status', methods=['GET'])
def get_command_status(command_id: str):
    # Lookup via Dapr state
    with DaprClient() as client:
        status = client.get_state('statestore', f'command:{command_id}').data

    if not status:
        return jsonify({"error": "Command not found"}), 404

    return jsonify(json.loads(status))
```

## Summary

IoT command and control with Dapr uses device actors as per-device command queues that persist pending commands and deliver them immediately when the device is online or upon reconnection. MQTT-to-Dapr bridges translate device protocol messages into Dapr events. ACK messages from devices route back to the actor to update command status. Actor reminders expire unacknowledged commands after a configurable timeout.
