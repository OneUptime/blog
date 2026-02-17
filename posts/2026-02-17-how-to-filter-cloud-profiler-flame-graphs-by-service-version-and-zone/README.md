# How to Filter Cloud Profiler Flame Graphs by Service Version and Zone

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Profiler, Flame Graphs, Filtering, Performance

Description: Learn how to use Cloud Profiler filters to isolate flame graphs by service version, zone, and other dimensions for targeted performance analysis.

---

When you run a service across multiple versions and zones, the aggregated flame graph in Cloud Profiler can be misleading. Version 2.1 might have a performance regression that is masked when averaged with the faster version 2.0. Or a service in us-east1 might behave differently from the same service in europe-west1 due to downstream latency differences.

Cloud Profiler lets you filter by service version, zone, and other dimensions to isolate specific slices of your profile data. This is how you do targeted performance analysis instead of looking at everything blended together.

## Setting Up Version and Zone Metadata

Before you can filter, you need to make sure your profiler configuration includes the right metadata.

### Configuring Service Version

The service version is set when you initialize the profiler. Use it to distinguish between deployments.

For Python:

```python
# Set version from environment variable or deployment metadata
import os
import googlecloudprofiler

version = os.environ.get('APP_VERSION', 'unknown')
# Or use the git commit hash
# version = os.environ.get('GIT_SHA', 'unknown')

googlecloudprofiler.start(
    service='my-service',
    service_version=version,
)
```

For Go:

```go
// Set version from build-time variable or environment
package main

import (
	"os"
	"cloud.google.com/go/profiler"
)

// Set at build time: go build -ldflags="-X main.Version=v2.1.0"
var Version = "dev"

func main() {
	version := os.Getenv("APP_VERSION")
	if version == "" {
		version = Version
	}

	profiler.Start(profiler.Config{
		Service:        "my-service",
		ServiceVersion: version,
	})
	// ... rest of application
}
```

For Java:

```dockerfile
# Pass version through environment variable
ENV APP_VERSION=1.0.0

ENTRYPOINT ["java", \
  "-agentpath:/opt/cprof/profiler_java_agent=-cprof_service=my-service,-cprof_service_version=${APP_VERSION}", \
  "-jar", "/app/app.jar"]
```

For Node.js:

```javascript
// Initialize with version from package.json or environment
const { start } = require('@google-cloud/profiler');

start({
  serviceContext: {
    service: 'my-service',
    version: process.env.APP_VERSION || require('./package.json').version,
  },
});
```

### Configuring Zone Metadata

Zone information is typically detected automatically when running on GCP. Cloud Profiler reads the GCE metadata server to determine the zone. However, you can verify this is working by checking the profiler labels in the Cloud Console.

If you are running outside GCP or need custom zone labels, you can set them through environment variables:

```bash
# Set zone manually if not detected automatically
export GOOGLE_CLOUD_ZONE=us-central1-a
```

## Filtering in the Cloud Console

Open **Profiler** in the Cloud Console. The filter bar at the top provides several dimensions.

### Filter by Service

The **Service** dropdown shows all services that have reported profiles. Select the service you want to analyze. Each unique `service` value in your profiler configuration creates a separate entry here.

### Filter by Version

The **Version** dropdown shows all versions that have reported profiles for the selected service. This is populated from the `service_version` field in your profiler configuration.

Use this to:
- View profiles for a specific deployment
- Compare two versions side by side

### Filter by Zone

The **Zone** filter lets you isolate profiles from a specific zone. This is useful when:
- A service behaves differently in different regions
- You want to compare latency patterns between zones
- A specific zone has performance issues

### Filter by Profile Type

Choose between:
- **CPU time**: Where CPU cycles are spent
- **Wall time**: Elapsed time including waits
- **Heap**: Currently live heap memory
- **Heap allocation**: Total bytes allocated
- **Goroutines**: (Go only) Active goroutine count
- **Contention**: (Go/Java) Mutex contention time

## Practical Filtering Scenarios

