# How to Compare Profiles Across Time Periods in Cloud Profiler to Detect Regressions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Profiler, Performance Regression, Profiling, Monitoring

Description: Learn how to compare Cloud Profiler flame graphs across different time periods and service versions to detect performance regressions before they impact users.

---

Deploying a new version of your service and hoping it did not get slower is not a strategy. Cloud Profiler's comparison feature lets you put two profiles side by side and see exactly which functions got slower, faster, or stayed the same. This turns performance regression detection from guesswork into a data-driven process.

I use profile comparisons after every significant deployment. It takes about 2 minutes and has caught regressions that would have otherwise gone unnoticed for weeks.

## How Profile Comparison Works

Cloud Profiler aggregates many short profiles (collected continuously) into a single flame graph for a given time period. When you compare two time periods, it calculates the difference in CPU time (or wall time, or heap usage) for every function and highlights the changes.

Functions that consume more resources in the second period show up in a warm color (red/orange). Functions that consume fewer resources show up in a cool color (blue/green). Functions that stayed roughly the same appear neutral.

## Step 1: Compare Before and After a Deployment

Open **Profiler** in the Cloud Console and select your service. Then:

1. Set the time range to cover the period after your deployment
2. Click the **Compare to** dropdown
3. Select a time range covering the period before your deployment

Cloud Profiler will render a diff flame graph showing what changed.

### What to Look For

- **New red/orange bars**: Functions that got slower. These are potential regressions.
- **New bars that did not exist before**: New code paths introduced by the deployment.
- **Functions that disappeared**: Code paths that were removed or no longer triggered.
- **Shifted proportions**: A function that was 5% of CPU before but is now 15%.

## Step 2: Compare by Service Version

If you tag your deployments with different service versions (using the `service_version` parameter in the profiler configuration), you can compare versions directly.

For Python applications:

```python
# Set the version when initializing Cloud Profiler
import googlecloudprofiler

# Use the git commit hash or deployment tag as the version
import os
version = os.environ.get('APP_VERSION', 'unknown')

googlecloudprofiler.start(
    service='my-service',
    service_version=version,
    verbose=0,
)
```

For Java applications:

```dockerfile
# Pass the version as an environment variable to the profiler agent
ENTRYPOINT ["java", \
  "-agentpath:/opt/cprof/profiler_java_agent=-cprof_service=my-service,-cprof_service_version=${APP_VERSION}", \
  "-jar", "/app/app.jar"]
```

In your CI/CD pipeline, set the version based on your deployment identifier.

```bash
# In your deployment script
export APP_VERSION=$(git rev-parse --short HEAD)
gcloud app deploy --version=$APP_VERSION
```

Then in Cloud Profiler, you can filter by version and compare v1.2.3 against v1.2.4 directly.

## Step 3: Interpreting the Diff Flame Graph

The diff flame graph uses color intensity to show the magnitude of change. Here is how to read it:

### Case 1: A Single Function Gets Much Redder

This means one specific function is using significantly more CPU. Possible causes:
- The function now processes more data per call
- The function is called more frequently
- An optimization was accidentally removed
- A dependency was upgraded to a slower version

To investigate, check what changed in that function between versions.

### Case 2: Many Functions Get Slightly Redder

This usually indicates increased overall load rather than a specific regression. If your traffic increased between the two periods, the profile will show more total CPU usage across the board. Normalize by checking if the proportion changed, not just the absolute values.

### Case 3: One Function Gets Bluer While Another Gets Redder

This often means you refactored code - moving work from one function to another. The total might be similar, but the distribution shifted. This is not necessarily a regression.

### Case 4: New Function Appears in Red

A completely new hot function that did not exist before. This is often a new feature or code path that was introduced. Check whether the new function's CPU usage is reasonable for what it does.

## Automating Regression Detection

You can automate profile comparison using the Cloud Profiler API. Here is a script that fetches profiles for two time periods and compares them.

