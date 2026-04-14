# How to Build Real-Time Location Tracking with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Location Tracking, Pub/Sub, State Management, Real-Time

Description: Learn how to build a scalable real-time location tracking system using Dapr pub/sub for event streaming and state for position storage.

---

Real-time location tracking systems - for delivery fleets, ride-sharing, or asset monitoring - must handle thousands of concurrent GPS updates, store current positions, and broadcast location changes to interested parties. Dapr's pub/sub and state management building blocks provide the foundation.

## Location Update Pipeline

```text
Mobile/GPS Device -> Location Update API -> Dapr Pub/Sub -> Location Processor -> State Store
                                                         -> Geofence Checker
                                                         -> Client Dashboard
```

## Receive GPS Updates

A lightweight API endpoint accepts location updates and publishes them:

```python
from flask import Flask, request, jsonify
from dapr.clients import DaprClient
import json

app = Flask(__name__)

@app.route('/location/update', methods=['POST'])
def update_location():
    update = request.json
    # update = {deviceId, lat, lng, speed, heading, timestamp}

    with DaprClient() as client:
        client.publish_event(
            pubsub_name='pubsub',
            topic_name='location-updates',
            data=json.dumps(update),
            publish_metadata={"partitionKey": update['deviceId']}
        )

    return jsonify({"status": "accepted"}), 202
```

## Store Current Position with Dapr State

A subscriber processes updates and persists the latest position:

```python
@app.route('/location-updates', methods=['POST'])
def process_location():
    event = request.json
    data = event['data']

    with DaprClient() as client:
        # Store current position with TTL
        client.save_state(
            store_name='statestore',
            key=f"position:{data['deviceId']}",
            value=json.dumps({
                "lat": data['lat'],
                "lng": data['lng'],
                "speed": data['speed'],
                "heading": data['heading'],
                "lastUpdate": data['timestamp']
            }),
            state_metadata={"ttlInSeconds": "3600"}
        )

        # Publish to device-specific topic for subscriber filtering
        client.publish_event(
            'pubsub',
            f"device-{data['deviceId']}-location",
            json.dumps(data)
        )

    return '', 200
```

## Geofence Checking Service

Subscribe to location updates and check geofence boundaries:

```javascript
const server = new DaprServer({ serverPort: 3001 });
const client = new DaprClient();

const geofences = [
  { id: 'warehouse-A', center: { lat: 37.7749, lng: -122.4194 }, radiusKm: 0.5 },
  { id: 'restricted-zone', center: { lat: 37.7849, lng: -122.4094 }, radiusKm: 1.0 }
];

server.pubsub.subscribe('pubsub', 'location-updates', async (update) => {
  for (const fence of geofences) {
    const distance = haversineDistance(
      { lat: update.lat, lng: update.lng },
      fence.center
    );

    const isInside = distance <= fence.radiusKm;
    const stateKey = `geofence:${update.deviceId}:${fence.id}`;

    const prev = await client.state.get('statestore', stateKey);
    const wasInside = prev === 'true';

    if (isInside !== wasInside) {
      // Fence crossing event
      await client.pubsub.publish('pubsub', 'geofence-events', {
        deviceId: update.deviceId,
        fenceId: fence.id,
        event: isInside ? 'entered' : 'exited',
        timestamp: update.timestamp
      });

      await client.state.save('statestore', [
        { key: stateKey, value: String(isInside) }
      ]);
    }
  }
});
```

## Query Multiple Device Positions

Retrieve positions for a fleet of devices:

```python
@app.route('/fleet/positions', methods=['GET'])
def get_fleet_positions():
    device_ids = request.args.get('ids', '').split(',')

    with DaprClient() as client:
        positions = {}
        for device_id in device_ids:
            result = client.get_state('statestore', f'position:{device_id}')
            if result.data:
                positions[device_id] = json.loads(result.data)

    return jsonify(positions), 200
```

## Haversine Distance Calculation

```javascript
function haversineDistance(point1, point2) {
  const R = 6371; // Earth radius in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(point1.lat * Math.PI / 180) *
    Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

## Summary

Real-time location tracking with Dapr uses pub/sub for reliable event distribution and state management for current position storage. GPS updates are published with device ID partition keys for ordered delivery per device. A geofence service subscribes to the central location topic and uses Dapr state to track previous fence states, publishing crossing events when devices enter or exit boundaries.
