# How to Set Up Feature Flags for GCP Applications Using Firebase Remote Config and Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firebase Remote Config, Feature Flags, Cloud Run, Progressive Rollout

Description: Learn how to implement feature flags for your GCP applications using Firebase Remote Config with Cloud Run for controlled feature rollouts and A/B testing.

---

Deploying code and releasing features should be two separate activities. Feature flags let you deploy code to production without exposing new features to all users immediately. You can gradually roll out features to a percentage of users, target specific user segments, or instantly kill a feature that is causing problems - all without redeploying.

Firebase Remote Config is a solid choice for feature flags in GCP applications. It is free, integrates well with the GCP ecosystem, and supports server-side evaluation. In this post, I will show you how to wire it up with Cloud Run services for controlled feature releases.

## Why Firebase Remote Config for Feature Flags?

There are plenty of feature flag services out there - LaunchDarkly, Split, Unleash - but Firebase Remote Config has some advantages if you are already on GCP:

- No additional service to manage or pay for
- Integrates with Firebase Analytics for targeting
- Supports server-side evaluation (not just client-side)
- Changes take effect in real time without redeploys
- Conditions can target user segments, percentages, or custom attributes

## Step 1: Set Up Firebase in Your Project

If your GCP project does not already have Firebase enabled:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize Firebase for your GCP project
firebase login
firebase init --project=my-gcp-project
```

Then set up the Remote Config defaults in the Firebase console, or use the REST API:

```bash
# Set up initial feature flags using the Firebase Admin SDK
# This script creates the default feature flag configuration

curl -X PUT \
  "https://firebaseremoteconfig.googleapis.com/v1/projects/my-gcp-project/remoteConfig" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "feature_new_dashboard": {
        "defaultValue": { "value": "false" },
        "description": "Enable the new analytics dashboard"
      },
      "feature_batch_export": {
        "defaultValue": { "value": "false" },
        "description": "Enable bulk data export"
      },
      "feature_v2_api": {
        "defaultValue": { "value": "false" },
        "description": "Enable V2 API endpoints"
      },
      "max_upload_size_mb": {
        "defaultValue": { "value": "50" },
        "description": "Maximum file upload size in MB"
      }
    }
  }'
```

## Step 2: Add Conditional Rollouts

The real power of Remote Config is conditions. You can enable features for specific user percentages, regions, or custom attributes:

```bash
# Update Remote Config with conditions for gradual rollout
curl -X PUT \
  "https://firebaseremoteconfig.googleapis.com/v1/projects/my-gcp-project/remoteConfig" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -H "If-Match: *" \
  -d '{
    "conditions": [
      {
        "name": "beta_users",
        "expression": "app.userProperty[\"user_tier\"] == \"beta\"",
        "tagColor": "BLUE"
      },
      {
        "name": "ten_percent_rollout",
        "expression": "percent <= 10",
        "tagColor": "GREEN"
      },
      {
        "name": "fifty_percent_rollout",
        "expression": "percent <= 50",
        "tagColor": "ORANGE"
      }
    ],
    "parameters": {
      "feature_new_dashboard": {
        "defaultValue": { "value": "false" },
        "conditionalValues": {
          "beta_users": { "value": "true" },
          "ten_percent_rollout": { "value": "true" }
        },
        "description": "New dashboard - rolling out to 10%"
      },
      "feature_batch_export": {
        "defaultValue": { "value": "false" },
        "conditionalValues": {
          "fifty_percent_rollout": { "value": "true" }
        },
        "description": "Batch export - rolling out to 50%"
      }
    }
  }'
```

## Step 3: Integrate with Your Cloud Run Service

Install the Firebase Admin SDK and create a feature flag service:

```python
# feature_flags.py - Server-side feature flag evaluation
import firebase_admin
from firebase_admin import credentials, remote_config
import hashlib
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
# On Cloud Run, this uses the default service account automatically
firebase_admin.initialize_app()

# Cache the template to avoid fetching on every request
_template_cache = None
_cache_timestamp = 0
CACHE_TTL = 60  # Refresh cache every 60 seconds

def get_remote_config_template():
    """
    Fetch the Remote Config template with caching.
    Returns the server template for server-side evaluation.
    """
    global _template_cache, _cache_timestamp
    import time

    now = time.time()
    if _template_cache is None or (now - _cache_timestamp) > CACHE_TTL:
        try:
            _template_cache = remote_config.get_server_template()
            _cache_timestamp = now
            logger.info("Remote Config template refreshed")
        except Exception as e:
            logger.error(f"Failed to fetch Remote Config: {e}")
            if _template_cache is None:
                # Return defaults if we have never fetched successfully
                return None
    return _template_cache

def is_feature_enabled(feature_name, user_id=None, user_properties=None):
    """
    Check if a feature flag is enabled.
    Supports user-specific targeting based on user_id and properties.
    """
    template = get_remote_config_template()

    if template is None:
        # Remote Config unavailable, use safe defaults
        logger.warning(f"Remote Config unavailable, defaulting {feature_name} to False")
        return False

    try:
        # Create a server config with user context for targeting
        config = template.evaluate({
            'randomizationId': user_id or 'anonymous',
            'userProperties': user_properties or {}
        })

        value = config.get_string(feature_name)
        return value.lower() == 'true'
    except Exception as e:
        logger.error(f"Error evaluating feature flag {feature_name}: {e}")
        return False

