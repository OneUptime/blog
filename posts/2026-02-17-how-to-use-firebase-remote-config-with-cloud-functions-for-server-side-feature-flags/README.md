# Use Firebase Remote Config with Cloud Functions for Server-Side Feature Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Firebase, GCP, Remote Config, Cloud Function, Feature Flag

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

Start by defining your server-side parameters in the Firebase Console. Go to Remote Config, choose Server from the Client/Server selector, and create parameters for your feature flags.

For a server template, the parameters look like this:

```json
{
  "parameters": {
    "new_recommendation_engine": {
      "defaultValue": { "value": "false" },
      "description": "Enable the new recommendation engine",
      "valueType": "BOOLEAN"
    },
    "payment_processor": {
      "defaultValue": { "value": "stripe" },
      "description": "Active payment processor (stripe or braintree)",
      "valueType": "STRING"
    },
    "new_search_rollout_percentage": {
      "defaultValue": { "value": "0" },
      "description": "Percentage of users getting the new search (0-100)",
      "valueType": "NUMBER"
    },
    "maintenance_mode": {
      "defaultValue": { "value": "false" },
      "description": "Enable maintenance mode for API",
      "valueType": "BOOLEAN"
    }
  }
}
```

## Reading Remote Config in Cloud Functions

The Admin Node.js SDK lets you fetch server-side Remote Config values from within Cloud Functions. Server-side Remote Config is available in the Admin Node.js SDK v12.1.0 and later. Here is the core pattern.

This Cloud Function reads feature flags and adjusts its behavior accordingly:

```typescript
// functions/src/index.ts
import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import {
  getRemoteConfig,
  ServerConfig,
  ServerTemplate
} from "firebase-admin/remote-config";

const app = initializeApp();

// Cache the remote config template to avoid fetching on every invocation
let cachedTemplate: ServerTemplate | null = null;
let templateLastFetched = 0;
const CACHE_TTL_MS = 60000; // Refresh every 60 seconds

async function getServerConfig(): Promise<ServerConfig> {
  const now = Date.now();

  // Refresh the cache if it is stale
  if (!cachedTemplate || now - templateLastFetched > CACHE_TTL_MS) {
    const remoteConfig = getRemoteConfig(app);
    cachedTemplate = await remoteConfig.getServerTemplate({
      defaultConfig: {
        new_recommendation_engine: false,
        payment_processor: "stripe",
        new_search_rollout_percentage: 0,
        maintenance_mode: false
      }
    });
    templateLastFetched = now;
  }

  return cachedTemplate.evaluate();
}

// Helper to check a boolean flag
async function isFeatureEnabled(flagName: string): Promise<boolean> {
  const config = await getServerConfig();
  return config.getBoolean(flagName);
}

// Helper to get a string flag value
async function getFeatureValue(flagName: string): Promise<string> {
  const config = await getServerConfig();
  return config.getString(flagName);
}

// Helper to get a numeric flag value
async function getFeatureNumber(flagName: string): Promise<number> {
  const config = await getServerConfig();
  return config.getNumber(flagName);
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
  const percentage = await getFeatureNumber(flagName);
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
import { Response } from "express";

async function maintenanceCheck(
  req: functions.https.Request,
  res: Response
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

You can trigger a Cloud Function whenever Remote Config is updated. This is useful for logging, clearing a shared cache, or notifying your team.

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

    // Invalidate a shared cache here if you use one. Module-level
    // caches in other Cloud Functions instances still rely on their TTL.

    // Optionally send a Slack notification
    // await sendSlackNotification(versionMetadata);
  }
);
```

## Conditional Config with Server Conditions

Remote Config supports conditions, which let you serve different values based on criteria. For server-side Remote Config, conditions can use percentage rules and custom signals passed to `template.evaluate()`.

This setup shows a custom-signal condition in the server template:

```json
{
  "conditions": [
    {
      "name": "beta_users",
      "condition": {
        "customSignal": {
          "customSignalKey": "beta_tester",
          "customSignalOperator": "STRING_EXACTLY_MATCHES",
          "targetCustomSignalValues": ["true"]
        }
      }
    }
  ],
  "parameters": {
    "new_recommendation_engine": {
      "defaultValue": { "value": "false" },
      "conditionalValues": {
        "beta_users": { "value": "true" }
      },
      "description": "Enable new recommendation engine",
      "valueType": "BOOLEAN"
    }
  }
}
```

Then pass the custom signal when you evaluate the template:

```typescript
const config = cachedTemplate.evaluate({
  beta_tester: "true"
});
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

Using Firebase Remote Config for server-side feature flags gives you instant control over your backend behavior without redeployments. The pattern is simple - fetch the server template, cache it, evaluate it, and check flag values before branching your logic. Add percentage-based rollouts for gradual releases, a maintenance mode flag for emergencies, and a config change listener for audit logging. This setup works particularly well when you already use Remote Config on the client side, since you get a single dashboard for all your feature flags across the entire stack.