```python
# compare_profiles.py - Automated profile comparison
from google.cloud import profiler_v2
from datetime import datetime, timedelta


def get_profile_data(project_id, service, version, hours_back):
    """Fetch aggregated profile data for a service version."""
    client = profiler_v2.ProfilerServiceClient()

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=hours_back)

    # List profiles for the given service and version
    profiles = client.list_profiles(
        request={
            "parent": f"projects/{project_id}",
            "filter": f'service="{service}" AND version="{version}"',
        }
    )

    return list(profiles)


def compare_versions(project_id, service, old_version, new_version):
    """Compare CPU profiles between two versions."""
    print(f"Comparing {old_version} vs {new_version} for {service}")

    old_profiles = get_profile_data(project_id, service, old_version, 48)
    new_profiles = get_profile_data(project_id, service, new_version, 24)

    print(f"Old version profiles: {len(old_profiles)}")
    print(f"New version profiles: {len(new_profiles)}")

    # Note: Detailed profile analysis requires parsing the profile proto
    # For a quick check, compare the number and types of profiles collected
    if len(new_profiles) < len(old_profiles) * 0.5:
        print("WARNING: Significantly fewer profiles in new version")
        print("This might indicate startup issues or crashes")


compare_versions(
    "your-project-id",
    "my-service",
    "v1.2.3",
    "v1.2.4"
)
```

## Setting Up Alerts for CPU Regression

While Cloud Profiler does not have built-in alerting, you can create alerts based on CPU utilization metrics that act as proxies for profiling regressions.

```bash
# Alert when CPU utilization increases significantly after a deployment
gcloud monitoring policies create \
  --display-name="CPU Regression After Deploy" \
  --condition-display-name="CPU utilization spike" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/container/cpu/utilizations"' \
  --condition-threshold-value=0.8 \
  --condition-threshold-duration=600s \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-aggregation='{"alignmentPeriod":"300s","perSeriesAligner":"ALIGN_PERCENTILE_95"}'
```

## Comparison Workflow for Deployments

Here is the workflow I follow for every deployment:

1. **Before deploying**: Note the current service version in Cloud Profiler. Take a screenshot of the flame graph or bookmark the URL with the current time range.

2. **Deploy** with a new `service_version` value.

3. **Wait 15-20 minutes**: Cloud Profiler needs time to collect enough samples for a meaningful comparison.

4. **Compare**: Open Cloud Profiler, select the new version's time range, and compare against the pre-deployment period.

5. **Check the top 5 hottest functions**: Are any of them new or significantly wider than before?

6. **If regression found**: Either roll back or investigate the specific function that regressed.

## Long-Term Trend Analysis

Beyond deployment-specific comparisons, do monthly comparisons to catch gradual regressions:

- Compare this month's average profile against last month's
- Check if the same functions are still the hottest, or if new ones have appeared
- Track whether the overall profile shape is changing

Gradual regressions happen when:
- Data volume grows and algorithms that were fast with small data become slow
- Dependencies are updated and the new version is slower
- Technical debt accumulates in hot paths
- Logging or instrumentation adds up over time

## Practical Tips

1. **Compare equivalent traffic periods**: A Tuesday afternoon profile will differ from a Saturday morning profile just due to traffic patterns. Compare similar time windows.

2. **Use enough data**: A comparison based on 5 minutes of profiling data is unreliable. Use at least 1-2 hours of data for each period.

3. **Account for startup effects**: New deployments might show higher CPU during the first few minutes due to JIT compilation (Java) or module loading. Wait for the service to warm up before comparing.

4. **Check heap profiles too**: CPU regressions sometimes come from increased garbage collection due to higher memory allocation. Compare heap profiles alongside CPU profiles.

5. **Document baselines**: Keep a record of your "normal" profile shape for each service. This makes it easier to spot deviations even without a formal comparison.

## Wrapping Up

Profile comparison is the most reliable way to detect performance regressions. Unlike latency metrics, which can be affected by network conditions and load changes, profiles show you the actual code-level behavior. Make it part of your deployment checklist: deploy, wait for profiles, compare, and verify. The few minutes this takes can save you hours of debugging when a regression slips into production.