def get_feature_value(feature_name, default_value, user_id=None):
    """
    Get a feature flag value (not just boolean).
    Useful for configuration values like limits and thresholds.
    """
    template = get_remote_config_template()

    if template is None:
        return default_value

    try:
        config = template.evaluate({
            'randomizationId': user_id or 'anonymous'
        })
        return config.get_string(feature_name)
    except Exception:
        return default_value
```

## Step 4: Use Feature Flags in Your API Routes

Here is how to use the feature flags in your Cloud Run application:

```python
# app.py - Cloud Run application with feature flags
from flask import Flask, jsonify, request, abort
from feature_flags import is_feature_enabled, get_feature_value

app = Flask(__name__)

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """
    Serve the dashboard data.
    Returns the new dashboard format if the feature flag is enabled.
    """
    user_id = request.headers.get('X-User-ID', 'anonymous')
    user_tier = request.headers.get('X-User-Tier', 'free')

    if is_feature_enabled('feature_new_dashboard', user_id=user_id,
                          user_properties={'user_tier': user_tier}):
        # New dashboard experience
        return jsonify({
            'version': 'v2',
            'widgets': get_new_dashboard_widgets(),
            'layout': 'grid'
        })
    else:
        # Existing dashboard
        return jsonify({
            'version': 'v1',
            'widgets': get_legacy_dashboard_widgets(),
            'layout': 'list'
        })

@app.route('/api/export', methods=['POST'])
def export_data():
    """Export endpoint that checks the batch export feature flag."""
    user_id = request.headers.get('X-User-ID', 'anonymous')

    if not is_feature_enabled('feature_batch_export', user_id=user_id):
        abort(404, description="This feature is not available yet")

    # Process the export request
    return jsonify({'status': 'export_started', 'job_id': 'export-123'})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload endpoint with configurable max size from Remote Config."""
    user_id = request.headers.get('X-User-ID', 'anonymous')

    # Get the max upload size from Remote Config
    max_size = int(get_feature_value('max_upload_size_mb', '50', user_id=user_id))

    file = request.files.get('file')
    if file and len(file.read()) > max_size * 1024 * 1024:
        abort(413, description=f"File exceeds {max_size}MB limit")

    file.seek(0)  # Reset file pointer after reading
    # Process upload
    return jsonify({'status': 'uploaded', 'max_size_mb': max_size})
```

## Step 5: Deploy to Cloud Run

Deploy the application with the necessary permissions:

```bash
# Grant the Cloud Run service account access to Firebase Remote Config
gcloud projects add-iam-policy-binding my-gcp-project \
  --member="serviceAccount:my-project-compute@developer.gserviceaccount.com" \
  --role="roles/firebaseremoteconfig.viewer"

# Deploy to Cloud Run
gcloud run deploy my-app \
  --image=gcr.io/my-project/my-app:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated
```

## Step 6: Implement a Feature Flag Dashboard

Build a simple admin endpoint to view and manage feature flags:

```python
# admin.py - Admin routes for feature flag management
@app.route('/admin/features', methods=['GET'])
def list_features():
    """List all feature flags and their current status."""
    # Only accessible to admin users
    if not verify_admin_token(request):
        abort(403)

    template = get_remote_config_template()
    if template is None:
        return jsonify({'error': 'Remote Config unavailable'}), 503

    flags = {}
    for param_name in ['feature_new_dashboard', 'feature_batch_export',
                       'feature_v2_api', 'max_upload_size_mb']:
        config = template.evaluate({'randomizationId': 'admin'})
        flags[param_name] = config.get_string(param_name)

    return jsonify({'features': flags})
```

## Monitoring Feature Flag Impact

Track metrics per feature flag to understand impact:

```python
# Add custom metrics for feature flag evaluation
from google.cloud import monitoring_v3
import time

metrics_client = monitoring_v3.MetricServiceClient()

def track_feature_flag(feature_name, enabled, user_id):
    """Track feature flag evaluations for monitoring."""
    series = monitoring_v3.TimeSeries()
    series.metric.type = f'custom.googleapis.com/feature_flag/{feature_name}'
    series.metric.labels['enabled'] = str(enabled).lower()
    series.resource.type = 'cloud_run_revision'

    point = monitoring_v3.Point()
    point.value.int64_value = 1
    now = time.time()
    point.interval.end_time.seconds = int(now)
    series.points = [point]

    metrics_client.create_time_series(
        request={
            'name': f'projects/{PROJECT_ID}',
            'time_series': [series]
        }
    )
```

## Wrapping Up

Firebase Remote Config gives you a free, low-friction way to add feature flags to your GCP applications. Combined with Cloud Run, you can deploy code frequently and control feature visibility independently through the Remote Config console or API. Conditional rollouts let you gradually expose features to increasing percentages of users, and you can instantly disable any feature that causes problems.

The most important practice is to keep feature flags short-lived. Once a feature is fully rolled out, remove the flag from your code. Stale flags add complexity and make the codebase harder to reason about.
