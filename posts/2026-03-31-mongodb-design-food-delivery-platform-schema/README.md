# How to Design a Food Delivery Platform Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema, Design, Geospatial

Description: Learn how to model a food delivery platform in MongoDB covering restaurants, menus, orders, drivers, and real-time delivery tracking.

---

## Core Collections

A food delivery platform needs four primary collections: `restaurants`, `menus`, `orders`, and `drivers`. The schema must support geospatial queries, fast menu reads, and high-volume order writes.

## Restaurant Collection

```json
{
  "_id": "rest-001",
  "name": "Mario's Pizza",
  "cuisineTypes": ["italian", "pizza"],
  "status": "open",
  "location": {
    "address": "123 Main St, New York, NY 10001",
    "coordinates": { "type": "Point", "coordinates": [-73.9857, 40.7484] }
  },
  "operatingHours": {
    "monday":    { "open": "11:00", "close": "22:00" },
    "tuesday":   { "open": "11:00", "close": "22:00" },
    "sunday":    { "open": "12:00", "close": "21:00" }
  },
  "deliveryRadiusKm": 5,
  "minOrderCents": 1500,
  "avgDeliveryMinutes": 35,
  "rating": 4.6,
  "ratingCount": 1280
}
```

## Menu and Item Collections

Menus are queried in full on every restaurant page view - embed categories and items together:

```json
{
  "_id": "menu-rest-001",
  "restaurantId": "rest-001",
  "categories": [
    {
      "name": "Pizzas",
      "items": [
        {
          "itemId": "item-001",
          "name": "Margherita",
          "description": "Tomato, mozzarella, basil",
          "priceCents": 1299,
          "available": true,
          "modifiers": [
            { "name": "Size", "options": ["Small", "Medium", "Large"], "priceDeltaCents": [0, 300, 500] }
          ]
        }
      ]
    }
  ],
  "updatedAt": "2026-03-01T00:00:00Z"
}
```

## Order Collection

```json
{
  "_id": "order-789",
  "customerId": "cust-456",
  "restaurantId": "rest-001",
  "driverId": null,
  "status": "preparing",
  "statusHistory": [
    { "status": "placed",    "ts": "2026-03-31T12:00:00Z" },
    { "status": "accepted",  "ts": "2026-03-31T12:01:30Z" },
    { "status": "preparing", "ts": "2026-03-31T12:02:00Z" }
  ],
  "items": [
    { "itemId": "item-001", "name": "Margherita", "qty": 2, "priceCents": 1799, "modifier": "Large" }
  ],
  "subtotalCents": 3598,
  "deliveryFeeCents": 199,
  "taxCents": 297,
  "totalCents": 4094,
  "deliveryAddress": {
    "street": "456 Park Ave",
    "city": "New York",
    "coordinates": { "type": "Point", "coordinates": [-73.9712, 40.7549] }
  },
  "estimatedDeliveryTime": "2026-03-31T12:40:00Z",
  "placedAt": "2026-03-31T12:00:00Z"
}
```

Embedding `statusHistory` as a bounded array (max ~10 states) keeps the full order timeline in one document.

## Driver Collection with Real-Time Location

```json
{
  "_id": "driver-101",
  "name": "Carlos Rivera",
  "status": "available",
  "currentLocation": {
    "type": "Point",
    "coordinates": [-73.9800, 40.7500]
  },
  "activeOrderId": null,
  "rating": 4.9,
  "lastLocationUpdate": "2026-03-31T12:05:00Z"
}
```

## Key Indexes

```javascript
// Find restaurants near a customer
db.restaurants.createIndex({ "location.coordinates": "2dsphere" })
db.restaurants.createIndex({ status: 1, cuisineTypes: 1 })

// Customer order history
db.orders.createIndex({ customerId: 1, placedAt: -1 })

// Restaurant order queue
db.orders.createIndex({ restaurantId: 1, status: 1, placedAt: 1 })

// Find available drivers nearby
db.drivers.createIndex({ "currentLocation": "2dsphere" })
db.drivers.createIndex({ status: 1 })
```

## Finding Nearby Restaurants

```javascript
db.restaurants.find({
  status: "open",
  "location.coordinates": {
    $near: {
      $geometry: { type: "Point", coordinates: [-73.9857, 40.7484] },
      $maxDistance: 3000  // 3 km
    }
  }
})
```

## Summary

Embed the full menu in a single document for fast restaurant page loads. Reference orders and drivers by ID for independent lifecycle management. Store all monetary values as integer cents. Use `2dsphere` indexes on both restaurant locations and driver locations for geospatial queries. Track order status changes as a bounded embedded array for a complete audit trail without a separate events collection.
