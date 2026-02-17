# How to Use Grafana with Google Cloud Monitoring as a Data Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Grafana, Cloud Monitoring, Observability, Dashboards

Description: A hands-on guide to connecting Grafana with Google Cloud Monitoring as a data source for building custom dashboards with GCP metrics.

---

Grafana is the go-to dashboarding tool for many operations teams, and for good reason - it is flexible, open source, and supports dozens of data sources. If you are running infrastructure on GCP but prefer Grafana over the built-in Cloud Monitoring dashboards, you can connect Grafana directly to Google Cloud Monitoring and query your GCP metrics from within Grafana.

In this post, I will cover the full setup process, from authentication to building your first dashboard.

## Why Use Grafana with Cloud Monitoring?

You might wonder why you would use Grafana when Cloud Monitoring already has its own dashboards. Here are a few situations where Grafana makes sense:

- **Multi-cloud visibility**: If you run workloads on GCP, AWS, and on-premises, Grafana can pull metrics from all of them into a single dashboard.
- **Existing Grafana investment**: Your team already knows Grafana and has built workflows around it.
- **Advanced visualization**: Grafana offers some visualization options that Cloud Monitoring does not, like heatmaps, histograms, and custom panel plugins.
- **Alerting consolidation**: Grafana Alerting can trigger notifications from any data source, not just GCP metrics.

## Prerequisites

You will need:

- A Grafana instance (self-hosted or Grafana Cloud) running version 7.1 or later
- A GCP project with metrics flowing into Cloud Monitoring
- A GCP service account with the `roles/monitoring.viewer` role

## Step 1: Create a Service Account

Grafana needs a service account to authenticate with the Cloud Monitoring API. Create one with the minimum required permissions:

```bash
# Create a service account for Grafana
gcloud iam service-accounts create grafana-reader \
  --display-name="Grafana Cloud Monitoring Reader" \
  --project=my-project-id

# Grant the monitoring viewer role
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:grafana-reader@my-project-id.iam.gserviceaccount.com" \
  --role="roles/monitoring.viewer"

# Create and download a key file
gcloud iam service-accounts keys create grafana-sa-key.json \
  --iam-account=grafana-reader@my-project-id.iam.gserviceaccount.com
```

Keep the key file safe. You will upload it to Grafana in the next step.

## Step 2: Configure the Data Source in Grafana

1. Log into your Grafana instance
2. Navigate to **Configuration** > **Data Sources** > **Add data source**
3. Search for "Google Cloud Monitoring" and select it
4. Configure the following settings:

- **Name**: Give it a descriptive name like "GCP Production Monitoring"
- **Authentication Type**: Select "Service Account Key"
- **Service Account Key**: Paste the contents of your `grafana-sa-key.json` file

5. Click **Save & Test**

If the connection is successful, you will see a green "Successfully queried the Google Cloud Monitoring API" message.

### Using Workload Identity (GKE)

If Grafana is running on GKE, you can use Workload Identity instead of a key file, which is more secure:

```bash
# Bind the Kubernetes service account to the GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  grafana-reader@my-project-id.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project-id.svc.id.goog[grafana/grafana]"
```

Then annotate the Kubernetes service account:

```bash
# Annotate the Kubernetes service account for Workload Identity
kubectl annotate serviceaccount grafana \
  --namespace=grafana \
  iam.gke.io/gcp-service-account=grafana-reader@my-project-id.iam.gserviceaccount.com
```

In Grafana's data source configuration, select "GCE Default Service Account" as the authentication type instead.

## Step 3: Build Your First Dashboard

With the data source configured, you can start building dashboards. Let me walk through creating a basic Compute Engine monitoring dashboard.

### Querying Compute Engine CPU Utilization

1. Create a new dashboard and add a panel
2. Select your Google Cloud Monitoring data source
3. In the query editor, select:
   - **Service**: Compute Engine
   - **Metric**: `instance/cpu/utilization`
   - **Group By**: `instance_name`
   - **Aggregation**: Mean