### Scenario 1: Comparing Two Deployment Versions

You deployed version 2.1.0 and want to check if it is faster than 2.0.0.

1. Select your service in Cloud Profiler
2. Choose version **2.1.0** from the Version dropdown
3. Set the time range to the last 24 hours
4. Click **Compare to**
5. Choose version **2.0.0** as the comparison baseline

The diff flame graph shows functions that got slower in red and faster in blue. This directly tells you whether your new code introduced regressions.

### Scenario 2: Investigating Zone-Specific Performance

Users in Europe report slower responses than users in the US. Your service runs in both us-central1 and europe-west1.

1. Select your service
2. Filter to zone **us-central1-a**
3. Note the flame graph shape and the dominant hotspots
4. Switch the zone filter to **europe-west1-b**
5. Compare the flame graphs

If the European deployment shows more time in network or I/O related functions, the issue is likely downstream dependency latency rather than your code.

### Scenario 3: Canary Deployment Analysis

You have deployed a canary version (v2.2.0-canary) alongside the stable version (v2.1.0).

```python
# Canary deployment sets a different version
import os

is_canary = os.environ.get('CANARY', 'false') == 'true'
version = '2.2.0-canary' if is_canary else '2.1.0'

googlecloudprofiler.start(
    service='my-service',
    service_version=version,
)
```

In Cloud Profiler, compare the canary version against the stable version to validate performance before rolling out to 100%.

## Using the Profiler API for Programmatic Filtering

For automated analysis, you can query profiles programmatically with filters.

```python
# query_profiles.py - Fetch filtered profiles via API
from google.cloud import profiler_v2


def list_profiles_for_version(project_id, service, version):
    """List profiles filtered by service version."""
    client = profiler_v2.ExportServiceClient()

    # List profiles with a filter
    request = profiler_v2.ListProfilesRequest(
        parent=f"projects/{project_id}",
    )

    profiles = client.list_profiles(request=request)

    # Filter by service and version (client-side for now)
    matching = []
    for profile in profiles:
        labels = profile.labels
        if (labels.get("service") == service and
            labels.get("version") == version):
            matching.append(profile)

    return matching


profiles = list_profiles_for_version(
    "your-project-id",
    "my-service",
    "2.1.0"
)
print(f"Found {len(profiles)} profiles for version 2.1.0")
```

## Organizing Your Version Strategy

A good versioning strategy makes Cloud Profiler filtering much more useful. Here are some approaches:

### Semantic Versioning

Use major.minor.patch for releases. This works well for services with distinct release cycles.

```
v2.0.0, v2.1.0, v2.1.1, v2.2.0
```

### Git SHA

Use the short git commit hash. This gives you the finest granularity and maps directly to code changes.

```
abc123f, def456a, ghi789b
```

### Timestamp-Based

Use the deployment timestamp. Useful when you deploy frequently and do not tag releases.

```
2026-02-17-1430, 2026-02-17-1545, 2026-02-18-0900
```

### Branch-Based

Include the branch name for pre-release environments.

```
main-abc123, feature-xyz-def456, staging-ghi789
```

The key is consistency. Pick a scheme and use it across all your services so you can always filter and compare.

## Multi-Service Version Tracking

When you have multiple services that deploy independently, track their versions together for meaningful analysis.

```yaml
# k8s/deployment.yaml - Set version from the image tag
spec:
  template:
    spec:
      containers:
        - name: app
          image: gcr.io/project/my-service:v2.1.0
          env:
            - name: APP_VERSION
              value: "v2.1.0"
```

In Cloud Profiler, you can open profiles for different services filtered to the same time period to see how they interact performance-wise.

## Wrapping Up

Filtering Cloud Profiler by version and zone transforms it from a general performance overview into a precise diagnostic tool. Set meaningful service versions on every deployment, let zone detection work automatically on GCP, and use the comparison feature to validate every release. The filtered view tells you exactly how a specific version in a specific location behaves, without noise from other deployments or regions.
