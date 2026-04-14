# How to Understand Dapr Alpha vs Beta vs Stable Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Feature, Stability, Alpha, Beta

Description: Learn how Dapr classifies runtime features into Alpha, Beta, and Stable tiers, how to enable pre-stable features, and what guarantees each tier provides.

---

Dapr runtime features - not just components - also go through a maturity lifecycle. Understanding which features are Alpha, Beta, or Stable helps you make informed decisions about what to rely on in production.

## Feature Stability Tiers

### Alpha Features

Alpha features are experimental and accessed via feature flags. They:

- Require explicit opt-in in a Dapr Configuration resource
- May change their API shape or behavior between releases
- Can be removed without a deprecation period
- Are useful for early adopters and feedback contributors

### Beta Features

Beta features are functionally complete and closer to graduation. They:

- Are enabled by default in newer runtime versions (sometimes)
- Have a defined API that may still have minor changes
- Are covered by a deprecation policy before removal
- Welcome production usage feedback

### Stable Features

Stable features are fully graduated and enabled by default. They:

- Have a stable API with backwards compatibility guarantees
- Are covered by Dapr's standard support policy
- Are safe for all production workloads

## Enabling Alpha Features

Create a Dapr Configuration to opt into alpha features:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: myconfig
  namespace: default
spec:
  features:
    - name: HotReload
      enabled: true
    - name: ActorStateTTL
      enabled: true
```

Reference the config in your pod annotations:

```yaml
annotations:
  dapr.io/app-id: "myapp"
  dapr.io/config: "myconfig"
```

For self-hosted mode, configure in `~/.dapr/config.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprConfig
spec:
  features:
    - name: HotReload
      enabled: true
```

## Checking Feature Status in Your Runtime

```bash
# List enabled features in running sidecar
curl http://localhost:3500/v1.0/metadata | jq '.enabledFeatures'
```

## Examples of Feature Tiers

| Feature | Tier | Notes |
|---------|------|-------|
| Service invocation | Stable | Default, no opt-in needed |
| Actor reminders | Stable | Default |
| Workflow API | Stable | Enabled by default since Dapr 1.12 |
| Actor State TTL | Alpha | Must enable via feature flag |
| Component hot reload | Alpha | Must enable via feature flag |

## Tracking Feature Progress

Monitor feature graduation in the Dapr roadmap and release notes:

```bash
# View recent changes to the features list
curl https://api.github.com/repos/dapr/dapr/releases/latest | jq '.body'
```

The Dapr docs mark each feature with its stability label. Search for "alpha" or "feature preview" to find experimental capabilities.

## Summary

Dapr runtime features follow an Alpha, Beta, Stable lifecycle similar to Kubernetes. Alpha features require opt-in via a Dapr Configuration resource's `features` array, while Stable features are always enabled. Review feature stability before depending on pre-stable features in production systems, and monitor release notes for graduation announcements.
