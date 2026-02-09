# How to Configure Kibana Canvas for Custom Log Reporting Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kibana, Canvas, Reporting, Dashboards, Visualization

Description: Create custom log reporting dashboards with Kibana Canvas using pixel-perfect layouts, dynamic data elements, custom expressions, and presentation-ready visualizations for executive reporting and stakeholder communication.

---

Kibana Canvas transforms log data into presentation-ready reports and dashboards with complete control over layout and styling. Unlike standard Kibana dashboards that arrange visualizations in a grid, Canvas provides a free-form design surface where you position elements precisely, add custom graphics, and create polished reports suitable for executive presentations or customer-facing displays.

## Understanding Canvas Capabilities

Canvas works with a workpad metaphor, similar to PowerPoint slides. Each workpad contains multiple pages, and each page holds elements like text, images, charts, and data tables. Elements connect to Elasticsearch data through expressions, a domain-specific language that queries, transforms, and visualizes data.

The real power comes from combining static design elements with live data. You can create a branded report template with your company logo, custom fonts, and specific color schemes, then populate it with real-time log metrics that update automatically. This bridges the gap between technical monitoring and business reporting.

Canvas excels at creating executive dashboards, customer-facing status pages, NOC displays, and periodic reports. The pixel-perfect layout control means your reports look identical whether displayed on a 4K monitor or printed to PDF.

## Creating Your First Canvas Workpad

Access Canvas through the Kibana menu. Click Create workpad to start with a blank canvas or choose from templates.

Set up the workpad properties:

```bash
# Click workpad settings (gear icon)
# Set name: "Weekly Log Report"
# Set dimensions: 1920x1080 (16:9 ratio for displays)
# Set background color: #FFFFFF
```

The dimensions matter for consistent rendering. Use 1920x1080 for screens, 1200x900 for tablets, or 2480x3508 for A4 printouts.

## Adding Static Elements

Build the report structure with static elements. Add a header with your organization's branding:

```bash
# Add image element for logo
# Click Add element > Image
# Upload logo file or paste image URL
# Position at top-left
# Set width: 200px, height: 80px

# Add title text
# Click Add element > Text
# Enter: "Application Log Summary"
# Set font: Arial, 36pt, bold
# Set color: #333333
# Position centered below logo
```

Add section headers to organize the report:

```bash
# Add text element
# Enter: "Error Rate Trends"
# Set font: Arial, 24pt, bold
# Set color: #666666
# Position at top of content area

# Add separator line using Shape element
# Select rectangle shape
# Set dimensions: 800x2
# Set color: #CCCCCC
```

These static elements create a professional layout framework that remains consistent across report updates.

## Connecting to Elasticsearch Data

Add dynamic elements that display live log data. Create a metric showing total error count:

```bash
# Click Add element > Metric
# In the expression editor, enter:
filters
| essql query="SELECT COUNT(*) as error_count FROM \"application-logs-*\" WHERE log.level='ERROR' AND @timestamp > NOW() - INTERVAL 7 DAYS"
| math "error_count"
| metric "Total Errors (7d)"
font={font size=48 family="Arial" color="#E74C3C" align="center"}

# Position the metric element in your layout
```

This expression queries Elasticsearch using SQL, extracts the count, and displays it as a large metric. The font configuration makes it prominent and attention-grabbing.

## Building Time Series Visualizations

Create a line chart showing error trends over time:

```bash
# Click Add element > Area chart
# Configure the data source expression:
filters
| essql
  query="SELECT DATE_HISTOGRAM(@timestamp, INTERVAL 1 DAY) as day, COUNT(*) as errors FROM \"application-logs-*\" WHERE log.level='ERROR' AND @timestamp > NOW() - INTERVAL 30 DAYS GROUP BY day"
| pointseries x="day" y="errors" color="#E74C3C"
| plot defaultStyle={seriesStyle lines=3 fill=0.3}
  legend=false
  xaxis={axisConfig position="bottom"}
  yaxis={axisConfig position="left"}

# Resize and position the chart
# Set dimensions: 800x300
```

This creates a 30-day error trend chart with custom styling. The fill parameter creates a subtle area chart effect.

## Creating Data Tables

Display detailed log information in tables:

```bash
# Click Add element > Data table
# Configure the expression:
filters
| essql
  query="SELECT @timestamp, service.name, message FROM \"application-logs-*\" WHERE log.level='ERROR' ORDER BY @timestamp DESC LIMIT 10"
| table
  font={font size=12 family="Arial"}
  paginate=true
  perPage=10
  showHeader=true

# Style the table
# Set alternating row colors for readability
```

Tables work well for showing recent errors, top error messages, or affected services.

## Using Markdown for Formatted Text

Add context and explanations using Markdown:

```bash
# Click Add element > Markdown
# Enter markdown content:
## Key Findings

This week's analysis reveals:

* **15% increase** in authentication errors
* **3 critical incidents** in production environment
* **92% reduction** in database timeout errors after optimization

### Recommendations

1. Review authentication service capacity
2. Implement additional monitoring for critical paths
3. Continue database optimization efforts

# Style the markdown element
# Set font size, colors, and padding as needed
```

Markdown elements bridge the gap between raw data and narrative reporting, providing context that helps stakeholders understand the numbers.

## Building Progress Bars and Gauges

Create visual indicators for SLO compliance:

```bash
# Add Progress element
# Configure expression:
filters
| essql
  query="SELECT (COUNT(*) FILTER (WHERE http.response.status_code < 500) * 100.0 / COUNT(*)) as success_rate FROM \"application-logs-*\" WHERE @timestamp > NOW() - INTERVAL 7 DAYS"
| progress shape="gauge"
  label="Availability SLO"
  font={font size=24 family="Arial"}
  valueColor="#27AE60"
  max=100

# Position below key metrics
```

