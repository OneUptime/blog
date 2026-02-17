# How to Migrate AWS Elastic Beanstalk Applications to Google App Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Elastic Beanstalk, Migration, PaaS

Description: Migrate your AWS Elastic Beanstalk applications to Google App Engine with practical steps for configuration translation, deployment, and traffic management.

---

Elastic Beanstalk and App Engine are both platform-as-a-service offerings that let you deploy applications without managing infrastructure directly. They share the same philosophy but differ in implementation. Beanstalk gives you more control over the underlying EC2 instances, while App Engine is more opinionated but handles more of the operational burden.

In this post, I will walk through migrating a Beanstalk application to App Engine, covering configuration translation, deployment setup, and the parts that always cause trouble during migration.

## Understanding the Mapping

Here is how Elastic Beanstalk concepts map to App Engine:

| Elastic Beanstalk | App Engine |
|-------------------|-----------|
| Environment | Service + Version |
| Application | Project |
| .ebextensions | app.yaml |
| Environment Variables | app.yaml env_variables |
| Load Balancer | Built-in (automatic) |
| Auto Scaling | Automatic / Basic scaling |
| Worker Environment | Cloud Tasks + Service |
| Platform Branch | Runtime |
| Saved Configuration | app.yaml in version control |
| Blue/Green Deployment | Traffic splitting |

## Translating the Configuration

A typical Beanstalk configuration in .ebextensions looks like this:

```yaml
# .ebextensions/01-environment.config (Elastic Beanstalk)
option_settings:
  aws:elasticbeanstalk:application:environment:
    DATABASE_URL: "postgres://user:pass@host:5432/db"
    REDIS_URL: "redis://cache.example.com:6379"
    SECRET_KEY: "my-secret-key"
    NODE_ENV: "production"

  aws:autoscaling:asg:
    MinSize: 2
    MaxSize: 10

  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health
    Port: 8080

  aws:elb:listener:443:
    ListenerProtocol: HTTPS
    InstancePort: 8080
```

The equivalent App Engine configuration:

```yaml
# app.yaml (App Engine)
runtime: nodejs20
service: default

# Instance configuration
instance_class: F2  # Roughly equivalent to t3.small

# Automatic scaling (equivalent to Beanstalk auto scaling)
automatic_scaling:
  min_instances: 2
  max_instances: 10
  target_cpu_utilization: 0.65
  target_throughput_utilization: 0.65
  min_pending_latency: automatic
  max_pending_latency: 30ms
  max_concurrent_requests: 50

# Environment variables
env_variables:
  NODE_ENV: "production"
  # Secrets should use Secret Manager, not env vars
  # DATABASE_URL and SECRET_KEY go in Secret Manager

# Health check configuration
liveness_check:
  path: "/health"
  check_interval_sec: 30
  timeout_sec: 4
  failure_threshold: 2
  success_threshold: 2

readiness_check:
  path: "/health"
  check_interval_sec: 5
  timeout_sec: 4
  failure_threshold: 2
  success_threshold: 2
  app_start_timeout_sec: 300

# Network settings
network:
  forwarded_ports:
    - "8080/tcp"

# VPC connector for private resources
vpc_access_connector:
  name: "projects/my-project/locations/us-central1/connectors/app-connector"
```

## Handling Different Application Types

### Python Flask/Django Application

Beanstalk Procfile:

```
# Procfile (Elastic Beanstalk)
web: gunicorn app:application --bind 0.0.0.0:8080
```

App Engine app.yaml for Python:

```yaml
# app.yaml for Python
runtime: python311
service: default

entrypoint: gunicorn -b :$PORT app:application

automatic_scaling:
  min_instances: 1
  max_instances: 10

env_variables:
  PYTHON_ENV: "production"

# Handlers for static files
handlers:
  - url: /static
    static_dir: static/
    secure: always

  - url: /.*
    script: auto
    secure: always
```

requirements.txt stays the same between both platforms.

### Node.js Application

Beanstalk uses package.json start script:

```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

App Engine also uses package.json, but you might need to specify the entrypoint:

```yaml
# app.yaml for Node.js
runtime: nodejs20
service: default

# App Engine uses the "start" script from package.json by default
# Or specify explicitly:
entrypoint: node server.js

automatic_scaling:
  min_instances: 1
  max_instances: 10
```

### Java Application

```yaml
# app.yaml for Java
runtime: java17
service: default

entrypoint: java -jar target/app.jar --server.port=$PORT

automatic_scaling:
  min_instances: 2
  max_instances: 10

# Java apps need more memory
instance_class: F4  # 1GB RAM
```

## Migrating Worker Environments

Beanstalk Worker environments process messages from SQS. On GCP, use Cloud Tasks with a separate App Engine service:

```yaml
# worker.yaml (App Engine worker service)
runtime: python311
service: worker

# Basic scaling for worker (processes tasks, not HTTP traffic)
basic_scaling:
  max_instances: 5
  idle_timeout: 5m

env_variables:
  SERVICE_TYPE: "worker"
```

Set up Cloud Tasks to send work to the worker service:

```python
# task_sender.py
# Send tasks to the App Engine worker service
from google.cloud import tasks_v2
import json

