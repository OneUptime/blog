# How to Build IoT Device Twin with Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, IoT, Actor, Device Twin, Kubernetes

Description: Build a scalable IoT device twin system using Dapr Actors to maintain real-time device state, handle commands, and sync reported properties.

---

## What Is a Device Twin?

A device twin is a digital representation of a physical IoT device. It stores desired state (what you want the device to do) and reported state (what the device says it is doing). Dapr Actors are a natural fit because each actor instance maps one-to-one with a physical device.

## Defining the Device Twin Actor

```csharp
[Actor(TypeName = "DeviceTwinActor")]
public class DeviceTwinActor : Actor, IDeviceTwinActor, IRemindable
{
    public DeviceTwinActor(ActorHost host) : base(host) { }

    public async Task UpdateReportedStateAsync(Dictionary<string, object> reported)
    {
        await StateManager.SetStateAsync("reported", reported);
        await StateManager.SetStateAsync("lastSeen", DateTime.UtcNow);
    }

    public async Task SetDesiredStateAsync(Dictionary<string, object> desired)
    {
        await StateManager.SetStateAsync("desired", desired);
        // Notify device of desired change
        await RegisterReminderAsync("sync", null, TimeSpan.Zero, TimeSpan.FromMinutes(1));
    }

    public async Task<DeviceTwin> GetTwinAsync()
    {
        var reported = await StateManager.GetOrAddStateAsync("reported", new Dictionary<string, object>());
        var desired = await StateManager.GetOrAddStateAsync("desired", new Dictionary<string, object>());
        return new DeviceTwin { Reported = reported, Desired = desired };
    }
}
```

## Registering the Actor

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddActors(options =>
{
    options.Actors.RegisterActor<DeviceTwinActor>();
});
var app = builder.Build();
app.MapActorsHandlers();
app.Run();
```

## Invoking the Actor from a Device Gateway

```python
import requests

DAPR_PORT = 3500
DEVICE_ID = "sensor-42"

def update_reported_state(device_id: str, state: dict):
    url = f"http://localhost:{DAPR_PORT}/v1.0/actors/DeviceTwinActor/{device_id}/method/UpdateReportedStateAsync"
    requests.post(url, json=state)

def get_twin(device_id: str) -> dict:
    url = f"http://localhost:{DAPR_PORT}/v1.0/actors/DeviceTwinActor/{device_id}/method/GetTwinAsync"
    return requests.get(url).json()

# Device reports its temperature
update_reported_state(DEVICE_ID, {"temperature": 22.5, "battery": 87})
twin = get_twin(DEVICE_ID)
print(twin)
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: device-twin-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: device-twin
  template:
    metadata:
      labels:
        app: device-twin
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "device-twin-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: device-twin
        image: myregistry/device-twin:latest
        ports:
        - containerPort: 8080
```

## Handling Reminders for Sync

When a device twin detects drift between desired and reported state, a Dapr reminder triggers a sync:

```csharp
public async Task ReceiveReminderAsync(string reminderName, byte[] state,
    TimeSpan dueTime, TimeSpan period)
{
    if (reminderName == "sync")
    {
        var desired = await StateManager.GetStateAsync<Dictionary<string, object>>("desired");
        var reported = await StateManager.GetStateAsync<Dictionary<string, object>>("reported");
        // Compute delta and issue commands to device
        var delta = desired.Except(reported).ToDictionary(k => k.Key, k => k.Value);
        // Push delta to device via messaging
    }
}
```

## Summary

Dapr Actors provide a clean model for IoT device twins by giving each physical device its own stateful actor instance. The actor stores both desired and reported state and uses reminders to detect and reconcile drift. This approach scales to millions of devices because Dapr distributes actor placement across the cluster automatically.
