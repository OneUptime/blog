# How to Use Azure Cost Management APIs to Build Custom Cost Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Cost Management, API, Custom Dashboard, FinOps, Cost Optimization, Azure Cloud, REST API

Description: Learn how to use the Azure Cost Management APIs to programmatically retrieve cost data and build custom dashboards tailored to your organization's needs.

---

The built-in Azure Cost Management portal is decent for ad-hoc cost analysis, but it has limitations. You cannot embed it in your internal tools, customize the visualizations beyond what the portal offers, or combine cost data with business metrics from other systems. When you need a cost dashboard that fits your organization's specific workflow - maybe embedded in an internal portal, combined with deployment data, or presented differently for engineers vs. finance - you need the Cost Management APIs.

The APIs give you programmatic access to the same cost and usage data that powers the Azure Portal, letting you build exactly the dashboard you need.

## Available APIs

Azure Cost Management provides several REST APIs:

- **Query API**: Run ad-hoc cost queries with grouping and filtering (the most flexible)
- **Exports API**: Schedule recurring cost data exports to storage accounts
- **Budgets API**: Create and manage budgets programmatically
- **Forecast API**: Get cost forecasts based on historical patterns
- **Dimensions API**: List available dimensions (resource types, tags, etc.) for filtering
- **Price Sheet API**: Get pricing information for your agreement

For building dashboards, the Query API and Forecast API are the most useful.

## Step 1: Authentication

All Cost Management API calls require Azure AD authentication. Use a service principal or managed identity.

```bash
# Create a service principal for the cost dashboard application
az ad sp create-for-rbac \
  --name "cost-dashboard-app" \
  --role "Cost Management Reader" \
  --scopes "/subscriptions/<sub-id>"
```

Get an access token:

```bash
# Get an OAuth token for the Cost Management API
TOKEN=$(az account get-access-token \
  --resource https://management.azure.com/ \
  --query accessToken -o tsv)
```

For application code, use the appropriate Azure Identity library:

```python
# Python: Authenticate using Azure Identity
from azure.identity import DefaultAzureCredential
from azure.mgmt.costmanagement import CostManagementClient

credential = DefaultAzureCredential()
client = CostManagementClient(credential)
```

## Step 2: Query Cost Data

The Query API lets you retrieve cost data with flexible grouping and filtering. Here is a request that gets monthly costs grouped by service name:

```bash
# Query monthly costs grouped by service name
curl -X POST "https://management.azure.com/subscriptions/<sub-id>/providers/Microsoft.CostManagement/query?api-version=2023-03-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ActualCost",
    "timeframe": "MonthToDate",
    "dataset": {
      "granularity": "Daily",
      "aggregation": {
        "totalCost": {
          "name": "Cost",
          "function": "Sum"
        }
      },
      "grouping": [
        {
          "type": "Dimension",
          "name": "ServiceName"
        }
      ]
    }
  }'
```

The response contains rows of cost data with columns matching your aggregation and grouping configuration.

## Step 3: Build the Query Programmatically

Using the Python SDK makes complex queries more manageable:

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.costmanagement import CostManagementClient
from azure.mgmt.costmanagement.models import (
    QueryDefinition, QueryDataset, QueryTimePeriod,
    QueryAggregation, QueryGrouping, QueryFilter,
    QueryComparisonExpression
)
from datetime import datetime, timedelta

# Initialize the client
credential = DefaultAzureCredential()
client = CostManagementClient(credential)

# Define the subscription scope
scope = f"/subscriptions/<sub-id>"

# Build a query for department costs in the current month
query = QueryDefinition(
    type="ActualCost",
    timeframe="MonthToDate",
    dataset=QueryDataset(
        granularity="Daily",
        aggregation={
            "totalCost": QueryAggregation(
                name="Cost",
                function="Sum"
            )
        },
        grouping=[
            QueryGrouping(
                type="TagKey",
                name="Department"
            )
        ]
    )
)

# Execute the query
result = client.query.usage(scope=scope, parameters=query)

# Process results into a usable format
columns = [col.name for col in result.columns]
data = []
for row in result.rows:
    data.append(dict(zip(columns, row)))

# Print department costs
for entry in data:
    print(f"Date: {entry.get('UsageDate')}, "
          f"Department: {entry.get('Department')}, "
          f"Cost: ${entry.get('Cost', 0):.2f}")
```

## Step 4: Get Cost Forecasts

The Forecast API predicts future costs based on historical spending patterns:

```python
# Query for cost forecast
from azure.mgmt.costmanagement.models import ForecastDefinition, ForecastDataset

forecast_query = ForecastDefinition(
    type="ActualCost",
    timeframe="MonthToDate",
    dataset=ForecastDataset(
        granularity="Daily",
        aggregation={
            "totalCost": QueryAggregation(
                name="Cost",
                function="Sum"
            )
        }
    ),
    include_actual_cost=True,
    include_fresh_partial_cost=True
)

forecast_result = client.forecast.usage(
    scope=scope,
    parameters=forecast_query
)

# Process forecast results
for row in forecast_result.rows:
    date = row[0]
    cost = row[1]
    cost_type = row[2]  # 'Actual' or 'Forecast'
    print(f"{date}: ${cost:.2f} ({cost_type})")
```

## Step 5: Build a Flask Dashboard

Here is a minimal Flask application that serves a cost dashboard:

```python
from flask import Flask, render_template, jsonify
from azure.identity import DefaultAzureCredential
from azure.mgmt.costmanagement import CostManagementClient
from azure.mgmt.costmanagement.models import (
    QueryDefinition, QueryDataset, QueryAggregation, QueryGrouping
)
import json

app = Flask(__name__)