def create_task(project_id, queue_name, payload):
    """Create a Cloud Task targeting the App Engine worker."""
    client = tasks_v2.CloudTasksClient()
    parent = client.queue_path(project_id, 'us-central1', queue_name)

    task = {
        'app_engine_http_request': {
            'http_method': tasks_v2.HttpMethod.POST,
            'relative_uri': '/process',
            'app_engine_routing': {
                'service': 'worker',
            },
            'headers': {
                'Content-Type': 'application/json',
            },
            'body': json.dumps(payload).encode(),
        }
    }

    response = client.create_task(
        request={'parent': parent, 'task': task}
    )
    return response.name
```

## Handling Secrets

Beanstalk uses environment variables for secrets. App Engine should use Secret Manager:

```python
# config.py
# Load configuration from environment and Secret Manager
import os
from google.cloud import secretmanager

def get_secret(secret_id):
    """Load a secret from Google Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    project = os.environ.get('GOOGLE_CLOUD_PROJECT')
    name = f"projects/{project}/secrets/{secret_id}/versions/latest"

    try:
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        # Fall back to environment variable for local development
        env_key = secret_id.upper().replace('-', '_')
        return os.environ.get(env_key, '')


# Usage
DATABASE_URL = get_secret('database-url')
SECRET_KEY = get_secret('secret-key')
REDIS_URL = get_secret('redis-url')
```

## Deployment Pipeline

Replace your Beanstalk deployment with App Engine deployment in Cloud Build:

```yaml
# cloudbuild.yaml
# Deploy to App Engine (replaces eb deploy)
steps:
  # Run tests
  - name: 'python:3.11'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        pip install -r requirements.txt
        python -m pytest tests/

  # Deploy to App Engine
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'app'
      - 'deploy'
      - 'app.yaml'
      - '--project=${PROJECT_ID}'
      - '--version=${SHORT_SHA}'
      - '--no-promote'  # Deploy without routing traffic

  # Run smoke tests against the new version
  - name: 'python:3.11'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        pip install requests
        python smoke_tests.py \
          "https://${SHORT_SHA}-dot-${PROJECT_ID}.appspot.com"

  # Promote traffic to the new version
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'app'
      - 'services'
      - 'set-traffic'
      - 'default'
      - '--splits=${SHORT_SHA}=1'
      - '--project=${PROJECT_ID}'
```

## Traffic Management

App Engine has built-in traffic splitting, which is more flexible than Beanstalk's blue/green deployments:

```bash
# Deploy new version without routing traffic
gcloud app deploy --no-promote --version=v2

# Split traffic 50/50 between old and new versions
gcloud app services set-traffic default \
  --splits v1=0.5,v2=0.5

# Gradually shift to the new version
gcloud app services set-traffic default \
  --splits v1=0.1,v2=0.9

# Complete the migration
gcloud app services set-traffic default \
  --splits v2=1

# Clean up old versions
gcloud app versions delete v1
```

## Monitoring and Logging

App Engine integrates with Cloud Logging and Cloud Monitoring automatically. Set up alerts:

```hcl
# monitoring.tf
# App Engine monitoring equivalent to Beanstalk health monitoring

resource "google_monitoring_alert_policy" "app_engine_errors" {
  display_name = "App Engine High Error Rate"
  project      = var.project_id

  conditions {
    display_name = "5xx error rate above 1%"
    condition_threshold {
      filter = <<-EOT
        resource.type = "gae_app"
        AND metric.type = "appengine.googleapis.com/http/server/response_count"
        AND metric.labels.response_code >= 500
      EOT
      comparison      = "COMPARISON_GT"
      threshold_value = 0.01
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = var.notification_channels
}

resource "google_monitoring_alert_policy" "app_engine_latency" {
  display_name = "App Engine High Latency"
  project      = var.project_id

  conditions {
    display_name = "P99 latency above 2 seconds"
    condition_threshold {
      filter = <<-EOT
        resource.type = "gae_app"
        AND metric.type = "appengine.googleapis.com/http/server/response_latencies"
      EOT
      comparison      = "COMPARISON_GT"
      threshold_value = 2000
      duration        = "300s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_99"
        cross_series_reducer = "REDUCE_MEAN"
      }
    }
  }

  notification_channels = var.notification_channels
}
```

## Gotchas to Watch For

A few things that commonly trip people up during this migration:

1. **Port binding** - App Engine requires your app to listen on the PORT environment variable, not a hardcoded port. Make sure your app reads `process.env.PORT` or `os.environ.get('PORT', '8080')`.

2. **File system** - App Engine's file system is read-only (except /tmp). If your Beanstalk app writes to the local file system, you need to switch to Cloud Storage.

3. **WebSockets** - App Engine Flex supports WebSockets, but Standard does not. If your app uses WebSockets, use the Flexible environment.

4. **Background threads** - App Engine Standard does not support long-running background threads. Use Cloud Tasks or Pub/Sub for background processing.

5. **Cold starts** - App Engine Standard has cold starts when scaling from zero. Set min_instances to at least 1 for production services.

## Wrapping Up

Migrating from Elastic Beanstalk to App Engine is mostly about translating configuration files and updating how your application handles secrets and file storage. The application code itself usually needs minimal changes. Start with a non-production environment, get the app.yaml configuration right, test the deployment pipeline, and then gradually migrate production traffic. App Engine's built-in traffic splitting makes the cutover much safer than Beanstalk's approach since you can route a small percentage of traffic to the new platform and verify everything works before committing fully.
