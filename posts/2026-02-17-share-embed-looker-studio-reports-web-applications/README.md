# How to Share and Embed Looker Studio Reports in Web Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Looker Studio, Embedding, Report, Web Application, Dashboard, Sharing

Description: Learn how to share Looker Studio reports with stakeholders and embed interactive dashboards directly into your web applications.

---

Building a dashboard is only half the work. The other half is getting it in front of the right people. Looker Studio offers several ways to share and embed reports, from simple link sharing to full iframe embedding in your product. Each approach has different trade-offs around access control, interactivity, and customization.

This guide covers all the sharing and embedding options, including the gotchas that are not obvious from the documentation.

## Sharing via Link

The simplest sharing method is a direct link. Anyone with the link and appropriate permissions can view the report.

To share a report:

1. Click the "Share" button in the top-right corner of the report
2. Add email addresses or Google Groups
3. Choose permission level: Viewer or Editor
4. Click "Send"

You can also get a shareable link:

1. Click "Share"
2. Click "Get link"
3. Choose link visibility: Restricted, Anyone in your organization, or Anyone with the link
4. Copy the link

For organization-wide dashboards, "Anyone in your organization" is usually the right choice. It lets anyone with a company Google Workspace account view the report without individual sharing.

## Scheduling Email Delivery

For stakeholders who want regular updates without visiting the dashboard:

1. Click "Share" then "Schedule delivery"
2. Add recipients
3. Choose frequency (daily, weekly, monthly)
4. Select pages to include
5. Set the delivery date and time

The scheduled email sends a PDF snapshot of the dashboard at the configured time. Recipients see the data as it looks at that moment, with the schedule's configured filter values applied.

```mermaid
graph LR
    A[Scheduled Trigger] --> B[Looker Studio Runs Query]
    B --> C[Renders Dashboard as PDF]
    C --> D[Sends Email to Recipients]
```

One thing to watch: the schedule depends on the report and data source credentials being able to render the PDF. If the report can't be downloaded successfully, the scheduled email won't be sent, so check schedule errors and warning emails if delivery stops.

## Downloading Reports

Users can download reports for offline sharing:

1. Click "Share" then "Download"
2. Configure the PDF download options

PDF exports include all pages with the current filter state. This is useful for board presentations or compliance reports where you need a point-in-time snapshot.

For CSV exports, export data from an individual chart: hover over the chart, open the "More options" menu, and select "Export data." CSV export saves the chart's data, not an image of the chart or the whole report.

## Embedding in Web Applications

Embedding lets you include interactive Looker Studio dashboards directly in your web application. This is common for SaaS products that want to show analytics to their customers, or for internal portals that consolidate multiple tools.

### Step 1: Enable Embedding

1. Open your report in Looker Studio
2. Click "File" then "Embed report"
3. Toggle "Enable embedding" to on
4. Copy the embed URL

### Step 2: Add the iframe

Add the iframe to your web application:

```html
<!-- Basic Looker Studio embed -->
<iframe
  width="100%"
  height="600"
  src="https://lookerstudio.google.com/embed/reporting/REPORT_ID/page/PAGE_ID"
  frameborder="0"
  style="border: 0;"
  allowfullscreen
  sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox">
</iframe>
```

### Step 3: Pass Report Parameters via URL

You can set allowed Looker Studio parameters using URL parameters. This is powerful for showing different data to different users when the report is designed to use those parameters in filters, calculated fields, or connector queries.

```html
<!-- Embed with pre-applied report parameters -->
<iframe
  width="100%"
  height="600"
  src="https://lookerstudio.google.com/embed/reporting/REPORT_ID/page/PAGE_ID?params=%7B%22ds0.region%22%3A%22North%20America%22%7D"
  frameborder="0"
  style="border: 0;"
  allowfullscreen>
</iframe>
```

The URL parameter format is a URL-encoded JSON object where keys are the parameter URL names, such as `ds0.region`, and values are the parameter values. The parameters must be allowed to be modified in the report URL.

Here is a JavaScript helper to build parameterized URLs dynamically:

```javascript
/**
 * Build a Looker Studio embed URL with dynamic parameters.
 * @param {string} reportId - The Looker Studio report ID
 * @param {string} pageId - The page ID within the report
 * @param {Object} parameters - Key-value pairs for allowed report parameters
 * @returns {string} The complete embed URL with parameters
 */
function buildLookerStudioUrl(reportId, pageId, parameters) {
  const baseUrl = `https://lookerstudio.google.com/embed/reporting/${reportId}/page/${pageId}`;

  if (!parameters || Object.keys(parameters).length === 0) {
    return baseUrl;
  }

  // Build the params object.
  // Keys must match the URL parameter names shown in Looker Studio.
  const params = {};
  for (const [parameterName, value] of Object.entries(parameters)) {
    params[parameterName] = value;
  }

  const encodedParams = encodeURIComponent(JSON.stringify(params));
  return `${baseUrl}?params=${encodedParams}`;
}

