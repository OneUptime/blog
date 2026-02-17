# How to Deploy Elastic Agent on GCP for Unified Log and Metric Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Elastic Agent, Logging, Monitoring, Observability

Description: Learn how to deploy Elastic Agent on Google Cloud Platform to collect logs and metrics from your infrastructure in a unified way.

---

If you run workloads on Google Cloud and already use the Elastic Stack for observability, deploying Elastic Agent on your GCP instances is one of the most practical ways to get logs and metrics flowing into Elasticsearch. Instead of installing separate Filebeat and Metricbeat instances, Elastic Agent gives you a single binary that handles everything.

In this guide, I will walk through the full process of deploying Elastic Agent on GCP Compute Engine instances, configuring it with Fleet, and collecting both system-level metrics and application logs.

## Why Elastic Agent Over Individual Beats

Before Elastic Agent existed, you would install Filebeat for logs, Metricbeat for system metrics, maybe Packetbeat for network data, and so on. Each one had its own configuration file and lifecycle. Elastic Agent consolidates all of that into one process, managed centrally through Fleet in Kibana.

The advantages are straightforward:

- One agent to install and maintain per host
- Centralized policy management through Fleet
- Automatic updates and integration management
- Consistent configuration across your fleet

For GCP workloads specifically, this means you can deploy a single agent across all your Compute Engine instances and manage everything from one dashboard.

## Prerequisites

Before starting, make sure you have the following:

- A GCP project with Compute Engine instances running (Ubuntu 20.04+ or similar)
- An Elasticsearch deployment (Elastic Cloud or self-managed, version 8.x+)
- Kibana access with Fleet enabled
- SSH access to your GCP instances
- A service account with appropriate IAM roles if you plan to collect GCP-specific metrics

## Step 1: Set Up Fleet in Kibana

First, log into Kibana and navigate to Fleet under the Management section. If this is your first time, Fleet will prompt you to set up the Fleet Server. For a quick start, you can use the Elastic Cloud hosted Fleet Server.

Once Fleet is ready, you need to create an agent policy. This policy defines what data the agent collects.

Navigate to Fleet, then Agent Policies, and click Create agent policy. Give it a descriptive name like "GCP Compute Instances" and save it.

## Step 2: Add Integrations to the Policy

Click on your new policy and add integrations. At minimum, you want:

- **System** integration - collects CPU, memory, disk, network metrics, and system logs
- **Custom Logs** integration - if you have application-specific log files

To add the System integration, click "Add integration," search for "System," and click "Add System." The defaults are solid for most cases. It will collect syslog, auth logs, and the standard system metrics.

## Step 3: Get the Enrollment Token and Install the Agent

From the Fleet UI, click "Add agent" on your policy. Kibana will display the installation commands and your enrollment token.

SSH into your GCP Compute Engine instance and run the installation. Here is the process for a Debian/Ubuntu-based instance:

```bash
# Download the Elastic Agent package
curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.12.0-linux-x86_64.tar.gz

# Extract the archive
tar xzvf elastic-agent-8.12.0-linux-x86_64.tar.gz
cd elastic-agent-8.12.0-linux-x86_64

# Install and enroll the agent with your Fleet Server
# Replace the URL and token with your actual values from Kibana
sudo ./elastic-agent install \
  --url=https://your-fleet-server-url:8220 \
  --enrollment-token=YOUR_ENROLLMENT_TOKEN_HERE
```

The agent will install as a systemd service and start automatically. You should see it appear in Fleet within a minute or two.

## Step 4: Verify the Agent is Reporting

Back in Kibana, navigate to Fleet and check that your agent shows as "Healthy." Then head over to the Discover tab and look for data in the `metrics-*` and `logs-*` data streams.

You can also verify locally on the instance:

```bash
# Check the status of the Elastic Agent service
sudo systemctl status elastic-agent

# Check agent status using the built-in command
sudo elastic-agent status
```

## Step 5: Automate Deployment Across Multiple Instances

If you have many Compute Engine instances, you do not want to SSH into each one manually. Use a startup script in your instance template to automate this.

Here is a startup script you can attach to your instance template or use with `gcloud`:

```bash
#!/bin/bash
# Startup script for automatic Elastic Agent deployment on GCP instances

ELASTIC_AGENT_VERSION="8.12.0"
FLEET_URL="https://your-fleet-server-url:8220"
ENROLLMENT_TOKEN="YOUR_ENROLLMENT_TOKEN"

# Download and install Elastic Agent
cd /tmp
curl -L -O "https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${ELASTIC_AGENT_VERSION}-linux-x86_64.tar.gz"
tar xzvf "elastic-agent-${ELASTIC_AGENT_VERSION}-linux-x86_64.tar.gz"
cd "elastic-agent-${ELASTIC_AGENT_VERSION}-linux-x86_64"

# Install with automatic enrollment - the insecure flag skips certificate verification
# Remove --insecure in production and use proper CA certificates
sudo ./elastic-agent install \
  --url="${FLEET_URL}" \
  --enrollment-token="${ENROLLMENT_TOKEN}" \
  --insecure \
  -f
```

You can apply this startup script when creating instances with `gcloud`:

```bash
# Create a new instance with the Elastic Agent startup script
gcloud compute instances create my-instance \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --metadata-from-file=startup-script=elastic-agent-startup.sh \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud
```

## Step 6: Collect GCP-Specific Metrics

Beyond system metrics, you might want to collect GCP service metrics like Cloud SQL stats, GKE cluster metrics, or Pub/Sub throughput. Elastic has a dedicated GCP integration for this.

In Fleet, add the "Google Cloud Platform" integration to your policy. You will need to provide a service account key or configure Workload Identity.

Create a service account with the required permissions:

```bash
# Create a service account for Elastic Agent
gcloud iam service-accounts create elastic-agent-sa \
  --display-name="Elastic Agent Service Account"

# Grant the monitoring viewer role so it can read GCP metrics
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:elastic-agent-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/monitoring.viewer"

# Grant the logging viewer role for reading Cloud Logging
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:elastic-agent-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.viewer"

# Generate a key file
gcloud iam service-accounts keys create elastic-agent-key.json \
  --iam-account=elastic-agent-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

Upload this key to the GCP integration configuration in Fleet, and the agent will start pulling GCP platform metrics into Elasticsearch.

## Monitoring Your Fleet

Once everything is running, you can build dashboards in Kibana that combine system-level metrics from your instances with GCP platform metrics. The pre-built dashboards that come with the System and GCP integrations are a great starting point.

Some useful things to track:

- CPU and memory utilization per instance
- Disk I/O patterns across your fleet
- Log error rates by instance
- GCP quota usage and API latencies

## Troubleshooting Common Issues

If the agent does not appear in Fleet after installation, check these things:

1. Verify network connectivity from the instance to your Fleet Server URL on port 8220
2. Check that GCP firewall rules allow outbound HTTPS traffic
3. Look at the agent logs in `/opt/Elastic/Agent/data/elastic-agent-*/logs/`
4. Make sure the enrollment token has not expired

If metrics appear but logs do not, verify that the agent has read permissions on the log files it is trying to collect. Running as root (which is the default when installed via `sudo`) usually handles this.

## Wrapping Up

Deploying Elastic Agent on GCP gives you a clean, manageable way to collect all the observability data you need from your cloud infrastructure. The combination of centralized Fleet management with GCP-native integrations means you can go from zero visibility to full observability across your Compute Engine fleet in an afternoon. The key is automating the deployment through startup scripts so every new instance comes online already reporting to your Elastic cluster.
