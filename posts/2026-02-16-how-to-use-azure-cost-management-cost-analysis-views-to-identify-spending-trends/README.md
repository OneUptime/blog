# How to Use Azure Cost Management Cost Analysis Views to Identify Spending Trends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Cost Management, Cost Analysis, Spending Trends, Cloud FinOps, Cost Optimization, Azure Billing

Description: A practical guide to using Azure Cost Management cost analysis views to identify spending trends, anomalies, and optimization opportunities in your Azure environment.

---

Azure Cost Management cost analysis is the primary tool for understanding where your money goes. It gives you interactive charts and tables that break down spending by service, resource group, tag, region, and virtually any other dimension. The problem is that most people open cost analysis, glance at the total, and leave. The real value comes from building custom views that answer specific questions and saving them for repeated use.

This post walks through the built-in views, how to create custom views for common scenarios, and how to use cost analysis to identify actionable spending trends.

## Accessing Cost Analysis

1. Go to **Cost Management + Billing** in the Azure portal.
2. Select a scope (management group, subscription, or resource group).
3. Click **Cost analysis** in the left menu.

You will see the default accumulated cost view showing a running total for the current billing period.

## Built-In Views

Cost analysis comes with several pre-built views that cover the most common analysis scenarios:

### Accumulated Costs

The default view. Shows cumulative spending over the selected period. Useful for tracking total spend against budget.

### Cost by Resource

Breaks down spending by individual resource. This is where you find specific resources driving unexpected costs - a forgotten VM, a storage account with excessive transactions, or an over-provisioned database.

### Cost by Service

Groups spending by Azure service (Compute, Storage, Networking, etc.). Useful for understanding which service categories consume the most budget.

### Daily Costs

Shows spending per day instead of accumulated. Better for spotting sudden spikes or changes in spending patterns.

### Invoice Details

Shows cost data that aligns with your actual invoice, including any credits, adjustments, or marketplace charges.

## Creating Custom Views

The built-in views are starting points. Custom views let you answer specific business questions.

### View 1: Spending by Environment

If you tag resources with an Environment tag (production, staging, development), you can see costs per environment.

1. In cost analysis, change the **Group by** dropdown to **Tag**.
2. Select the **Environment** tag.
3. You will see spending broken out by tag value.
4. Click **Save** and name it "Spending by Environment".

### View 2: Month-over-Month Comparison

1. Set the date range to the last 3 months.
2. Change the **Granularity** to **Monthly**.
3. Set **Group by** to **Service name**.
4. This shows you which services are growing month over month.
5. Save as "Monthly Service Trends".

### View 3: Top 10 Expensive Resources

1. Switch to the **Cost by resource** view.
2. Set the date range to the current month.
3. Sort by cost descending.
4. The table at the bottom shows individual resources ranked by cost.
5. Save as "Top Expensive Resources".

### View 4: Cost by Team (Using Tags)

1. Set **Group by** to **Tag: CostCenter** (or whatever tag your organization uses for team allocation).
2. This gives you a per-team cost breakdown.
3. Save as "Cost by Team".

## Using Filters Effectively

Filters narrow the data to specific subsets. Common filter combinations:

```
Filter: Service name = "Virtual Machines"
Group by: Resource group name
Granularity: Daily
```

This shows you daily VM costs per resource group - useful for spotting resource groups where VM costs are growing.

```
Filter: Tag:Environment = "Development"
Group by: Service name
Granularity: Monthly
```

This shows how dev environment costs are distributed across services and whether they are growing.

```
Filter: Resource group name = "rg-data"
Group by: Meter subcategory
Granularity: Daily
```

This drills into a specific resource group and shows costs at the meter level - useful for understanding exactly what is driving costs within a group.

## Identifying Spending Trends

Here are specific patterns to look for when analyzing costs.

### Sudden Spikes

Switch to the **Daily costs** view and look for days with abnormally high spending. Common causes:

- A new resource was deployed (intentional or accidental).
- A batch job ran longer than expected.
- A DDoS attack increased network egress.
- A misconfigured auto-scale rule spun up too many instances.

Click on the spike day to drill into which resources or services caused it.

### Gradual Growth

Look at the monthly trend over 6-12 months. Is total spending growing faster than your business? Common causes:

