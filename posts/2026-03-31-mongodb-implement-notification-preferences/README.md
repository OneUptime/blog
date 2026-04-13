# How to Implement Notification Preferences in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Notification, Preference, Schema, User

Description: Design a flexible MongoDB schema for user notification preferences covering channels, categories, frequency limits, and quiet hours with efficient query patterns.

---

## Requirements for Notification Preferences

A production notification preferences system must support:
- Per-channel control (email, push, SMS, in-app)
- Per-category control (orders, marketing, security, social)
- Frequency limits (max 1 email per day for a category)
- Quiet hours (do not send between 10pm and 8am)
- Unsubscribe from all

## Schema Design

```javascript
db.notificationPreferences.insertOne({
  userId: "user_abc123",
  globalOptOut: false, // Master unsubscribe switch

  channels: {
    email: { enabled: true },
    push: { enabled: true },
    sms: { enabled: false },
    inApp: { enabled: true },
  },

  categories: {
    orders: {
      email: true,
      push: true,
      sms: false,
      inApp: true,
    },
    marketing: {
      email: false, // User unsubscribed from marketing emails
      push: false,
      sms: false,
      inApp: true,
    },
    security: {
      email: true, // Security alerts always on
      push: true,
      sms: true,
      inApp: true,
    },
  },

  quietHours: {
    enabled: true,
    startHour: 22, // 10 PM
    endHour: 8,    // 8 AM
    timezone: "America/New_York",
  },

  frequency: {
    marketing: { maxPerDay: 1, lastSentAt: null },
  },

  updatedAt: new Date(),
});
```

## Index

```javascript
db.notificationPreferences.createIndex({ userId: 1 }, { unique: true });
```

## Check Before Sending

Before sending any notification, check the preferences:

```javascript
async function canSendNotification(userId, category, channel) {
  const prefs = await db
    .collection("notificationPreferences")
    .findOne({ userId });

  // Global opt-out check
  if (!prefs || prefs.globalOptOut) return false;

  // Channel enabled check
  if (!prefs.channels?.[channel]?.enabled) return false;

  // Category + channel check
  if (prefs.categories?.[category]?.[channel] === false) return false;

  // Quiet hours check
  if (prefs.quietHours?.enabled && channel !== "email") {
    const now = new Date();
    const hour = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: prefs.quietHours.timezone,
    }).format(now);
    const h = parseInt(hour);
    const { startHour, endHour } = prefs.quietHours;
    if (startHour > endHour) {
      if (h >= startHour || h < endHour) return false; // e.g., 22-8
    } else {
      if (h >= startHour && h < endHour) return false;
    }
  }

  return true;
}
```

## Frequency Limiting

Check and update send frequency using a conditional update to avoid race conditions:

```javascript
async function checkAndUpdateFrequency(userId, category) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Check if a frequency limit is defined
  const prefs = await db.collection("notificationPreferences").findOne(
    { userId },
    { projection: { [`frequency.${category}`]: 1 } }
  );

  const freqConfig = prefs?.frequency?.[category];
  if (!freqConfig) return true; // No limit defined

  // Update lastSentAt only if not already sent today
  const result = await db.collection("notificationPreferences").updateOne(
    {
      userId,
      $or: [
        { [`frequency.${category}.lastSentAt`]: null },
        { [`frequency.${category}.lastSentAt`]: { $lt: startOfDay } },
      ],
    },
    { $set: { [`frequency.${category}.lastSentAt`]: new Date() } }
  );

  return result.modifiedCount > 0;
}
```

## Bulk Update Preferences

Allow users to update preferences with partial payloads:

```javascript
async function updatePreferences(userId, updates) {
  const setFields = {};
  for (const [key, value] of Object.entries(updates)) {
    setFields[key] = value;
  }
  setFields.updatedAt = new Date();

  await db.collection("notificationPreferences").updateOne(
    { userId },
    { $set: setFields },
    { upsert: true }
  );
}

// Example: disable all marketing notifications
await updatePreferences("user_abc123", {
  "categories.marketing.email": false,
  "categories.marketing.push": false,
});
```

## Summary

A MongoDB notification preferences schema uses a single document per user with nested objects for channel control, category-channel combinations, quiet hours, and frequency limits. Index by `userId` with a unique constraint for O(1) lookup. Check preferences before every send using dot-notation field access. Use atomic `updateOne` with `$set` and dot notation for partial preference updates that do not overwrite unrelated settings.
