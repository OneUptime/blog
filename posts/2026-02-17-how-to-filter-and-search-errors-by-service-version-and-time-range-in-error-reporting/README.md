# How to Filter and Search Errors by Service Version and Time Range

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Error Reporting, Error Search, Filtering, Debugging

Description: Learn how to filter and search errors in Google Cloud Error Reporting by service name, version, and time range to quickly isolate and debug production issues.

---

When your GCP project runs multiple services each with multiple versions deployed, finding the right errors in Cloud Error Reporting can feel like searching for a needle in a haystack. The dashboard shows every error across every service, and during an incident, scrolling through hundreds of error groups is not an option.

Error Reporting provides filtering capabilities that let you narrow down errors by service, version, and time range. Knowing how to use these filters effectively is the difference between a 5-minute diagnosis and a 2-hour wild goose chase.

## Understanding Service and Version Labels

Error Reporting organizes errors using two key labels: service name and service version. These come from the `serviceContext` in your error reports.

If you are using GCP services that integrate automatically with Error Reporting (like App Engine, Cloud Run, or Cloud Functions), some environment metadata is captured automatically. For best filtering, make sure your reported errors include the right service and version values:

- **App Engine**: Service name is the App Engine service name, version is the App Engine version
- **Cloud Run**: Use the Cloud Run service name and revision name when setting `serviceContext`
- **Cloud Functions**: Use the function name as the service name and set the version yourself
- **GKE/Compute Engine**: You set both service and version in your application code

For custom error reports, you set these when initializing the client:

```python
# Set the service name and version for proper filtering in Error Reporting

from google.cloud import error_reporting

client = error_reporting.Client(
    service='order-service',     # This becomes the service filter
    version='2.3.1'              # This becomes the version filter
)
```

## Filtering by Service in the Console

In the Cloud Error Reporting console, service filtering is part of the resource filter. Open the "All Resources" menu and select the affected resource.

For resources that expose service labels, such as Kubernetes Container Services, you can filter first by service and then by version. This is the first thing you should do when investigating an issue - narrow down to the affected service.

You can also bookmark filtered URLs. The resource filter is encoded in the URL, so you can create bookmarks for common error views for quick access.

## Filtering by Version

Where the selected resource exposes a version label, the version filter appears after you select the service. This is particularly useful when you are trying to determine if a new deployment introduced errors.

A common workflow during incident investigation:

1. Filter to the affected service
2. Switch the version filter between the current and previous versions
3. Compare error groups to identify which errors are new in the current version

If an error group only appears in the new version, that is a strong signal that the deployment caused it.

## Filtering by Time Range

Error Reporting offers several preset time ranges:

- Last hour
- Last 6 hours
- Last 24 hours
- Last 7 days
- Last 30 days

You can also set a custom time range using the time picker. During incident investigation, start with a narrow time range around when the issue was first reported, then expand if needed.

## Using the Error Reporting API for Filtered Queries

The console filters are useful for manual investigation, but the API gives you more precision and the ability to automate queries.

Here is how to query errors filtered by service, version, and time range using Python:

```python
# Query errors filtered by service, version, and time range
from google.cloud import errorreporting_v1beta1
from google.cloud.errorreporting_v1beta1 import types

def search_errors(project_id, service_name=None, version=None, hours_back=24):
    client = errorreporting_v1beta1.ErrorStatsServiceClient()
    project_name = f"projects/{project_id}"

    # Set the time range
    time_range = types.QueryTimeRange()
    if hours_back <= 1:
        time_range.period = types.QueryTimeRange.Period.PERIOD_1_HOUR
    elif hours_back <= 6:
        time_range.period = types.QueryTimeRange.Period.PERIOD_6_HOURS
    elif hours_back <= 24:
        time_range.period = types.QueryTimeRange.Period.PERIOD_1_DAY
    elif hours_back <= 168:
        time_range.period = types.QueryTimeRange.Period.PERIOD_1_WEEK
    else:
        time_range.period = types.QueryTimeRange.Period.PERIOD_30_DAYS

    # Build the service filter
    service_filter = types.ServiceContextFilter()
    if service_name:
        service_filter.service = service_name
    if version:
        service_filter.version = version

    # List error group stats with filters applied
    request = types.ListGroupStatsRequest(
        project_name=project_name,
        time_range=time_range,
        service_filter=service_filter,
        order=types.ErrorGroupOrder.LAST_SEEN_DESC
    )
    response = client.list_group_stats(request=request)

    for group_stats in response:
        print(f"Error: {group_stats.representative.message[:80]}")
        print(f"  Count: {group_stats.count}")
        print(f"  First seen: {group_stats.first_seen_time}")
        print(f"  Last seen: {group_stats.last_seen_time}")
        print(f"  Services: {group_stats.num_affected_services}")
        print("---")

# Search for errors in a specific service and version from the last 6 hours
search_errors(
    project_id="my-gcp-project",
    service_name="order-service",
    version="2.3.1",
    hours_back=6
)
```

## Comparing Errors Across Versions

One of the most valuable uses of version filtering is comparing error rates between versions after a deployment. Here is a script that does this:

