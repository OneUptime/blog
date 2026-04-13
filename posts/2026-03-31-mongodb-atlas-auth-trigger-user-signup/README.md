# How to Use Authentication Triggers on User Sign-Up in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Triggers, Authentication

Description: Configure MongoDB Atlas authentication triggers to run Atlas Functions automatically when users register, log in, or are deleted for onboarding and audit workflows.

---

Atlas Authentication Triggers fire when a user registers, logs in, or is deleted through Atlas App Services authentication. They enable onboarding flows, audit logging, and account provisioning without modifying client application code.

## Authentication Trigger Events

| Action | Description |
|---|---|
| `CREATE` | User registers for the first time |
| `LOGIN` | User logs in successfully |
| `DELETE` | User account is deleted |

## Creating an Auth Trigger

In Atlas UI - App Services - Triggers - Add Trigger, select Authentication as the trigger type:

```json
{
  "name": "on-user-signup",
  "type": "AUTHENTICATION",
  "config": {
    "operation_type": "CREATE",
    "providers": ["local-userpass", "oauth2-google"]
  },
  "function_name": "onUserSignup",
  "disabled": false
}
```

## Onboarding Function - Create User Profile on Sign-Up

```javascript
// Function: onUserSignup
exports = async function(authEvent) {
  const { user } = authEvent;
  const db = context.services.get("mongodb-atlas").db("myApp");

  console.log(`New user registered: ${user.id} (${user.data.email})`);

  // Create user profile document
  const existingProfile = await db.collection("userProfiles").findOne({ userId: user.id });
  if (existingProfile) {
    console.log("Profile already exists, skipping");
    return;
  }

  await db.collection("userProfiles").insertOne({
    userId: user.id,
    email: user.data.email,
    displayName: user.data.name || user.data.email.split("@")[0],
    provider: user.identities[0].provider_type,
    plan: "free",
    settings: {
      notifications: true,
      theme: "light"
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Send welcome email
  await context.functions.execute("sendWelcomeEmail", {
    email: user.data.email,
    name: user.data.name || "there"
  });

  console.log(`Created profile for user ${user.id}`);
};
```

## The authEvent Object Structure

```javascript
// authEvent contains:
{
  operationType: "CREATE",   // CREATE, LOGIN, or DELETE
  providers: ["local-userpass"],
  user: {
    id: "64abc...",          // Atlas user ID
    type: "normal",
    data: {
      email: "user@example.com",
      name: "Jane Smith"     // from OAuth providers
    },
    custom_data: {},         // from custom_data collection
    identities: [
      {
        id: "user@example.com",
        provider_type: "local-userpass",
        providerData: {}
      }
    ]
  }
}
```

## Login Trigger - Track Last Seen

```javascript
// Function: onUserLogin
exports = async function(authEvent) {
  const { user } = authEvent;
  const db = context.services.get("mongodb-atlas").db("myApp");

  await db.collection("userProfiles").updateOne(
    { userId: user.id },
    {
      $set: { lastLoginAt: new Date() },
      $inc: { loginCount: 1 }
    }
  );

  console.log(`User ${user.id} logged in`);
};
```

## Delete Trigger - Clean Up User Data

```javascript
// Function: onUserDelete
exports = async function(authEvent) {
  const { user } = authEvent;
  const db = context.services.get("mongodb-atlas").db("myApp");

  // Archive user data before deletion
  const profile = await db.collection("userProfiles").findOne({ userId: user.id });
  if (profile) {
    await db.collection("deletedUserProfiles").insertOne({
      ...profile,
      originalUserId: user.id,
      deletedAt: new Date()
    });
  }

  // Remove user data from active collections
  await Promise.all([
    db.collection("userProfiles").deleteOne({ userId: user.id }),
    db.collection("sessions").deleteMany({ userId: user.id }),
    db.collection("notifications").deleteMany({ userId: user.id })
  ]);

  console.log(`Cleaned up data for deleted user ${user.id}`);
};
```

## Filtering by Provider

You can create separate triggers for different auth providers:

```json
{
  "name": "on-google-signup",
  "config": {
    "operation_type": "CREATE",
    "providers": ["oauth2-google"]
  },
  "function_name": "onGoogleSignup"
}
```

This fires only when a user registers via Google OAuth.

## Summary

Atlas Authentication Triggers automate user lifecycle events by running Atlas Functions when users register (`CREATE`), log in (`LOGIN`), or are deleted (`DELETE`). Use the `CREATE` trigger to provision user profiles and send welcome emails, the `LOGIN` trigger for audit trails and last-seen tracking, and the `DELETE` trigger to archive and clean up user data. Filter by auth provider to customize behavior per sign-in method.
