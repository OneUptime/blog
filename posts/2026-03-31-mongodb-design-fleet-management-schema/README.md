# How to Design a Fleet Management Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema, Design, Geospatial

Description: Learn how to model a fleet management system in MongoDB covering vehicles, drivers, trips, maintenance records, and real-time location tracking.

---

## Core Collections

A fleet management system needs: `vehicles`, `drivers`, `trips`, `maintenance`, and `locationHistory`. MongoDB's geospatial support and time-series capabilities make it a strong fit for tracking vehicle positions and aggregating trip data.

## Vehicle Collection

```json
{
  "_id": "vehicle-001",
  "vin": "1HGBH41JXMN109186",
  "make": "Ford",
  "model": "Transit",
  "year": 2023,
  "licensePlate": "NY-ABC-1234",
  "type": "van",
  "status": "in-service",
  "assignedDriverId": "driver-007",
  "fuelType": "diesel",
  "maxPayloadKg": 1500,
  "odometer": {
    "currentKm": 24500,
    "lastServiceKm": 20000
  },
  "currentLocation": {
    "type": "Point",
    "coordinates": [-74.006, 40.7128]
  },
  "lastLocationUpdate": "2026-03-31T11:45:00Z",
  "insurance": {
    "provider": "SafeDrive",
    "policyNumber": "SD-2026-001",
    "expiresAt": "2027-01-01T00:00:00Z"
  },
  "tags": ["refrigerated", "northeast-region"]
}
```

## Driver Collection

```json
{
  "_id": "driver-007",
  "name": "Marco Rivera",
  "licenseNumber": "NY-DL-456789",
  "licenseClass": "CDL-B",
  "licenseExpiry": "2028-06-30",
  "phone": "+1-555-200-0007",
  "status": "on-duty",
  "currentVehicleId": "vehicle-001",
  "hoursLoggedToday": 6.5,
  "totalTrips": 1240,
  "safetyScore": 94
}
```

## Trip Collection

```json
{
  "_id": "trip-003",
  "vehicleId": "vehicle-001",
  "driverId": "driver-007",
  "status": "completed",
  "startLocation": {
    "address": "Warehouse, 100 Industrial Blvd, NY",
    "coordinates": { "type": "Point", "coordinates": [-74.1, 40.72] }
  },
  "endLocation": {
    "address": "Customer, 55 Park Ave, NY",
    "coordinates": { "type": "Point", "coordinates": [-73.98, 40.75] }
  },
  "startedAt": "2026-03-31T08:00:00Z",
  "completedAt": "2026-03-31T09:20:00Z",
  "distanceKm": 18.4,
  "fuelUsedLiters": 2.3,
  "avgSpeedKph": 52,
  "maxSpeedKph": 85,
  "idleMinutes": 8,
  "hardBrakeEvents": 1,
  "cargo": { "description": "Electronics", "weightKg": 400 }
}
```

## Maintenance Records

```javascript
{
  "_id": ObjectId(),
  "vehicleId": "vehicle-001",
  "type": "scheduled",
  "service": "oil-change",
  "odometerKm": 20000,
  "performedAt": "2026-02-15T00:00:00Z",
  "technicianId": "tech-001",
  "cost": { "amountCents": 8500, "currency": "USD" },
  "notes": "Replaced oil and filter. Brake pads at 60%.",
  "nextServiceKm": 25000,
  "nextServiceDate": "2026-08-15T00:00:00Z"
}
```

## Location History (Bucket Pattern)

Use the Bucket Pattern to handle high-frequency GPS updates:

```javascript
{
  _id: ObjectId(),
  vehicleId: "vehicle-001",
  tripId: "trip-003",
  bucketStart: ISODate("2026-03-31T08:00:00Z"),
  count: 60,
  points: [
    { ts: ISODate("2026-03-31T08:00:10Z"), coords: [-74.1, 40.72], speedKph: 0 },
    { ts: ISODate("2026-03-31T08:00:20Z"), coords: [-74.099, 40.721], speedKph: 30 }
    // ... up to 60 points per bucket
  ]
}
```

## Key Indexes

```javascript
// Real-time vehicle location
db.vehicles.createIndex({ "currentLocation": "2dsphere" })
db.vehicles.createIndex({ status: 1, assignedDriverId: 1 })

// Trip history
db.trips.createIndex({ vehicleId: 1, startedAt: -1 })
db.trips.createIndex({ driverId: 1, startedAt: -1 })

// Maintenance due alerts
db.maintenance.createIndex({ vehicleId: 1, nextServiceDate: 1 })

// Location bucket queries
db.locationHistory.createIndex({ vehicleId: 1, tripId: 1, bucketStart: -1 })
```

## Summary

Store the latest GPS coordinates directly on the vehicle document for instant location lookups. Use the Bucket Pattern in `locationHistory` to handle high-frequency GPS writes without exceeding document size limits. Track trip-level metrics (distance, fuel, safety events) as aggregated scalars computed at trip end. Add a `2dsphere` index on `currentLocation` to enable "vehicles within X km" queries for dispatch.
