# How to Use Firebase Remote Config with Cloud Functions for Server-Side Feature Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Firebase, GCP, Remote Config, Cloud Functions, Feature Flags

Description: Learn how to implement server-side feature flags using Firebase Remote Config and Cloud Functions for controlled rollouts and A/B testing on GCP.

---

Feature flags are one of those practices that seem like overkill until you need them, and then you wonder how you ever shipped code without them. Firebase Remote Config is commonly used on the client side to toggle features in mobile and web apps, but it works just as well for server-side feature flags when combined with Cloud Functions. This gives you a single control plane for both client and server features.

## Why Server-Side Feature Flags Matter

Client-side feature flags control what the user sees. Server-side feature flags control what your backend does. Some examples:

- Gradually rolling out a new API endpoint version
- Toggling between different payment processors
- Enabling expensive computation only for certain conditions
- Switching database sharding strategies without redeploying
- A/B testing different recommendation algorithms

You could use environment variables for some of this, but every change requires a redeployment. Remote Config lets you change behavior instantly without touching your deployment pipeline.

## Setting Up Remote Config Parameters

Start by defining your server-side parameters in the Firebase Console. Go to Remote Config and create parameters for your feature flags.

You can also manage them programmatically. This script creates Remote Config parameters using the Admin SDK:

```javascript
// setup-remote-config.js - Define feature flags programmatically
const admin = require("firebase-admin");

admin.initializeApp();

async function setupFeatureFlags() {
  const remoteConfig = admin.remoteConfig();

  // Get the current template
  const template = await remoteConfig.getTemplate();

  // Define server-side feature flags
  template.parameters = {
    ...template.parameters,

    // Feature flag for new recommendation engine
    new_recommendation_engine: {
      defaultValue: { value: "false" },
      description: "Enable the new recommendation engine",
      valueType: "BOOLEAN"
    },

    // Feature flag for payment processor
    payment_processor: {
      defaultValue: { value: "stripe" },
      description: "Active payment processor (stripe or braintree)",
      valueType: "STRING"
    },

    // Percentage rollout for new search algorithm
    new_search_rollout_percentage: {
      defaultValue: { value: "0" },
      description: "Percentage of users getting the new search (0-100)",
      valueType: "NUMBER"
    },

    // Feature flag for maintenance mode
    maintenance_mode: {
      defaultValue: { value: "false" },
      description: "Enable maintenance mode for API",
      valueType: "BOOLEAN"
    }
  };

  // Publish the updated template
  await remoteConfig.publishTemplate(template);
  console.log("Feature flags published successfully");
}

setupFeatureFlags();
```

## Reading Remote Config in Cloud Functions

The Admin SDK lets you fetch Remote Config values from within Cloud Functions. Here is the core pattern.

This Cloud Function reads feature flags and adjusts its behavior accordingly:

```typescript
// functions/src/index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Cache the remote config template to avoid fetching on every invocation
let cachedTemplate: admin.remoteConfig.RemoteConfigTemplate | null = null;
let templateLastFetched = 0;
const CACHE_TTL_MS = 60000; // Refresh every 60 seconds

async function getFeatureFlags(): Promise<Record<string, string>> {
  const now = Date.now();

  // Refresh the cache if it is stale
  if (!cachedTemplate || now - templateLastFetched > CACHE_TTL_MS) {
    const remoteConfig = admin.remoteConfig();
    cachedTemplate = await remoteConfig.getTemplate();
    templateLastFetched = now;
  }

  // Extract parameter default values into a simple key-value map
  const flags: Record<string, string> = {};
  const params = cachedTemplate.parameters || {};

  for (const [key, param] of Object.entries(params)) {
    if (param.defaultValue && "value" in param.defaultValue) {
      flags[key] = param.defaultValue.value;
    }
  }

  return flags;
}

// Helper to check a boolean flag
async function isFeatureEnabled(flagName: string): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[flagName] === "true";
}

// Helper to get a string flag value
async function getFeatureValue(flagName: string): Promise<string | undefined> {
  const flags = await getFeatureFlags();
  return flags[flagName];
}
```

## Using Feature Flags in API Endpoints

Now use these helpers in your actual Cloud Functions.

This example shows an API endpoint that switches behavior based on feature flags:

```typescript
// functions/src/api.ts
export const getRecommendations = functions.https.onRequest(async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    // Check if the new recommendation engine is enabled
    const useNewEngine = await isFeatureEnabled("new_recommendation_engine");

    let recommendations;
    if (useNewEngine) {
      // New engine with ML-based recommendations
      recommendations = await getMLRecommendations(userId);
      console.log("Using new ML recommendation engine");
    } else {
      // Legacy collaborative filtering
      recommendations = await getLegacyRecommendations(userId);
      console.log("Using legacy recommendation engine");
    }

    res.json({ recommendations, engine: useNewEngine ? "ml" : "legacy" });
  } catch (error) {
    console.error("Recommendation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

## Implementing Percentage-Based Rollouts

For gradual rollouts, use the numeric flag to determine what percentage of requests should use the new feature.

This function uses a hash-based approach for consistent assignment:

```typescript
// functions/src/rollout.ts
import * as crypto from "crypto";

