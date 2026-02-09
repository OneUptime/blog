# How to Implement Feature Flag-Based Deployments in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Feature Flags, DevOps

Description: Learn how to decouple code deployment from feature release using feature flags in Kubernetes, enabling safer rollouts, instant rollback, and gradual feature exposure without infrastructure changes.

---

You deploy new code to production, and suddenly you need to disable a feature because it's causing problems. Your options are limited: roll back the entire deployment, or push a hotfix that removes the feature. Both take time and cause disruption.

Feature flags solve this by separating deployment from release. You deploy code with new features turned off, then enable them gradually or instantly disable them if problems arise.

## Why Feature Flags for Kubernetes

Traditional deployment strategies control what code runs on what infrastructure. Feature flags control what code actually executes within running containers. This gives you:

**Instant feature toggles**. Turn features on or off without redeploying.

**Gradual rollouts**. Enable features for 1% of users, then 10%, then 100%.

**Easy rollback**. Disable a problematic feature instantly without touching deployments.

**Testing in production**. Run new code in production with features disabled, then enable for internal users first.

**Targeted releases**. Enable features for specific users, regions, or customer segments.

## Architecture Overview

A feature flag system for Kubernetes typically includes:

- Feature flag service (LaunchDarkly, Unleash, or custom)
- ConfigMap or external config for flag definitions
- Application code that checks flags before executing features
- Optional sidecar for flag synchronization

Here's a basic setup:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-flags
  namespace: production
