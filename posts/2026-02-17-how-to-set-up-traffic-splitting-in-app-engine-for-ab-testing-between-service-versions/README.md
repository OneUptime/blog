# How to Set Up Traffic Splitting in App Engine for A/B Testing Between Service Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Traffic Splitting, A/B Testing, Deployment, Canary Release

Description: Learn how to use App Engine traffic splitting to run A/B tests and canary deployments by routing percentages of traffic between different service versions.

---

Deploying a new version of your application is always a risk. No matter how well you tested it, production traffic has a way of exposing issues you never anticipated. Instead of deploying to 100% of users and hoping for the best, you can use App Engine's traffic splitting to gradually route traffic to the new version while keeping the old one running as a safety net.

Traffic splitting in App Engine lets you send a percentage of traffic to different versions of your service. You can use it for canary deployments (send 5% to the new version, watch for errors, then ramp up) or for A/B testing (send 50% to each version and compare metrics).

## Deploying Multiple Versions

First, you need two versions of your application deployed. When you deploy to App Engine, each deployment creates a new version.

Deploy version 1:

```bash
# Deploy the current stable version
gcloud app deploy app.yaml --version=v1 --no-promote
```

The `--no-promote` flag deploys the version without routing traffic to it. The `--version=v1` flag gives it an explicit version ID instead of a generated one.

Deploy version 2 with your changes:

```bash
# Deploy the new version without sending traffic to it
gcloud app deploy app.yaml --version=v2 --no-promote
```

Now you have two versions running but only the original is receiving traffic. Check the versions:

```bash
# List all versions and their traffic allocations
gcloud app versions list
```

## Setting Up Traffic Splitting

Split traffic between the two versions using the `gcloud app services set-traffic` command:

```bash
# Send 90% of traffic to v1 and 10% to v2
gcloud app services set-traffic default \
  --splits=v1=0.9,v2=0.1
```

This immediately starts routing 10% of traffic to v2. Users are randomly assigned to one version or the other.

To gradually increase traffic to the new version:

```bash
# Increase to 25% on v2
gcloud app services set-traffic default \
  --splits=v1=0.75,v2=0.25

# Increase to 50%
gcloud app services set-traffic default \
  --splits=v1=0.5,v2=0.5

# Go fully to v2 when confident
gcloud app services set-traffic default \
  --splits=v2=1.0
```

## Traffic Splitting Methods

App Engine supports three methods for splitting traffic, and the choice matters for A/B testing.

### IP Address Splitting (Default)

```bash
# Split by IP address - same user always sees same version
gcloud app services set-traffic default \
  --splits=v1=0.5,v2=0.5 \
  --split-by=ip
```

IP-based splitting sends all requests from the same IP address to the same version. This means a user has a consistent experience - they do not flip between versions on different page loads. However, users behind a corporate NAT or proxy will all see the same version.

### Cookie-Based Splitting

```bash
# Split by cookie - most consistent per-user experience
gcloud app services set-traffic default \
  --splits=v1=0.5,v2=0.5 \
  --split-by=cookie
```

Cookie-based splitting uses the `GOOGAPPUID` cookie to ensure each user consistently sees the same version. This is the best option for A/B testing because it provides per-user consistency regardless of IP address changes.

### Random Splitting

```bash
# Split randomly - each request independently routed
gcloud app services set-traffic default \
  --splits=v1=0.5,v2=0.5 \
  --split-by=random
```

Random splitting routes each request independently. A single user might see v1 on one page load and v2 on the next. This is good for stateless APIs but bad for A/B testing web applications where user experience consistency matters.

## Setting Up a Proper A/B Test

For a real A/B test, you need to track which version each user sees and measure the outcomes. Here is how to set it up.

First, deploy both versions with tracking code:

```python
# main.py - Version A (the control)
import os
from flask import Flask, request

app = Flask(__name__)

@app.route('/')
def index():
    # Include the version in analytics tracking
    version = os.environ.get('GAE_VERSION', 'unknown')
    return render_template('index.html',
        variant='A',
        version=version,
        # Pass variant info to analytics
        analytics_dimension='variant_a'
    )
```

