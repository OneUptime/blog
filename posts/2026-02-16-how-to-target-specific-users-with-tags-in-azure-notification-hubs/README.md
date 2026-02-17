# How to Target Specific Users with Tags in Azure Notification Hubs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Notification Hubs, Tags, Targeting, Push Notifications, Segmentation, Mobile

Description: Learn how to use tags and tag expressions in Azure Notification Hubs to send targeted push notifications to specific users and segments.

---

Sending push notifications to every registered device is rarely what you actually want. More often, you need to notify a specific user about their order, alert a team about an incident, or send a promotional message to users in a particular region. Azure Notification Hubs uses a tag system to handle this targeting, and it is surprisingly flexible once you understand how it works.

In this post, I will cover how tags work, how to design a tagging strategy, and how to use tag expressions to build sophisticated audience targeting.

## What Are Tags?

Tags are string labels that you attach to device registrations. When you send a notification, you specify a tag expression, and only devices whose tags match the expression receive the notification.

A device can have up to 60 tags. Tags are arbitrary strings up to 120 characters. You decide the naming convention and what they represent.

Common tag patterns include:

- User identity: `user:user-123`
- Platform: `platform:ios`, `platform:android`
- Role: `role:admin`, `role:viewer`
- Team: `team:engineering`, `team:sales`
- Location: `country:us`, `city:seattle`
- Preferences: `pref:alerts`, `pref:marketing`
- App version: `version:2.5.0`

## Setting Tags During Registration

Tags are attached when you register or update a device registration.

```javascript
// tag-registration.js - Register devices with meaningful tags
const { NotificationHubsClient } = require('@azure/notification-hubs');

const connectionString = process.env.NOTIFICATION_HUB_CONNECTION_STRING;
const client = new NotificationHubsClient(connectionString, 'my-hub');

async function registerDevice(deviceToken, userProfile) {
  // Build the tag set based on the user's profile
  const tags = [
    `user:${userProfile.id}`,
    `team:${userProfile.team}`,
    `role:${userProfile.role}`,
    `country:${userProfile.country}`,
    `lang:${userProfile.language}`,
    'platform:ios' // Set based on the device type
  ];

  // Add preference-based tags
  if (userProfile.preferences.alerts) {
    tags.push('pref:alerts');
  }
  if (userProfile.preferences.marketing) {
    tags.push('pref:marketing');
  }

  const registration = await client.createOrUpdateRegistration({
    kind: 'Apple',
    deviceToken: deviceToken,
    tags: tags
  });

  console.log('Registered with tags:', tags);
  return registration;
}
```

## Updating Tags

User profiles change. Someone switches teams, updates their preferences, or changes their role. You need to update the tags on their device registration.

```javascript
// update-tags.js - Update tags on an existing registration
async function updateUserTags(registrationId, newTags) {
  // First, get the existing registration
  const registration = await client.getRegistration(registrationId);

  // Update the tags
  registration.tags = newTags;

  // Save the updated registration
  const updated = await client.createOrUpdateRegistration(registration);
  console.log('Updated registration tags:', updated.tags);
  return updated;
}

// Alternatively, if you manage registrations by installation ID
async function updateInstallationTags(installationId, tagsToAdd, tagsToRemove) {
  const patches = [];

  // Add new tags
  for (const tag of tagsToAdd) {
    patches.push({ op: 'add', path: '/tags', value: tag });
  }

  // Remove old tags
  for (const tag of tagsToRemove) {
    patches.push({ op: 'remove', path: `/tags/${tag}` });
  }

  await client.updateInstallation(installationId, patches);
}
```

## Sending to a Single Tag

The simplest targeting sends to a single tag.

```javascript
// single-tag-send.js - Send a notification to devices matching one tag
async function notifyUser(userId, title, message) {
  const result = await client.sendNotification(
    {
      kind: 'Gcm',
      body: JSON.stringify({
        notification: { title, body: message }
      })
    },
    { tagExpression: `user:${userId}` }
  );

  console.log('Sent to user:', userId);
  return result;
}

// Notify all admins
async function notifyAdmins(title, message) {
  const result = await client.sendNotification(
    {
      kind: 'Gcm',
      body: JSON.stringify({
        notification: { title, body: message }
      })
    },
    { tagExpression: 'role:admin' }
  );

  return result;
}
```

## Tag Expressions for Complex Targeting

Tag expressions let you combine tags with boolean logic. The supported operators are:

- `||` (OR) - Match any of the tags
- `&&` (AND) - Match all of the tags
- `!` (NOT) - Exclude devices with this tag

Here are some practical examples.

```javascript
// tag-expressions.js - Examples of tag expression targeting

// Send to users on the engineering team who are on iOS
await sendWithTag('team:engineering && platform:ios', title, body);

// Send to users in the US or Canada
await sendWithTag('country:us || country:ca', title, body);

// Send to admins who have opted in to alerts
await sendWithTag('role:admin && pref:alerts', title, body);

// Send to everyone except users in the EU (for compliance reasons)
await sendWithTag('!region:eu', title, body);

// Send to engineering or ops team members who are on Android
await sendWithTag('(team:engineering || team:ops) && platform:android', title, body);

// Helper function to send with a tag expression
async function sendWithTag(tagExpression, title, body) {
  const result = await client.sendNotification(
    {
      kind: 'Gcm',
      body: JSON.stringify({
        notification: { title, body }
      })
    },
    { tagExpression: tagExpression }
  );

  console.log(`Sent to "${tagExpression}":`, result.trackingId);
  return result;
}
```