// Usage example: embed a report filtered to a specific customer
const url = buildLookerStudioUrl(
  'abc123-report-id',
  'p_overview',
  {
    'ds0.customer_id': 'CUST-456',
    'ds0.region': 'Europe'
  }
);

document.getElementById('dashboard-frame').src = url;
```

## Embedding with Authentication

By default, embedded reports require viewers to be signed in with a Google account that has access to the report. This works for internal applications but not for customer-facing embeds.

For public embeds (no authentication required):

1. Set the report sharing to "Anyone with the link can view"
2. Use "Owner's credentials" for the data source
3. Enable embedding

This means anyone who can see the iframe can view the data. Only do this for non-sensitive data.

Looker Studio does not receive your application's authentication context from the iframe. For customer-specific SaaS embeds where viewers do not have Google access to a private report, you have two common patterns:

**Option 1: Service account with parameterized filtering.** For BigQuery data sources in a Google Workspace or Cloud Identity managed organization, use service account credentials and pass customer-specific parameter values through URL parameters after validating access in your application. The report must apply those parameters in its filters or queries, and you should not treat URL parameters as a security boundary.

```javascript
// Server-side code to generate filtered embed URLs per customer
function getCustomerDashboardUrl(customerId) {
  // Validate that the logged-in user belongs to this customer
  const parameters = {
    'ds0.customer_id': customerId
  };

  return buildLookerStudioUrl(REPORT_ID, PAGE_ID, parameters);
}
```

**Option 2: Separate reports per customer.** Create a copy of the report for each customer with pre-configured data source filters and sharing settings. This is more secure but harder to maintain.

## Responsive Embedding

Make the embed responsive for different screen sizes:

```html
<!-- Responsive Looker Studio embed -->
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe
    src="https://lookerstudio.google.com/embed/reporting/REPORT_ID/page/PAGE_ID"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
    allowfullscreen
    sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox">
  </iframe>
</div>
```

The padding-bottom percentage controls the aspect ratio. 56.25% gives a 16:9 ratio. Adjust to 75% for a 4:3 ratio.

## Embedding Specific Pages

If your report has multiple pages but you only want to embed one:

```html
<!-- Embed page 2 of a report -->
<iframe
  src="https://lookerstudio.google.com/embed/reporting/REPORT_ID/page/p_abcdef"
  width="100%"
  height="600"
  frameborder="0">
</iframe>
```

The page ID is visible in the URL when you navigate to that page in the Looker Studio editor.

## Hiding Controls in Embedded Reports

For embedded reports, you might want to hide the page navigation or filter controls to create a cleaner look:

Use CSS to hide specific elements in the iframe's parent container. Note that you cannot style inside the iframe due to cross-origin restrictions, but you can control the visible area:

```html
<!-- Crop the top of the report to hide navigation -->
<div style="overflow: hidden; height: 550px;">
  <iframe
    src="https://lookerstudio.google.com/embed/reporting/REPORT_ID/page/PAGE_ID"
    style="width: 100%; height: 600px; margin-top: -50px; border: 0;"
    scrolling="no">
  </iframe>
</div>
```

A better approach is to design the embedded report page without navigation elements. Create a dedicated page for embedding that has only the charts and controls you want external users to see.

## Security Considerations

When embedding reports, keep these security points in mind:

**Data exposure.** If the report is set to "Anyone with the link," the data is effectively public. Use report parameters to tailor the view, but remember that technically savvy users can modify URL parameters.

**Content Security Policy.** Your web application's CSP headers need to allow framing from lookerstudio.google.com:

```text
Content-Security-Policy: frame-src https://lookerstudio.google.com
```

**Cost implications.** Views and interactions can trigger BigQuery queries when Looker Studio fetches fresh data or issues a query it has not cached. High-traffic customer-facing embeds can generate significant BigQuery costs, so tune data freshness and consider extracted or pre-aggregated data when appropriate.

## Wrapping Up

Looker Studio provides flexible sharing and embedding options for different use cases. For internal teams, link sharing with scheduled emails works well. For product analytics, iframe embedding with URL-based parameters lets you integrate dashboards into your application. The main decisions are around authentication (who can see the data), filtering (how to show the right data to each viewer), and performance (how to handle the query cost of high-traffic embeds). Start with simple sharing and move to embedding only when your use case requires it.