The query editor provides a visual builder, but you can also switch to the raw MQL editor for more complex queries.

### Using MQL in Grafana

For advanced queries, switch to MQL mode in the query editor:

```
# Average CPU utilization per instance, sampled every minute
fetch gce_instance
| metric 'compute.googleapis.com/instance/cpu/utilization'
| group_by [resource.instance_id], [val: mean(value.utilization)]
| every 1m
```

MQL gives you access to the full power of Cloud Monitoring's query language.

### Querying Cloud SQL Metrics

Add another panel for Cloud SQL database monitoring:

- **Service**: Cloud SQL
- **Metric**: `database/cpu/utilization`
- **Group By**: `database_id`

Or in MQL:

```
# Cloud SQL CPU utilization per database instance
fetch cloudsql_database
| metric 'cloudsql.googleapis.com/database/cpu/utilization'
| group_by [database_id], [val: mean(value.utilization)]
| every 1m
```

### Querying GKE Metrics

For GKE cluster monitoring:

```
# GKE node CPU allocatable utilization
fetch k8s_node
| metric 'kubernetes.io/node/cpu/allocatable_utilization'
| group_by [node_name], [val: mean(value.allocatable_utilization)]
| every 1m
```

## Step 4: Set Up Variables for Dynamic Dashboards

Grafana variables make dashboards interactive. You can create dropdowns that filter metrics by project, region, or instance.

Here is how to create a project variable:

1. Go to **Dashboard Settings** > **Variables** > **Add variable**
2. Set the type to "Custom"
3. Enter your project IDs as comma-separated values
4. Use the variable in your queries with `$project`

For a more dynamic approach, you can use a query variable that pulls instance names from the API. In the variable configuration, set:

- **Type**: Query
- **Data Source**: Your GCP data source
- **Query Type**: Metric Labels
- **Service**: Compute Engine
- **Metric**: `instance/cpu/utilization`
- **Label**: `instance_name`

Now you can select specific instances from a dropdown on the dashboard.

## Step 5: Configure Grafana Alerts

Grafana can send alerts based on Cloud Monitoring data. Here is how to set up a basic alert:

1. Edit a panel that shows the metric you want to alert on
2. Go to the **Alert** tab
3. Click **Create alert rule from this panel**
4. Configure the conditions (for example, when average CPU is above 80 percent for 5 minutes)
5. Set the notification channel (email, Slack, PagerDuty, etc.)

Keep in mind that Grafana alerts evaluate on the Grafana server, so they depend on Grafana being up and running. For critical alerts, I recommend using Cloud Monitoring's native alerting as the primary system and Grafana alerts as a secondary or for cross-provider alerting.

## Dashboard Templates and Community Dashboards

The Grafana community has published several dashboards for GCP that you can import directly:

1. Go to **Dashboards** > **Import**
2. Search grafana.com for "Google Cloud Monitoring" dashboards
3. Import and customize to your needs

This saves time, especially for common setups like GCE instance monitoring or GKE cluster overviews.

## Performance Tips

When using Grafana with Cloud Monitoring, keep these performance considerations in mind:

- **Use appropriate time ranges**: Cloud Monitoring charges for API calls. Very wide time ranges with high resolution generate many API calls.
- **Aggregate early**: Use the aggregation options in the query editor to reduce the number of time series returned. Group by only the labels you need.
- **Cache settings**: Configure Grafana's data source caching to reduce repeated API calls. Set a reasonable minimum interval (60 seconds for most metrics).
- **Limit dashboard panels**: Each panel makes separate API calls. A dashboard with 30 panels querying Cloud Monitoring will be slower than one with 10 focused panels.

## Wrapping Up

Grafana and Google Cloud Monitoring work well together. The native data source plugin handles the authentication and API integration, so you can focus on building the dashboards that matter to your team. Whether you are consolidating multi-cloud monitoring into a single tool or leveraging Grafana's visualization capabilities, the setup is straightforward and the results are worth it.

Start with the service account, configure the data source, and build from there. Your existing Grafana skills translate directly.
