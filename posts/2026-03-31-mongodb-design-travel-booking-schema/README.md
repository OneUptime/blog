# How to Design a Travel Booking Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema, Design, Booking

Description: Learn how to model a travel booking platform in MongoDB covering flights, hotels, booking records, passengers, and payment tracking.

---

## Core Collections

A travel booking platform requires: `flights`, `hotels`, `bookings`, `passengers`, and `payments`. MongoDB's flexible schema handles the variation between flight bookings (seat class, baggage, stops) and hotel bookings (room type, meal plan, cancellation policy) cleanly via a polymorphic booking document.

## Flight Collection

```json
{
  "_id": "flight-AA123-20260401",
  "flightNumber": "AA123",
  "airline": "American Airlines",
  "departureAirport": "JFK",
  "arrivalAirport": "LAX",
  "departureTime": "2026-04-01T08:00:00Z",
  "arrivalTime":   "2026-04-01T14:15:00Z",
  "durationMinutes": 375,
  "aircraft": "Boeing 737",
  "stops": 0,
  "cabins": [
    { "class": "economy",        "availableSeats": 120, "priceCents": 24900 },
    { "class": "business",       "availableSeats": 16,  "priceCents": 89900 },
    { "class": "first",          "availableSeats": 8,   "priceCents": 149900 }
  ],
  "status": "scheduled"
}
```

## Hotel Collection

```json
{
  "_id": "hotel-001",
  "name": "Grand Plaza Hotel",
  "starRating": 4,
  "location": {
    "city": "Paris",
    "country": "FR",
    "coordinates": { "type": "Point", "coordinates": [2.3522, 48.8566] }
  },
  "amenities": ["wifi", "pool", "gym", "restaurant"],
  "rooms": [
    {
      "type": "standard",
      "maxGuests": 2,
      "priceCents": 18000,
      "availableCount": 40
    },
    {
      "type": "suite",
      "maxGuests": 4,
      "priceCents": 55000,
      "availableCount": 5
    }
  ],
  "rating": 4.4,
  "reviewCount": 3210
}
```

## Booking Collection (Polymorphic)

A single `bookings` collection handles both flight and hotel bookings using a `type` discriminator field:

```json
{
  "_id": "booking-789",
  "userId": "user-001",
  "type": "flight",
  "status": "confirmed",
  "flightId": "flight-AA123-20260401",
  "cabin": "economy",
  "passengers": [
    {
      "firstName": "Alice",
      "lastName": "Smith",
      "passportNumber": "X1234567",
      "nationality": "US",
      "dob": "1990-05-15",
      "seatNumber": "22A",
      "baggageKg": 23
    }
  ],
  "totalPriceCents": 26900,
  "currency": "USD",
  "paymentId": "pay-001",
  "bookedAt": "2026-03-15T10:00:00Z",
  "cancellationPolicy": {
    "freeCancelBefore": "2026-03-29T08:00:00Z",
    "refundPercent": 80
  }
}
```

```json
{
  "_id": "booking-790",
  "userId": "user-001",
  "type": "hotel",
  "status": "confirmed",
  "hotelId": "hotel-001",
  "roomType": "standard",
  "checkIn":  "2026-04-01",
  "checkOut": "2026-04-05",
  "nights": 4,
  "guestCount": 2,
  "totalPriceCents": 72000,
  "currency": "EUR",
  "paymentId": "pay-002",
  "bookedAt": "2026-03-15T10:05:00Z"
}
```

## Key Indexes

```javascript
// User booking history
db.bookings.createIndex({ userId: 1, bookedAt: -1 })

// Filter by type and status
db.bookings.createIndex({ type: 1, status: 1, bookedAt: -1 })

// Flight availability search
db.flights.createIndex({ departureAirport: 1, arrivalAirport: 1, departureTime: 1, status: 1 })

// Hotel geo search
db.hotels.createIndex({ "location.coordinates": "2dsphere" })
db.hotels.createIndex({ "location.city": 1, starRating: 1 })
```

## Searching Available Flights

```javascript
db.flights.find({
  departureAirport: "JFK",
  arrivalAirport:   "LAX",
  departureTime: {
    $gte: new Date("2026-04-01T00:00:00Z"),
    $lt:  new Date("2026-04-02T00:00:00Z")
  },
  status: "scheduled",
  cabins: {
    $elemMatch: { class: "economy", availableSeats: { $gt: 0 } }
  }
})
```

## Summary

Use a polymorphic `bookings` collection with a `type` field to handle flight and hotel bookings in one collection, simplifying user booking history queries. Embed passenger details within flight bookings since they are always read together. Store available seat/room counts inline and update with `$inc` using transactions to prevent double-booking. Index on `userId` for history lookups, and compound indexes on flight routes and dates for availability searches.