```python
# main.py - Version B (the experiment)
import os
from flask import Flask, request

app = Flask(__name__)

@app.route('/')
def index():
    version = os.environ.get('GAE_VERSION', 'unknown')
    return render_template('index_b.html',
        variant='B',
        version=version,
        analytics_dimension='variant_b'
    )
```

Deploy both and set up cookie-based 50/50 splitting:

```bash
# Deploy both versions
gcloud app deploy app.yaml --version=variant-a --no-promote
gcloud app deploy app-b.yaml --version=variant-b --no-promote

# Split traffic 50/50 with cookie-based consistency
gcloud app services set-traffic default \
  --splits=variant-a=0.5,variant-b=0.5 \
  --split-by=cookie
```

## Canary Deployment Workflow

For canary deployments, the process is more gradual. Here is a script that automates the ramp-up:

```bash
#!/bin/bash
# canary-deploy.sh - Gradually ramp up traffic to a new version

NEW_VERSION="v2"
OLD_VERSION="v1"
SERVICE="default"

# Deploy the new version without traffic
echo "Deploying $NEW_VERSION..."
gcloud app deploy app.yaml --version=$NEW_VERSION --no-promote --quiet

# Stage 1: 5% canary
echo "Routing 5% traffic to $NEW_VERSION..."
gcloud app services set-traffic $SERVICE \
  --splits=$OLD_VERSION=0.95,$NEW_VERSION=0.05 --quiet

echo "Waiting 10 minutes to observe error rates..."
sleep 600

# Stage 2: 25%
echo "Routing 25% traffic to $NEW_VERSION..."
gcloud app services set-traffic $SERVICE \
  --splits=$OLD_VERSION=0.75,$NEW_VERSION=0.25 --quiet

echo "Waiting 10 minutes..."
sleep 600

# Stage 3: 50%
echo "Routing 50% traffic to $NEW_VERSION..."
gcloud app services set-traffic $SERVICE \
  --splits=$OLD_VERSION=0.50,$NEW_VERSION=0.50 --quiet

echo "Waiting 10 minutes..."
sleep 600

# Stage 4: 100%
echo "Routing 100% traffic to $NEW_VERSION..."
gcloud app services set-traffic $SERVICE \
  --splits=$NEW_VERSION=1.0 --quiet

echo "Canary deployment complete."
```

In practice, you would want to check error rates and latency between stages rather than just waiting. You can query Cloud Monitoring metrics programmatically:

```bash
# Check error rate for the new version
gcloud logging read \
  'resource.type="gae_app" AND resource.labels.version_id="v2" AND severity>=ERROR' \
  --limit=10 \
  --freshness=10m
```

## Monitoring the Split

While traffic is split, monitor both versions:

```bash
# Compare request latency between versions
gcloud logging read \
  'resource.type="gae_app" AND protoPayload.latency>"500ms"' \
  --format="table(resource.labels.version_id, protoPayload.latency, timestamp)" \
  --limit=20
```

In the Cloud Console, go to App Engine > Versions to see per-version metrics including request count, latency, and error rate.

## Rolling Back

If the new version is causing problems, route all traffic back to the old version immediately:

```bash
# Emergency rollback - send all traffic to the stable version
gcloud app services set-traffic default --splits=v1=1.0
```

This takes effect within seconds. The new version keeps running but receives no traffic. You can investigate and fix issues at your leisure.

## Splitting Traffic for Multiple Services

If your App Engine application has multiple services, you can split traffic independently for each:

```bash
# Split traffic for the API service
gcloud app services set-traffic api \
  --splits=v1=0.9,v2=0.1

# Split traffic for the web frontend
gcloud app services set-traffic default \
  --splits=v1=0.95,v2=0.05
```

## Cleaning Up Old Versions

After confirming the new version is stable, delete old versions to avoid paying for idle instances:

```bash
# Stop and delete the old version
gcloud app versions delete v1 --service=default
```

Or keep it around for a few days as a quick rollback option, then clean up.

Traffic splitting is one of App Engine's underappreciated features. It gives you a safe, built-in mechanism for testing changes in production without going all-in. Whether you are running a formal A/B test or just being cautious with a deployment, splitting traffic lets you validate with real users while keeping risk under control.
