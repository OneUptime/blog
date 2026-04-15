# How to Implement Digital Twin with Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Digital Twin, IoT, State Management

Description: Learn how to implement a digital twin pattern using Dapr actors to create a virtual, stateful representation of a physical device or entity in the cloud.

---

## What Is a Digital Twin?

A digital twin is a virtual representation of a physical object - a sensor, machine, vehicle, or building - that mirrors its real-world state in software. Dapr actors are a natural fit: each actor instance represents one physical entity, holds its state, and processes commands on its behalf.

## Digital Twin Actor Interface

```csharp
// IDeviceTwinActor.cs
public interface IDeviceTwinActor : IActor
{
    Task UpdateTelemetryAsync(TelemetryData telemetry);
    Task<DeviceState> GetStateAsync();
    Task SendCommandAsync(DeviceCommand command);
    Task SetDesiredPropertyAsync(string key, object value);
}
```

## Digital Twin Actor Implementation

```csharp
[Actor(TypeName = "DeviceTwin")]
public class DeviceTwinActor : Actor, IDeviceTwinActor
{
    private const string StateKey = "device-state";

    public DeviceTwinActor(ActorHost host) : base(host) { }

    public async Task UpdateTelemetryAsync(TelemetryData telemetry)
    {
        var state = await StateManager.GetOrAddStateAsync<DeviceState>(StateKey, new());
        state.LastSeen = DateTime.UtcNow;
        state.Temperature = telemetry.Temperature;
        state.Humidity = telemetry.Humidity;
        state.BatteryLevel = telemetry.BatteryLevel;
        state.IsOnline = true;
        await StateManager.SetStateAsync(StateKey, state);

        // Alert if threshold exceeded
        if (telemetry.Temperature > 85)
        {
            await RegisterReminderAsync("high-temp-alert", null,
                TimeSpan.FromSeconds(0), TimeSpan.FromMilliseconds(-1));
        }
    }

    public async Task<DeviceState> GetStateAsync()
    {
        return await StateManager.GetOrAddStateAsync<DeviceState>(StateKey, new());
    }

    public async Task SendCommandAsync(DeviceCommand command)
    {
        var state = await StateManager.GetOrAddStateAsync<DeviceState>(StateKey, new());
        state.PendingCommands.Add(command);
        await StateManager.SetStateAsync(StateKey, state);
        // Command will be picked up by device on next sync
    }

    public async Task SetDesiredPropertyAsync(string key, object value)
    {
        var state = await StateManager.GetOrAddStateAsync<DeviceState>(StateKey, new());
        state.DesiredProperties[key] = value;
        await StateManager.SetStateAsync(StateKey, state);
    }
}
```

## Sending Telemetry from a Device Gateway

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function handleDeviceTelemetry(deviceId, telemetry) {
  await client.actor.invoke(
    'DeviceTwin',
    deviceId,          // Actor ID = Device ID
    'UpdateTelemetryAsync',
    telemetry
  );
}

// Simulate IoT device sending telemetry
setInterval(async () => {
  await handleDeviceTelemetry('device-sensor-001', {
    temperature: 72.5,
    humidity: 45.2,
    batteryLevel: 87
  });
}, 30_000);
```

## Querying the Twin State

```javascript
async function getDeviceState(deviceId) {
  return client.actor.invoke('DeviceTwin', deviceId, 'GetStateAsync');
}

app.get('/devices/:deviceId/state', async (req, res) => {
  const state = await getDeviceState(req.params.deviceId);
  res.json(state);
});
```

## Detecting Offline Devices

```csharp
public async Task ReceiveReminderAsync(string reminderName, byte[] state, TimeSpan dueTime, TimeSpan period)
{
    if (reminderName == "offline-check")
    {
        var state = await StateManager.GetOrAddStateAsync<DeviceState>(StateKey, new());
        if (DateTime.UtcNow - state.LastSeen > TimeSpan.FromMinutes(5))
        {
            state.IsOnline = false;
            await StateManager.SetStateAsync(StateKey, state);
            // Publish offline alert event
        }
    }
}
```

## Summary

Dapr actors provide an ideal digital twin implementation: each actor maps one-to-one with a physical entity, stores its state durably, and processes commands with turn-based concurrency. Reminders handle periodic checks like offline detection, and the actor lifecycle ensures memory efficiency as devices come and go.