Tag expressions have a limit of 20 tags per expression. If you need more complex targeting, you will need to break it into multiple sends or restructure your tagging strategy.

## Designing a Tagging Strategy

A good tagging strategy makes targeting easy and keeps the number of tags per device manageable. Here are some principles that work well in practice.

**Use namespaced tags.** Prefix tags with their category: `user:`, `team:`, `role:`, `pref:`. This avoids collisions and makes the tags self-documenting.

**Keep tags stable.** Tags that change frequently (like a user's current page or temporary state) create a lot of registration update traffic. Use tags for relatively stable attributes.

**Do not encode volatile data.** Instead of a tag like `score:85`, which changes constantly, use range-based tags like `tier:gold`. You update the tag only when the user crosses a tier boundary.

**Plan for privacy.** Tags are stored in the notification hub. Do not use personally identifiable information as tag values unless you are comfortable with that data being in the hub.

```javascript
// tagging-strategy.js - A well-designed tag assignment function
function buildTags(user, device) {
  const tags = [];

  // Identity - always present
  tags.push(`user:${user.id}`);

  // Organization structure
  if (user.team) tags.push(`team:${user.team}`);
  if (user.department) tags.push(`dept:${user.department}`);
  if (user.role) tags.push(`role:${user.role}`);

  // Geography
  if (user.country) tags.push(`country:${user.country.toLowerCase()}`);
  if (user.timezone) tags.push(`tz:${user.timezone}`);

  // Platform and device info
  tags.push(`platform:${device.platform}`);
  tags.push(`appver:${device.appVersion}`);

  // Notification preferences
  for (const pref of user.notificationPreferences) {
    tags.push(`pref:${pref}`);
  }

  // Account tier
  tags.push(`tier:${user.subscriptionTier}`);

  return tags;
}
```

## Handling Multi-Device Users

Most users have multiple devices. When you tag by user ID, sending to `user:user-123` reaches all of that user's devices. This is usually what you want, but sometimes you need device-specific targeting.

```javascript
// multi-device.js - Managing tags across multiple devices
async function registerUserDevice(userId, deviceToken, platform, deviceName) {
  const deviceId = `${userId}-${platform}-${deviceName}`;

  const tags = [
    `user:${userId}`,           // Target all devices for this user
    `device:${deviceId}`,       // Target this specific device
    `platform:${platform}`,     // Target by platform
  ];

  await client.createOrUpdateRegistration({
    kind: platform === 'ios' ? 'Apple' : 'Gcm',
    deviceToken: deviceToken,
    tags: tags
  });
}

// Send to a specific device
await sendWithTag('device:user-123-ios-iphone14', title, body);

// Send to all of a user's devices
await sendWithTag('user:user-123', title, body);
```

## Monitoring Tag Usage

It is helpful to know how many devices are registered with each tag. This tells you the potential reach of a notification before you send it.

```javascript
// tag-stats.js - Check registration counts for tags
async function getTagReach(tagExpression) {
  // Count registrations matching the tag expression
  let count = 0;
  const registrations = client.listRegistrationsByTag(tagExpression);

  for await (const reg of registrations) {
    count++;
  }

  return count;
}

// Check how many devices would receive a notification
const adminCount = await getTagReach('role:admin');
console.log(`Admin notification would reach ${adminCount} devices`);

const engineeringIos = await getTagReach('team:engineering');
console.log(`Engineering notification would reach ${engineeringIos} devices`);
```

## Cleaning Up Stale Tags

Over time, tags accumulate on registrations that are no longer valid. Implement a cleanup process that runs periodically.

```javascript
// cleanup-tags.js - Remove stale registrations
async function cleanupStaleRegistrations() {
  const registrations = client.listRegistrations();
  let cleaned = 0;

  for await (const reg of registrations) {
    // Check if the user still exists in your system
    const userId = reg.tags?.find(t => t.startsWith('user:'))?.replace('user:', '');

    if (userId && !(await userExists(userId))) {
      await client.deleteRegistration(reg.registrationId);
      cleaned++;
    }
  }

  console.log(`Cleaned up ${cleaned} stale registrations`);
}
```

## Wrapping Up

Tags in Azure Notification Hubs give you a flexible, scalable way to target push notifications. By designing a thoughtful tagging strategy with namespaced, stable tags, you can target individual users, teams, platforms, regions, or any combination using tag expressions. Keep your tags meaningful, manage them as user profiles change, and clean up stale registrations periodically. The 60-tag limit per device and 20-tag limit per expression are generous enough for most use cases, and the boolean expression support covers complex targeting scenarios without requiring multiple API calls.