data:
  flags.json: |
    {
      "new-checkout-flow": {
        "enabled": false,
        "rollout": {
          "percentage": 0
        }
      },
      "enhanced-search": {
        "enabled": true,
        "rollout": {
          "percentage": 100
        }
      },
      "experimental-recommendation": {
        "enabled": true,
        "rollout": {
          "percentage": 10,
          "userGroups": ["beta-testers"]
        }
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: myregistry.io/web-app:v2.0.0
        env:
        - name: FEATURE_FLAGS_CONFIG
          value: /config/flags.json
        volumeMounts:
        - name: feature-flags
          mountPath: /config
      volumes:
      - name: feature-flags
        configMap:
          name: feature-flags
```

## Application Integration

Your application loads and evaluates feature flags:

```javascript
// feature-flags.js
const fs = require('fs');

class FeatureFlags {
  constructor(configPath) {
    this.flags = {};
    this.loadFlags(configPath);

    // Watch for config changes
    fs.watch(configPath, () => {
      this.loadFlags(configPath);
    });
  }

  loadFlags(configPath) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.flags = config;
    console.log('Feature flags reloaded');
  }

  isEnabled(flagName, context = {}) {
    const flag = this.flags[flagName];

    if (!flag || !flag.enabled) {
      return false;
    }

    // Check percentage rollout
    if (flag.rollout && flag.rollout.percentage < 100) {
      const userId = context.userId;
      if (!userId) return false;

      // Consistent hashing for same user
      const hash = this.hashUserId(userId);
      const bucket = hash % 100;

      if (bucket >= flag.rollout.percentage) {
        return false;
      }
    }

    // Check user groups
    if (flag.rollout && flag.rollout.userGroups) {
      const userGroup = context.userGroup;
      if (!userGroup || !flag.rollout.userGroups.includes(userGroup)) {
        return false;
      }
    }

    return true;
  }

  hashUserId(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

module.exports = FeatureFlags;
```

Use flags in your application:

```javascript
const FeatureFlags = require('./feature-flags');
const flags = new FeatureFlags(process.env.FEATURE_FLAGS_CONFIG);

app.post('/api/checkout', async (req, res) => {
  const userId = req.user.id;
  const userGroup = req.user.group;

  // Check if new checkout flow is enabled for this user
  if (flags.isEnabled('new-checkout-flow', { userId, userGroup })) {
    return newCheckoutFlow(req, res);
  } else {
    return legacyCheckoutFlow(req, res);
  }
});

app.get('/api/search', async (req, res) => {
  const userId = req.user.id;

  // Enhanced search feature
  if (flags.isEnabled('enhanced-search', { userId })) {
    return enhancedSearch(req, res);
  } else {
    return basicSearch(req, res);
  }
});
```

## Using External Feature Flag Services

Integrate with LaunchDarkly or similar services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: myregistry.io/web-app:v2.0.0
        env:
        - name: LAUNCHDARKLY_SDK_KEY
          valueFrom:
            secretKeyRef:
              name: launchdarkly-credentials
              key: sdk-key
        - name: FEATURE_FLAG_PROVIDER
          value: launchdarkly
```

Application code with LaunchDarkly:

```javascript
const LaunchDarkly = require('launchdarkly-node-server-sdk');

const ldClient = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY);

async function checkFeatureFlag(flagKey, user) {
  await ldClient.waitForInitialization();

  const userContext = {
    key: user.id,
    email: user.email,
    custom: {
      group: user.group,
      region: user.region
    }
  };

  return ldClient.variation(flagKey, userContext, false);
}

app.post('/api/checkout', async (req, res) => {
  const enabled = await checkFeatureFlag('new-checkout-flow', req.user);

  if (enabled) {
    return newCheckoutFlow(req, res);
  } else {
    return legacyCheckoutFlow(req, res);
  }
});
```

## Gradual Rollout Strategy

Start with flags disabled, then gradually increase exposure:

```bash
# Day 1: Deploy with flag disabled
kubectl apply -f deployment.yaml

# Day 2: Enable for internal users (via external flag service)
# or update ConfigMap
kubectl patch configmap feature-flags -p '
{
  "data": {
    "flags.json": "{\"new-checkout-flow\":{\"enabled\":true,\"rollout\":{\"percentage\":0,\"userGroups\":[\"internal\"]}}}"
  }
}'

# Day 3: Enable for 5% of users
kubectl patch configmap feature-flags -p '
{
  "data": {
    "flags.json": "{\"new-checkout-flow\":{\"enabled\":true,\"rollout\":{\"percentage\":5}}}"
  }
}'

# Day 4: Increase to 25%
# Day 5: Increase to 50%
# Day 6: Increase to 100%
```

With ConfigMap updates, you need to restart pods for changes to take effect (unless watching for changes).

## Sidecar Pattern for Flag Synchronization

Use a sidecar to keep flags synchronized without application restarts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      # Main application
      - name: app
        image: myregistry.io/web-app:v2.0.0
        env:
        - name: FEATURE_FLAGS_FILE
          value: /flags/current.json
        volumeMounts:
        - name: flags
          mountPath: /flags

      # Sidecar that syncs flags
      - name: flag-sync
        image: myregistry.io/flag-sync:latest
        env:
        - name: FLAG_SERVICE_URL
          value: http://flag-service.production
        - name: SYNC_INTERVAL
          value: "30"  # seconds
        - name: OUTPUT_FILE
          value: /flags/current.json
        volumeMounts:
        - name: flags
          mountPath: /flags

      volumes:
      - name: flags
        emptyDir: {}
```

The sidecar continuously fetches flags from a central service and writes them to a shared volume.

## Feature Flag Service

Deploy a centralized feature flag service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flag-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: flag-service
  template:
    metadata:
      labels:
        app: flag-service
    spec:
      containers:
      - name: service
        image: myregistry.io/flag-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: REDIS_URL
          value: redis://redis:6379
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
---
apiVersion: v1
kind: Service
metadata:
  name: flag-service
spec:
  selector:
    app: flag-service
  ports:
  - port: 80
    targetPort: 8080
```

This service provides an API for managing flags and serves flag configurations to applications.

## Monitoring Feature Flag Usage

Track which flags are being evaluated and their results:

```javascript
const promClient = require('prom-client');

const flagEvaluations = new promClient.Counter({
  name: 'feature_flag_evaluations_total',
  help: 'Total number of feature flag evaluations',
  labelNames: ['flag_name', 'enabled']
});

function isEnabled(flagName, context = {}) {
  const flag = flags[flagName];
  const enabled = evaluateFlag(flag, context);

  // Record metric
  flagEvaluations.inc({
    flag_name: flagName,
    enabled: enabled.toString()
  });

  return enabled;
}
```

Query in Prometheus:

```promql
# Percentage of users seeing each flag
rate(feature_flag_evaluations_total{enabled="true"}[5m])
  /
rate(feature_flag_evaluations_total[5m])
```

## Combining with Deployment Strategies

Use feature flags alongside canary deployments for extra safety:

```yaml
# Deploy new version with feature disabled
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server-v2
  labels:
    version: v2
spec:
  replicas: 2  # Small canary
  selector:
    matchLabels:
      app: api-server
      version: v2
  template:
    metadata:
      labels:
        app: api-server
        version: v2
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v2.0.0
        env:
        - name: NEW_FEATURE_ENABLED
          value: "false"  # Disabled initially
```

Then:
1. Deploy v2 with feature disabled (infrastructure-level canary)
2. Once stable, enable feature for internal users (feature flag)
3. Gradually increase feature flag percentage
4. If feature works well, promote v2 to 100% of infrastructure
5. Eventually remove feature flag and old code path

## Cleanup and Technical Debt

Feature flags create technical debt. Clean up old flags regularly:

```javascript
// Mark flags for removal
const flags = {
  "new-checkout-flow": {
    enabled: true,
    rollout: { percentage: 100 },
    // Flag is fully rolled out, can be removed
    deprecatedAt: "2026-01-15",
    removeAfter: "2026-03-01"
  }
};

// Automated check for deprecated flags
function checkDeprecatedFlags() {
  const now = new Date();

  Object.entries(flags).forEach(([name, flag]) => {
    if (flag.removeAfter && new Date(flag.removeAfter) < now) {
      console.warn(`Flag ${name} should be removed from code`);
    }
  });
}
```

Create a process for flag cleanup:
1. Flag is created with feature disabled
2. Gradually roll out to 100%
3. Mark as deprecated 30 days after 100%
4. Remove flag check from code after another 60 days
5. Remove flag configuration

## Best Practices

**Keep flag logic simple**. Complex flag evaluation is hard to debug and reason about.

**Default to safe values**. If flag evaluation fails, default to the stable behavior.

**Monitor flag states**. Track which flags are enabled and for how many users.

**Document flag purpose and timeline**. Each flag should have clear documentation:

```yaml
data:
  flags.json: |
    {
      "new-checkout-flow": {
        "enabled": true,
        "rollout": {"percentage": 25},
        "metadata": {
          "description": "New checkout flow with improved UX",
          "jira": "PROJ-1234",
          "createdAt": "2026-02-01",
          "owner": "checkout-team"
        }
      }
    }
```

**Use typed flag values**. Not just boolean, but strings, numbers, or JSON for configuration:

```javascript
const checkoutConfig = flags.getConfig('checkout-configuration', {
  userId: user.id
});

// Returns: { paymentMethods: ['card', 'paypal'], theme: 'modern' }
```

## Conclusion

Feature flags decouple deployment from release, giving you unprecedented control over when and how features reach users. Deploy code safely to production with features disabled, then enable them gradually while monitoring impact.

Start with simple boolean flags for major features, then expand to percentage-based rollouts and sophisticated targeting. Combine feature flags with deployment strategies for defense in depth: use canaries to validate infrastructure stability, then use feature flags to control feature exposure.

Remember to clean up flags regularly to avoid accumulating technical debt. Every flag should have a clear plan for eventual removal once it's fully rolled out.
