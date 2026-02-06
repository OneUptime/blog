# How to Use Honeycomb Markers with OpenTelemetry to Annotate Deployments on Trace Visualizations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Honeycomb, Markers, Deployment Annotations

Description: Create Honeycomb markers from your CI/CD pipeline to annotate deployment events on trace visualizations for faster incident correlation.

Honeycomb Markers let you annotate your trace visualizations with deployment events. When you see a latency spike in Honeycomb, a marker shows you exactly when a deploy happened, making it trivial to correlate performance changes with code changes. While Markers use the Honeycomb API (not OTLP), you can integrate them into OpenTelemetry workflows.

## What Are Honeycomb Markers?

Markers are vertical lines on Honeycomb's time-series graphs. They show when something happened, such as a deployment, a config change, or a feature flag toggle. Each marker has a type, a message, and an optional URL linking back to the deployment details.

## Creating Markers from CI/CD

The most common approach is to create a marker when your CI/CD pipeline deploys a new version:

```bash
# Create a deployment marker via the Honeycomb API
curl -X POST "https://api.honeycomb.io/1/markers/${HONEYCOMB_DATASET}" \
  -H "X-Honeycomb-Team: ${HONEYCOMB_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Deploy ${SERVICE_NAME} v${VERSION}\",
    \"type\": \"deploy\",
    \"url\": \"${CI_PIPELINE_URL}\"
  }"
```

## Python Script for Deployment Markers

Here is a more robust Python script you can call from your deployment pipeline:

```python
import requests
import os
import json
from datetime import datetime

class HoneycombMarkerClient:
    def __init__(self, api_key, dataset):
        self.api_key = api_key
        self.dataset = dataset
        self.base_url = f"https://api.honeycomb.io/1/markers/{dataset}"
        self.headers = {
            "X-Honeycomb-Team": api_key,
            "Content-Type": "application/json",
        }

    def create_marker(self, message, marker_type="deploy", url=None,
                      start_time=None, end_time=None):
        """Create a marker on the Honeycomb timeline."""
        payload = {
            "message": message,
            "type": marker_type,
        }

        if url:
            payload["url"] = url
        if start_time:
            payload["start_time"] = int(start_time)
        if end_time:
            payload["end_time"] = int(end_time)

        response = requests.post(
            self.base_url,
            headers=self.headers,
            json=payload,
        )
        response.raise_for_status()
        return response.json()


def create_deploy_marker():
    """Create a deployment marker with metadata from environment."""
    client = HoneycombMarkerClient(
        api_key=os.environ["HONEYCOMB_API_KEY"],
        dataset=os.environ.get("HONEYCOMB_DATASET", "production"),
    )

    service_name = os.environ.get("SERVICE_NAME", "unknown")
    version = os.environ.get("VERSION", "unknown")
    commit_sha = os.environ.get("COMMIT_SHA", "unknown")
    deployer = os.environ.get("DEPLOYER", "ci-pipeline")
    pipeline_url = os.environ.get("CI_PIPELINE_URL", "")

    message = f"Deploy {service_name} {version} ({commit_sha[:8]}) by {deployer}"

    marker = client.create_marker(
        message=message,
        marker_type="deploy",
        url=pipeline_url,
    )

    print(f"Created Honeycomb marker: {marker}")
    return marker

if __name__ == "__main__":
    create_deploy_marker()
```

## Combining Markers with OpenTelemetry Spans

You can also create a deployment span in OpenTelemetry and a Honeycomb marker at the same time:

```python
from opentelemetry import trace
import time

tracer = trace.get_tracer("deployment")

def deploy_with_tracing_and_marker(service_name, version, deploy_fn):
    """Run a deployment with both an OTel span and a Honeycomb marker."""
    marker_client = HoneycombMarkerClient(
        api_key=os.environ["HONEYCOMB_API_KEY"],
        dataset=os.environ.get("HONEYCOMB_DATASET", "production"),
    )

    with tracer.start_as_current_span(
        "deployment",
        attributes={
            "deployment.service": service_name,
            "deployment.version": version,
            "deployment.start_time": datetime.utcnow().isoformat(),
        }
    ) as span:
        start_time = time.time()

        # Create the marker at the start of deployment
        marker_client.create_marker(
            message=f"Deploying {service_name} {version}",
            marker_type="deploy-start",
            start_time=start_time,
        )

        try:
            result = deploy_fn()
            span.set_attribute("deployment.status", "success")

            # Create a marker for successful completion
            marker_client.create_marker(
                message=f"Deployed {service_name} {version} successfully",
                marker_type="deploy",
                start_time=start_time,
                end_time=time.time(),
            )

            return result

        except Exception as e:
            span.set_attribute("deployment.status", "failed")
            span.record_exception(e)

            marker_client.create_marker(
                message=f"FAILED: Deploy {service_name} {version} - {str(e)}",
                marker_type="deploy-failed",
                start_time=start_time,
                end_time=time.time(),
            )
            raise
```

## GitHub Actions Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy and Mark
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy
        run: ./deploy.sh

      - name: Create Honeycomb Marker
        if: always()
        run: |
          STATUS="${{ job.status }}"
          MESSAGE="Deploy ${{ github.repository }} ${GITHUB_SHA::8} - ${STATUS}"

          curl -X POST "https://api.honeycomb.io/1/markers/${HONEYCOMB_DATASET}" \
            -H "X-Honeycomb-Team: ${{ secrets.HONEYCOMB_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"message\": \"${MESSAGE}\",
              \"type\": \"deploy\",
              \"url\": \"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"
            }"
        env:
          HONEYCOMB_DATASET: production
```

## Marker Types for Different Events

You can create different marker types for different events:

```python
# Deployment
marker_client.create_marker(
    message="Deploy api-service v2.3.1",
    marker_type="deploy",
)

# Feature flag change
marker_client.create_marker(
    message="Enabled feature: new-checkout-flow (50% rollout)",
    marker_type="feature-flag",
)

# Configuration change
marker_client.create_marker(
    message="Updated rate limit from 100/s to 200/s",
    marker_type="config-change",
)

# Incident
marker_client.create_marker(
    message="Incident #1234: Database connection pool exhaustion",
    marker_type="incident",
    url="https://pagerduty.com/incidents/1234",
)
```

Markers turn your Honeycomb graphs into a timeline of operational events. When something changes in your traces or metrics, you can immediately see if it correlates with a deployment, a config change, or a feature flag toggle. This one feature dramatically reduces mean time to detection for deployment-related issues.
