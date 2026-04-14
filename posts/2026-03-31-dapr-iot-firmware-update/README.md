# How to Build IoT Firmware Update System with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, IoT, Firmware Update, Actor, Workflow

Description: Implement a safe IoT firmware update system using Dapr Actors to track per-device update state and Dapr Workflow to orchestrate rollout stages.

---

## Why Use Dapr for Firmware Updates?

Firmware updates are risky - a failed update can brick a device. You need per-device state tracking, rollback capability, and staged rollouts. Dapr Actors manage per-device state, and Dapr Workflow orchestrates the multi-step rollout process.

## Firmware Update Actor

```csharp
[Actor(TypeName = "FirmwareUpdateActor")]
public class FirmwareUpdateActor : Actor, IFirmwareUpdateActor
{
    public async Task StartUpdateAsync(FirmwareUpdateRequest request)
    {
        var state = new UpdateState
        {
            DeviceId = Id.GetId(),
            TargetVersion = request.Version,
            FirmwareUrl = request.Url,
            Status = "pending",
            StartedAt = DateTime.UtcNow
        };
        await StateManager.SetStateAsync("update", state);
    }

    public async Task ReportProgressAsync(string status, int progressPercent)
    {
        var state = await StateManager.GetStateAsync<UpdateState>("update");
        state.Status = status;
        state.Progress = progressPercent;
        if (status == "failed")
            state.FailedAt = DateTime.UtcNow;
        await StateManager.SetStateAsync("update", state);
    }

    public async Task<UpdateState> GetStatusAsync()
        => await StateManager.GetOrAddStateAsync("update", new UpdateState());
}
```

## Firmware Rollout Workflow

```python
import dapr.ext.workflow as wf
import requests

def firmware_rollout_workflow(ctx: wf.DaprWorkflowContext, input: dict):
    devices = yield ctx.call_activity(get_target_devices, input=input)

    # Stage 1: canary - 5% of devices
    canary_batch = devices[:max(1, len(devices) // 20)]
    results = yield ctx.call_activity(push_firmware_batch, input={
        "devices": canary_batch,
        "version": input["version"]
    })

    if results["failureRate"] > 0.05:
        yield ctx.call_activity(rollback_batch, input={"devices": canary_batch})
        return {"status": "aborted", "reason": "canary failure rate too high"}

    # Stage 2: full rollout
    remaining = devices[len(canary_batch):]
    yield ctx.call_activity(push_firmware_batch, input={
        "devices": remaining,
        "version": input["version"]
    })

    return {"status": "complete", "devicesUpdated": len(devices)}


def get_target_devices(ctx, input: dict) -> list:
    resp = requests.get(f"http://localhost:3500/v1.0/state/device-store/fleet-{input['group']}")
    return resp.json()


def push_firmware_batch(ctx, input: dict) -> dict:
    failures = 0
    for device_id in input["devices"]:
        resp = requests.post(
            f"http://localhost:3500/v1.0/actors/FirmwareUpdateActor/{device_id}/method/StartUpdateAsync",
            json={"version": input["version"], "url": f"https://firmware.example.com/{input['version']}.bin"}
        )
        if resp.status_code != 200:
            failures += 1
    return {"failureRate": failures / max(len(input["devices"]), 1)}
```

## Device-Side Update Handler

```bash
#!/bin/bash
# On-device script that polls Dapr for pending updates
DEVICE_ID=$(hostname)
DAPR_SIDECAR="http://localhost:3500"

while true; do
  STATUS=$(curl -s "$DAPR_SIDECAR/v1.0/actors/FirmwareUpdateActor/$DEVICE_ID/method/GetStatusAsync" | jq -r '.status')

  if [ "$STATUS" == "pending" ]; then
    URL=$(curl -s "$DAPR_SIDECAR/v1.0/actors/FirmwareUpdateActor/$DEVICE_ID/method/GetStatusAsync" | jq -r '.firmwareUrl')
    wget -O /tmp/firmware.bin "$URL"
    flash_firmware /tmp/firmware.bin && \
      curl -s -X POST "$DAPR_SIDECAR/v1.0/actors/FirmwareUpdateActor/$DEVICE_ID/method/ReportProgressAsync" \
        -H "Content-Type: application/json" \
        -d '{"status":"complete","progressPercent":100}'
  fi

  sleep 30
done
```

## Monitoring the Rollout

```bash
# Check workflow instance status
curl http://localhost:3500/v1.0/workflows/dapr/rollout-v2-1-0

# Check a specific device actor state
curl http://localhost:3500/v1.0/actors/FirmwareUpdateActor/sensor-42/state/update
```

## Summary

Dapr Actors provide isolated, persistent state per device so firmware update progress survives restarts. Dapr Workflow orchestrates the staged rollout with canary gates that automatically abort if failure rates exceed thresholds. Together, they reduce the risk of fleet-wide firmware incidents.