# Initialize the Cost Management client once
credential = DefaultAzureCredential()
cost_client = CostManagementClient(credential)
SCOPE = "/subscriptions/<sub-id>"


def get_department_costs():
    """Fetch current month costs grouped by department."""
    query = QueryDefinition(
        type="ActualCost",
        timeframe="MonthToDate",
        dataset=QueryDataset(
            granularity="None",
            aggregation={
                "totalCost": QueryAggregation(name="Cost", function="Sum")
            },
            grouping=[
                QueryGrouping(type="TagKey", name="Department")
            ]
        )
    )
    result = cost_client.query.usage(scope=SCOPE, parameters=query)
    columns = [col.name for col in result.columns]
    return [dict(zip(columns, row)) for row in result.rows]


def get_service_costs():
    """Fetch current month costs grouped by service."""
    query = QueryDefinition(
        type="ActualCost",
        timeframe="MonthToDate",
        dataset=QueryDataset(
            granularity="None",
            aggregation={
                "totalCost": QueryAggregation(name="Cost", function="Sum")
            },
            grouping=[
                QueryGrouping(type="Dimension", name="ServiceName")
            ]
        )
    )
    result = cost_client.query.usage(scope=SCOPE, parameters=query)
    columns = [col.name for col in result.columns]
    return [dict(zip(columns, row)) for row in result.rows]


@app.route('/')
def dashboard():
    """Serve the main dashboard page."""
    return render_template('dashboard.html')


@app.route('/api/department-costs')
def api_department_costs():
    """API endpoint for department cost data."""
    data = get_department_costs()
    return jsonify(data)


@app.route('/api/service-costs')
def api_service_costs():
    """API endpoint for service cost data."""
    data = get_service_costs()
    return jsonify(data)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

## Step 6: Add Caching

Cost data does not change frequently - it updates every few hours. Caching API responses reduces latency and avoids hitting rate limits.

```python
from functools import lru_cache
from datetime import datetime
import time

# Simple time-based cache that refreshes every hour
class CostCache:
    def __init__(self, ttl_seconds=3600):
        self._cache = {}
        self._ttl = ttl_seconds

    def get(self, key):
        """Return cached value if it exists and is not expired."""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self._ttl:
                return value
        return None

    def set(self, key, value):
        """Cache a value with the current timestamp."""
        self._cache[key] = (value, time.time())


cost_cache = CostCache(ttl_seconds=3600)  # Cache for 1 hour


def get_department_costs_cached():
    """Fetch department costs with caching."""
    cached = cost_cache.get('department_costs')
    if cached:
        return cached

    data = get_department_costs()
    cost_cache.set('department_costs', data)
    return data
```

## Step 7: Handle Pagination and Large Datasets

The Query API returns up to 1000 rows per request. For large datasets, you need to handle pagination:

```python
def query_all_costs(scope, query_definition):
    """Handle pagination for large cost queries."""
    all_rows = []
    result = cost_client.query.usage(scope=scope, parameters=query_definition)

    columns = [col.name for col in result.columns]
    all_rows.extend(result.rows)

    # Handle pagination with nextLink
    while result.next_link:
        # The next_link contains the full URL for the next page
        result = cost_client.query.usage_by_external_cloud_provider_type(
            external_cloud_provider_type="externalSubscriptions",
            external_cloud_provider_id=scope,
            parameters=query_definition
        )
        all_rows.extend(result.rows)

    return columns, all_rows
```

## Step 8: Combine with Other Data Sources

The real power of a custom dashboard is combining cost data with other metrics:

```python
def build_comprehensive_report():
    """Combine cost data with deployment and usage metrics."""
    # Get cost data from Azure Cost Management
    department_costs = get_department_costs()

    # Get deployment frequency from Azure DevOps or GitHub
    deployments = get_deployment_count()  # Your custom function

    # Get resource utilization from Azure Monitor
    utilization = get_resource_utilization()  # Your custom function

    # Combine into a single report
    report = []
    for dept in department_costs:
        dept_name = dept.get('Department', 'Untagged')
        report.append({
            'department': dept_name,
            'monthlyCost': dept.get('Cost', 0),
            'deployments': deployments.get(dept_name, 0),
            'avgCpuUtilization': utilization.get(dept_name, {}).get('cpu', 0),
            'costPerDeployment': (
                dept.get('Cost', 0) / max(deployments.get(dept_name, 1), 1)
            )
        })

    return report
```

## Rate Limits and Best Practices

The Cost Management APIs have rate limits:

- **Query API**: 30 requests per minute per scope
- **Exports API**: 20 requests per minute
- **Read operations**: 100 requests per minute

Best practices:

- Cache aggressively - cost data updates every few hours, not every minute
- Use the lowest granularity that meets your needs (monthly instead of daily when possible)
- Use exports for historical analysis and the Query API for current month data
- Batch requests by scope to stay within rate limits
- Handle 429 (Too Many Requests) responses with exponential backoff

```python
import time

def query_with_retry(scope, query, max_retries=3):
    """Query with automatic retry on rate limiting."""
    for attempt in range(max_retries):
        try:
            return cost_client.query.usage(scope=scope, parameters=query)
        except Exception as e:
            if '429' in str(e) and attempt < max_retries - 1:
                wait_time = 2 ** attempt * 10  # 10s, 20s, 40s
                print(f"Rate limited, waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise
```

## Summary

The Azure Cost Management APIs give you the flexibility to build cost dashboards that match your organization's specific needs. Start with the Query API for current cost data, add the Forecast API for projections, and combine with other data sources for a comprehensive view. Cache aggressively, handle pagination, and respect rate limits. The result is a cost dashboard that integrates with your existing tools and presents data in the format your stakeholders need.