- More environments being created without corresponding cleanup.
- Log and monitoring data volume increasing.
- Storage growing without lifecycle policies.
- Nobody right-sizing resources after the initial deployment.

### Service Mix Changes

Compare the service distribution this month versus last month. If a new service category appears or an existing one jumps significantly, investigate. For example, a sudden increase in "Azure Cognitive Services" charges might indicate a new feature consuming API calls you did not budget for.

### Weekend and Off-Hours Costs

Filter to show only weekends (use date range filters) and compare to weekday spending. If weekend costs are close to weekday costs, you might have resources running 24/7 that only need to run during business hours.

## Sharing Views

Once you build useful views, share them with your team.

### Pin to Dashboard

1. From any cost analysis view, click **Pin to dashboard**.
2. Select an existing dashboard or create a new one.
3. The chart appears as a tile on the Azure dashboard.

### Share as a Link

1. Click the **Share** button.
2. Copy the URL.
3. Anyone with access to the scope can open the link and see the same view.

### Export to Excel

1. Click **Download** at the top of the cost analysis page.
2. Select the format (CSV or Excel).
3. The download includes the current view's data with all filters applied.

## Building a Cost Review Workflow

The most effective way to use cost analysis is to build it into a regular review cadence.

### Daily Quick Check (2 Minutes)

Open the Daily Costs view for the current subscription. Look for any anomalies in yesterday's spending. If something looks off, drill in. If not, move on.

### Weekly Review (15 Minutes)

1. Open the Month-to-Date accumulated view.
2. Compare spending to your budget (is it tracking above or below the forecast line?).
3. Check the Top Expensive Resources view for any surprises.
4. Review any budget alerts that fired during the week.

### Monthly Deep Dive (1 Hour)

1. Open the Monthly Service Trends view.
2. Compare this month to the previous 3 months.
3. Identify the top 3 growing cost categories.
4. For each growing category, drill into the resources and determine if the growth is justified.
5. Cross-reference with Azure Advisor cost recommendations.
6. Document findings and assign optimization tasks.

## Advanced Analysis with Custom Groupings

Cost analysis supports multiple levels of grouping and filtering that enable sophisticated analysis.

### Grouping by Meter

Meters are the most granular level of Azure billing. Grouping by meter shows you exactly what you are paying for - not just "Virtual Machines" but "D4s v5 VM - US East - Compute Hours".

1. Set **Group by** to **Meter**.
2. This reveals specific line items that might be surprising, like high data transfer charges or premium storage transactions.

### Grouping by Publisher

If you use Azure Marketplace resources (third-party software), grouping by publisher shows how much you are spending on Microsoft services versus third-party solutions.

### Using Multiple Group-Bys

You can use nested groupings by setting a primary and secondary group-by. For example:

- Primary: Service name
- Secondary: Resource group

This shows services broken down by which resource group is consuming them, giving you a two-dimensional view of your spending.

## Forecast Feature

Cost analysis includes a built-in forecast that projects your spending for the rest of the current period based on historical patterns. The forecast line appears on the accumulated cost chart as a dotted line.

If the forecast exceeds your budget, you have a visual cue that action is needed before the period ends. This is more nuanced than budget alerts because you can see the trajectory and understand whether the overage is a temporary spike or a sustained trend.

## Programmatic Access

For automated reporting, you can access cost data through the Cost Management API.

```bash
# Query costs for the current month grouped by service
az costmanagement query \
  --type ActualCost \
  --scope "/subscriptions/<sub-id>" \
  --timeframe MonthToDate \
  --dataset-grouping name="ServiceName" type="Dimension" \
  -o table
```

This returns the same data you see in the portal views, but in a format you can pipe into scripts, databases, or reporting tools.

## Wrapping Up

Cost analysis views are the core of financial visibility in Azure. The built-in views cover common scenarios, but the real power comes from creating custom views tailored to your organization's structure - by environment, team, service, or any combination. Build these views once, save them, pin them to dashboards, and review them regularly. The pattern of daily quick checks, weekly reviews, and monthly deep dives catches cost issues before they become expensive surprises. Combine cost analysis with budget alerts and Advisor recommendations for a complete FinOps practice.