function getUserBucket(userId: string): number {
  // Create a deterministic hash so the same user always gets
  // the same bucket (consistent experience across requests)
  const hash = crypto.createHash("md5").update(userId).digest("hex");
  // Take the first 8 hex chars and convert to a number between 0-99
  const numericHash = parseInt(hash.substring(0, 8), 16);
  return numericHash % 100;
}

async function isInRollout(userId: string, flagName: string): Promise<boolean> {
  const flags = await getFeatureFlags();
  const percentage = parseInt(flags[flagName] || "0", 10);
  const userBucket = getUserBucket(userId);
  return userBucket < percentage;
}

// Usage in a Cloud Function
export const search = functions.https.onRequest(async (req, res) => {
  const userId = req.query.userId as string;
  const query = req.query.q as string;

  // Check if this user is in the rollout for the new search
  const useNewSearch = await isInRollout(userId, "new_search_rollout_percentage");

  const results = useNewSearch
    ? await newSearchAlgorithm(query)
    : await legacySearch(query);

  res.json({
    results,
    searchVersion: useNewSearch ? "v2" : "v1"
  });
});
```

## Maintenance Mode Pattern

A particularly useful pattern is a maintenance mode flag that can instantly put your API into read-only or offline mode.

This middleware checks for maintenance mode before processing any request:

```typescript
// functions/src/middleware.ts
async function maintenanceCheck(
  req: functions.https.Request,
  res: functions.Response
): Promise<boolean> {
  const inMaintenance = await isFeatureEnabled("maintenance_mode");

  if (inMaintenance) {
    res.status(503).json({
      error: "Service temporarily unavailable",
      message: "We are performing scheduled maintenance. Please try again later.",
      retryAfter: 300
    });
    return true; // Request was handled (blocked)
  }

  return false; // Continue processing
}

// Apply it to your endpoints
export const api = functions.https.onRequest(async (req, res) => {
  // Check maintenance mode first
  if (await maintenanceCheck(req, res)) return;

  // Normal request handling continues here
  res.json({ status: "ok" });
});
```

## Listening for Config Changes

You can trigger a Cloud Function whenever Remote Config is updated. This is useful for logging, cache invalidation, or notifying your team.

This function fires whenever someone publishes a Remote Config change:

```typescript
// functions/src/config-listener.ts
export const onRemoteConfigUpdate = functions.remoteConfig.onUpdate(
  async (versionMetadata) => {
    console.log("Remote Config updated:", {
      versionNumber: versionMetadata.versionNumber,
      updateType: versionMetadata.updateType,
      updateOrigin: versionMetadata.updateOrigin,
      updateUser: versionMetadata.updateUser?.email || "unknown",
      updateTime: versionMetadata.updateTime
    });

    // Invalidate the local cache
    cachedTemplate = null;
    templateLastFetched = 0;

    // Optionally send a Slack notification
    // await sendSlackNotification(versionMetadata);
  }
);
```

## Conditional Config with Server Conditions

Remote Config supports conditions, which let you serve different values based on criteria. While conditions are primarily designed for client-side segmentation, you can use them creatively on the server.

This setup creates conditions in the Remote Config template:

```javascript
// setup-conditions.js
async function setupWithConditions() {
  const remoteConfig = admin.remoteConfig();
  const template = await remoteConfig.getTemplate();

  // Add conditions based on app version or custom signals
  template.conditions = [
    {
      name: "beta_users",
      expression: "app.userProperty['beta_tester'] == 'true'",
      tagColor: "BLUE"
    }
  ];

  // Apply conditional values to parameters
  template.parameters.new_recommendation_engine = {
    defaultValue: { value: "false" },
    conditionalValues: {
      beta_users: { value: "true" }
    },
    description: "Enable new recommendation engine",
    valueType: "BOOLEAN"
  };

  await remoteConfig.publishTemplate(template);
}
```

## Deploying and Testing

Deploy your functions and test the feature flag behavior:

```bash
# Deploy the Cloud Functions
firebase deploy --only functions

# Test with the flag disabled (default)
curl https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/getRecommendations?userId=test123

# Enable the flag in Firebase Console, then test again
curl https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/getRecommendations?userId=test123
```

## Summary

Using Firebase Remote Config for server-side feature flags gives you instant control over your backend behavior without redeployments. The pattern is simple - fetch the template, cache it, and check flag values before branching your logic. Add percentage-based rollouts for gradual releases, a maintenance mode flag for emergencies, and a config change listener for audit logging. This setup works particularly well when you already use Remote Config on the client side, since you get a single dashboard for all your feature flags across the entire stack.