Gauges provide immediate visual feedback on whether targets are being met. The color changes based on the value, making status clear at a glance.

## Creating Multi-Page Reports

Build comprehensive reports with multiple pages:

```bash
# Page 1: Executive Summary
# - High-level metrics
# - Overall health indicators
# - Week-over-week trends

# Page 2: Error Analysis
# - Error breakdown by service
# - Error rate trends
# - Top error messages

# Page 3: Performance Metrics
# - Response time percentiles
# - Throughput metrics
# - Resource utilization

# Page 4: Incidents and Resolution
# - Incident timeline
# - Resolution status
# - MTTR metrics
```

Add page navigation:

```bash
# Add navigation buttons using Shape elements
# Create rectangles styled as buttons
# Add text overlay with page numbers
# Link elements to navigate between pages
```

## Dynamic Filtering with Time Ranges

Make reports interactive with time range controls:

```bash
# Add a time filter element
# Configure to control all data elements on the page
# Set default to "Last 7 days"

# Update data expressions to use the time filter:
filters timefilter=true
| essql
  query="SELECT COUNT(*) FROM \"application-logs-*\" WHERE log.level='ERROR'"
| math "value"
| metric "Current Period Errors"
```

The timefilter parameter links the expression to the time control, letting users adjust the reporting period without editing the workpad.

## Styling and Branding

Apply consistent styling across elements:

```bash
# Create a custom color palette
Primary: #2C3E50 (dark blue)
Secondary: #3498DB (bright blue)
Success: #27AE60 (green)
Warning: #F39C12 (orange)
Error: #E74C3C (red)

# Use CSS in markdown elements for advanced styling:
<style>
.metric-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  border-radius: 8px;
  color: white;
  text-align: center;
}
</style>

<div class="metric-box">
  <h2>99.9%</h2>
  <p>Uptime This Month</p>
</div>
```

Consistent styling makes reports look professional and reinforces brand identity.

## Automating Report Generation

Schedule Canvas workpad exports for automated reporting:

```bash
# Create a reporting job using Kibana Reporting API
curl -X POST "http://kibana:5601/api/reporting/generate/canvas" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "workpad": {
      "id": "workpad-12345",
      "name": "Weekly Log Report"
    },
    "layout": {
      "id": "canvas",
      "dimensions": {
        "width": 1920,
        "height": 1080
      }
    }
  }'
```

Integrate with cron for scheduled generation:

```bash
#!/bin/bash
# generate-weekly-report.sh

WORKPAD_ID="workpad-12345"
KIBANA_URL="http://kibana:5601"

# Generate PDF report
REPORT_JOB=$(curl -X POST "${KIBANA_URL}/api/reporting/generate/canvas" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d "{
    \"workpad\": {\"id\": \"${WORKPAD_ID}\"}
  }" | jq -r '.job.id')

# Wait for generation
sleep 30

# Download report
curl -X GET "${KIBANA_URL}/api/reporting/jobs/download/${REPORT_JOB}" \
  -u elastic:password \
  -o "weekly-report-$(date +%Y%m%d).pdf"

# Email to stakeholders
echo "Weekly log report attached" | \
  mail -s "Weekly Log Report" \
  -a "weekly-report-$(date +%Y%m%d).pdf" \
  stakeholders@example.com
```

Schedule with cron:

```bash
# Run every Monday at 9 AM
0 9 * * 1 /usr/local/bin/generate-weekly-report.sh
```

## Advanced Expression Techniques

Use complex expressions for calculated metrics:

```bash
# Calculate week-over-week error rate change
filters
| essql
  query="SELECT
    (SELECT COUNT(*) FROM \"logs-*\" WHERE level='ERROR' AND @timestamp > NOW() - INTERVAL 7 DAYS) as current_week,
    (SELECT COUNT(*) FROM \"logs-*\" WHERE level='ERROR' AND @timestamp BETWEEN NOW() - INTERVAL 14 DAYS AND NOW() - INTERVAL 7 DAYS) as previous_week"
| math "((current_week - previous_week) / previous_week) * 100"
| formatnumber "0.0"
| metric "Week-over-Week Change (%)"
  metricFormat="0.0'%'"
```

Combine multiple data sources:

```bash
# Compare error rates across environments
filters
| essql
  query="SELECT
    environment,
    COUNT(*) as error_count
  FROM \"logs-*\"
  WHERE level='ERROR'
  GROUP BY environment"
| pointseries x="environment" y="error_count" color="environment"
| plot
```

## Performance Optimization

Optimize Canvas workpads for fast rendering:

```bash
# Use appropriate time ranges
# Avoid querying years of data for real-time displays

# Limit result sets
# Add LIMIT clauses to SQL queries

# Cache expensive calculations
# Use Elasticsearch aggregations instead of client-side math

# Reduce element count
# Combine data in expressions rather than creating multiple similar elements
```

Monitor Canvas performance:

```bash
# Check workpad load times in browser developer tools
# Review Elasticsearch query performance
# Optimize index patterns and field mappings
```

## Conclusion

Kibana Canvas elevates log data from technical metrics to business intelligence. By combining precise layout control, dynamic data connections, and professional styling, you create reports that communicate effectively with any audience. Start with simple metric displays and tables, then add sophistication with custom calculations, multi-page layouts, and automated distribution. Canvas transforms raw logs into insights that drive decisions, making your monitoring data accessible and actionable for stakeholders at every level of your organization.