```python
# Compare error counts between two versions of a service
from google.cloud import errorreporting_v1beta1
from google.cloud.errorreporting_v1beta1 import types

def compare_versions(project_id, service_name, old_version, new_version):
    client = errorreporting_v1beta1.ErrorStatsServiceClient()
    project_name = f"projects/{project_id}"

    time_range = types.QueryTimeRange(
        period=types.QueryTimeRange.Period.PERIOD_1_DAY
    )

    # Get errors for the old version
    old_filter = types.ServiceContextFilter(
        service=service_name,
        version=old_version
    )
    old_request = types.ListGroupStatsRequest(
        project_name=project_name,
        time_range=time_range,
        service_filter=old_filter
    )
    old_response = client.list_group_stats(request=old_request)
    old_errors = {gs.group.group_id: gs for gs in old_response}

    # Get errors for the new version
    new_filter = types.ServiceContextFilter(
        service=service_name,
        version=new_version
    )
    new_request = types.ListGroupStatsRequest(
        project_name=project_name,
        time_range=time_range,
        service_filter=new_filter
    )
    new_response = client.list_group_stats(request=new_request)
    new_errors = {gs.group.group_id: gs for gs in new_response}

    # Find errors that only appear in the new version
    new_only = set(new_errors.keys()) - set(old_errors.keys())
    if new_only:
        print(f"NEW errors in version {new_version}:")
        for group_id in new_only:
            gs = new_errors[group_id]
            print(f"  [{gs.count}x] {gs.representative.message[:80]}")
    else:
        print(f"No new error groups in version {new_version}")

    # Find errors with significantly higher counts in the new version
    print(f"\nErrors with increased frequency in {new_version}:")
    for group_id in set(new_errors.keys()) & set(old_errors.keys()):
        old_count = old_errors[group_id].count
        new_count = new_errors[group_id].count
        if new_count > old_count * 2:  # More than 2x increase
            print(f"  [{old_count} -> {new_count}] {new_errors[group_id].representative.message[:80]}")

compare_versions("my-gcp-project", "order-service", "2.3.0", "2.3.1")
```

## Searching Error Messages

Beyond filtering by service and version, you can search for specific error messages. In the console, use the search bar at the top of the Error Reporting page.

The search is a substring match, so you can search for:
- Exception class names like "NullPointerException"
- Specific function names from stack traces
- Error message fragments like "connection refused"
- Custom error prefixes you have defined

## Using gcloud for Quick Searches

Error Reporting does not have a `gcloud` command for listing error groups. For quick command-line checks, query the underlying log entries with Cloud Logging:

```bash
# List recent error logs for a specific serviceContext service
gcloud logging read \
  'severity>=ERROR AND jsonPayload.serviceContext.service="order-service"' \
  --project=my-gcp-project \
  --freshness=24h \
  --limit=10

# List recent error logs with a specific message pattern
gcloud logging read \
  'severity>=ERROR AND jsonPayload.serviceContext.service="order-service" AND jsonPayload.message:"connection refused"' \
  --project=my-gcp-project \
  --freshness=24h \
  --limit=20
```

## Building a Custom Error Search Dashboard

For teams that need a more customized error search experience, you can build one using Cloud Monitoring dashboards with error metrics:

```bash
# Create a log-based metric for error counting by service and version
cat > errors-by-service-version.yaml <<'EOF'
name: errors-by-service-version
description: Error count by service and version
filter: 'severity>=ERROR AND jsonPayload.serviceContext.service!=""'
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  labels:
  - key: service
    valueType: STRING
  - key: version
    valueType: STRING
labelExtractors:
  service: EXTRACT(jsonPayload.serviceContext.service)
  version: EXTRACT(jsonPayload.serviceContext.version)
EOF

gcloud logging metrics create errors-by-service-version \
  --config-from-file=errors-by-service-version.yaml \
  --project=my-gcp-project
```

You can then create dashboards in Cloud Monitoring that chart this metric broken down by service and version labels, giving you a visual overview of error trends across your entire system.

## Tips for Effective Error Searching

**Use consistent service naming.** If one team calls their service "order-svc" and another calls it "order-service," they will show up as separate services in Error Reporting. Establish naming conventions early.

**Include version in every deployment.** Automate version tagging so every deployment gets a unique version string. Use semantic versioning or git commit hashes - anything that lets you trace an error back to a specific code change.

**Bookmark common filter combinations.** If you are on call for a specific set of services, bookmark the Error Reporting URL with those services pre-filtered. It saves time during incidents.

**Start narrow, then expand.** During an incident, start with the most specific filters (exact service, version, and tight time range) and expand outward only if you do not find what you are looking for.

**Check adjacent time ranges.** If users report an issue at 3 PM, the actual error might have started at 2:45 PM. Always look at a window around the reported time, not just after it.

## Wrapping Up

Filtering and searching in Cloud Error Reporting transforms it from an overwhelming error dump into a precise diagnostic tool. By consistently labeling your services and versions, you enable fast filtering during incidents and meaningful comparisons across deployments. Make it a habit to check error trends after every deployment using version filters - catching regressions early is always cheaper than finding them from user complaints.
