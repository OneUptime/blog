# How to Build IoT Device Management with Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, IoT, Actor, Device Management, State Management

Description: Learn how to manage thousands of IoT devices using Dapr Actors, where each device is an actor that maintains its own state and configuration.

---

Managing IoT devices at scale requires maintaining per-device state - connection status, configuration, firmware version, and recent telemetry - while handling concurrent commands and configuration updates safely. Dapr Actors model each device as an independently addressable entity with automatic state persistence.

## Why Actors for IoT Device Management

Each IoT device is a natural actor:
- Single-instance: Only one actor per device ID processes requests at a time.
- Stateful: The actor persists device shadow (desired/reported state).
- Addressable: Invoke commands on a specific device by its ID.
- Scalable: The Dapr runtime distributes actors across instances automatically.

## Define the Device Actor

```csharp
public interface IDeviceActor : IActor
{
    Task ReportState(DeviceState state);
    Task<DeviceState> GetState();
    Task UpdateConfig(DeviceConfig config);
    Task<DeviceConfig> GetPendingConfig();
    Task SendCommand(DeviceCommand command);
    Task AcknowledgeCommand(string commandId);
}

[Actor(TypeName = "DeviceActor")]
public class DeviceActor : Actor, IDeviceActor, IRemindable
{
    public DeviceActor(ActorHost host) : base(host) { }

    public async Task ReportState(DeviceState state)
    {
        var shadow = await StateManager.GetOrAddStateAsync("shadow", new DeviceShadow());
        shadow.Reported = state;
        shadow.LastSeen = DateTime.UtcNow;
        shadow.ConnectionStatus = "connected";
        await StateManager.SetStateAsync("shadow", shadow);

        // Register reminder to detect disconnection
        await RegisterReminderAsync("heartbeat-check", null,
            TimeSpan.FromMinutes(2), TimeSpan.FromMinutes(2));

        // Publish state change event
        var daprClient = new DaprClientBuilder().Build();
        await daprClient.PublishEventAsync("pubsub", "device-state-changes",
            new { DeviceId = Id.GetId(), State = state });
    }

    public async Task<DeviceState> GetState()
    {
        var shadow = await StateManager.GetOrAddStateAsync("shadow", new DeviceShadow());
        return shadow.Reported;
    }

    public async Task UpdateConfig(DeviceConfig config)
    {
        var shadow = await StateManager.GetOrAddStateAsync("shadow", new DeviceShadow());
        shadow.Desired = config;
        shadow.ConfigVersion++;
        await StateManager.SetStateAsync("shadow", shadow);

        // Publish config update for device to pick up
        var daprClient = new DaprClientBuilder().Build();
        await daprClient.PublishEventAsync("pubsub", $"device-{Id.GetId()}-config",
            config);
    }

    public async Task ReceiveReminderAsync(string reminderName, byte[] state,
        TimeSpan dueTime, TimeSpan period)
    {
        if (reminderName == "heartbeat-check")
        {
            var shadow = await StateManager.GetOrAddStateAsync("shadow", new DeviceShadow());
            if (DateTime.UtcNow - shadow.LastSeen > TimeSpan.FromMinutes(3))
            {
                shadow.ConnectionStatus = "disconnected";
                await StateManager.SetStateAsync("shadow", shadow);
            }
        }
    }
}
```

## Device Gateway Service

The gateway receives telemetry from devices and routes to actors:

```python
from flask import Flask, request, jsonify
from dapr.actor import ActorProxy, ActorId
import asyncio
import json

app = Flask(__name__)

@app.route('/devices/<device_id>/telemetry', methods=['POST'])
def receive_telemetry(device_id: str):
    telemetry = request.json

    # Invoke device actor to update state
    proxy = ActorProxy.create('DeviceActor', ActorId(device_id))
    asyncio.run(proxy.invoke_method(
        'reportState', json.dumps(telemetry).encode()))

    return jsonify({"status": "accepted"}), 202

@app.route('/devices/<device_id>/config', methods=['PUT'])
def update_device_config(device_id: str):
    config = request.json

    proxy = ActorProxy.create('DeviceActor', ActorId(device_id))
    asyncio.run(proxy.invoke_method(
        'updateConfig', json.dumps(config).encode()))

    return jsonify({"status": "config_pending"}), 200
```

## Device Shadow Retrieval

```python
@app.route('/devices/<device_id>/shadow', methods=['GET'])
def get_device_shadow(device_id: str):
    proxy = ActorProxy.create('DeviceActor', ActorId(device_id))
    result = asyncio.run(proxy.invoke_method('getState'))

    return jsonify(json.loads(result)), 200
```

## Bulk Device Operations

Invoke operations on multiple devices concurrently:

```python
import asyncio
from dapr.actor import ActorProxy, ActorId

async def push_config_to_fleet(device_ids: list, config: dict):
    tasks = [
        ActorProxy.create('DeviceActor', ActorId(device_id)).invoke_method(
            'updateConfig', json.dumps(config).encode())
        for device_id in device_ids
    ]
    await asyncio.gather(*tasks, return_exceptions=True)
```

## Summary

Dapr Actors provide a natural fit for IoT device management by giving each device its own addressable, stateful entity with built-in concurrency safety. Device actors maintain a device shadow (desired vs. reported state), use actor reminders to detect disconnections, and publish state change events for downstream services. The gateway service routes incoming telemetry and outgoing commands to the correct device actor by ID, enabling management of thousands of concurrent devices.
