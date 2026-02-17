# How to Create a Power BI Embedded Dashboard with Azure Data Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Power BI, Azure, Embedded Analytics, Dashboard, Data Visualization, Azure SQL, Business Intelligence

Description: Learn how to build and embed Power BI dashboards that connect to Azure data sources like Azure SQL Database and Azure Synapse Analytics.

---

Power BI Embedded lets you integrate interactive reports and dashboards directly into your own applications. Instead of asking users to open a separate Power BI portal, they get analytics right inside the tools they already use. When your data lives in Azure, the integration becomes even more seamless because everything sits within the same ecosystem.

In this guide, I will walk through the full process of creating a Power BI Embedded dashboard that pulls data from Azure data sources, registering an application in Azure AD, configuring the embed, and rendering the dashboard in a web application.

## Prerequisites

Before getting started, make sure you have the following in place:

- An Azure subscription with an active Power BI Embedded capacity (or Power BI Premium per user for testing)
- An Azure SQL Database or Azure Synapse Analytics workspace with some data to visualize
- A Power BI Pro or Premium per user license for publishing reports
- Node.js installed (for the frontend embedding sample)
- Power BI Desktop installed for report authoring

## Step 1: Create the Power BI Report in Power BI Desktop

Open Power BI Desktop and connect to your Azure data source. For Azure SQL Database, click "Get Data," select "Azure SQL Database," and enter your server name and database name.

Once connected, build your visuals. For this walkthrough, imagine you have a sales database with tables for orders, products, and customers. Create a few visuals - a bar chart for monthly revenue, a pie chart for product categories, and a table showing top customers.

Save the .pbix file. You will publish it to the Power BI service next.

## Step 2: Publish the Report to Power BI Service

From Power BI Desktop, click "Publish" and select a workspace in the Power BI service. If you do not have a dedicated workspace yet, create one in the Power BI portal. Name it something descriptive like "Embedded Sales Dashboard."

After publishing, open the Power BI portal and navigate to the workspace. You should see your report and its underlying dataset listed there. Note the workspace ID and report ID from the URL - you will need them later.

## Step 3: Register an Application in Azure AD

To embed Power BI content, you need an Azure AD application registration that grants your app permissions to access the Power BI API.

Go to the Azure portal, navigate to Azure Active Directory, and select "App registrations." Click "New registration" and give it a name like "PowerBI-Embed-App." Set the redirect URI to your application's URL (for local development, use `http://localhost:3000`).

After registration, note the Application (client) ID and Directory (tenant) ID. Then go to "Certificates & secrets" and create a new client secret. Save this value securely.

Next, configure API permissions. Add the following Power BI Service permissions:

- Dataset.Read.All
- Report.Read.All
- Workspace.Read.All

Grant admin consent for these permissions.

## Step 4: Configure the Power BI Embedded Capacity

In the Azure portal, create a Power BI Embedded resource if you do not already have one. Choose the SKU that fits your needs - A1 is fine for development and testing.

After the resource is provisioned, go to the Power BI portal, open the workspace settings, and assign the workspace to the embedded capacity. This step is critical because without capacity assignment, embedding will not work for non-licensed users.

## Step 5: Set Up Data Source Credentials

Since the report pulls from Azure SQL Database, you need to configure the data source credentials in the Power BI service so that the dataset can refresh.

In the Power BI portal, go to the dataset settings, expand "Data source credentials," and enter the Azure SQL Database connection details. Use either SQL authentication or OAuth2 depending on your setup.

Here is how to configure credentials programmatically using the Power BI REST API:

```python
# Script to update data source credentials using the Power BI REST API
import requests

# Get an access token using client credentials flow
token_url = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
token_payload = {
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "scope": "https://analysis.windows.net/powerbi/api/.default",
    "grant_type": "client_credentials"
}

# Request the token
token_response = requests.post(token_url, data=token_payload)
access_token = token_response.json()["access_token"]

# Set up headers with the bearer token
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Get the gateway and datasource IDs for the dataset
dataset_id = "your-dataset-id"
group_id = "your-workspace-id"
datasources_url = f"https://api.powerbi.com/v1.0/myorg/groups/{group_id}/datasets/{dataset_id}/datasources"

# Fetch data sources associated with the dataset
datasources = requests.get(datasources_url, headers=headers).json()
print(datasources)
```

## Step 6: Generate an Embed Token

For the "App Owns Data" embedding scenario, your backend generates an embed token that the frontend uses to render the report. This approach means end users do not need Power BI licenses.

Here is a Node.js example for generating the embed token:

```javascript
// server.js - Express backend that generates Power BI embed tokens
const express = require('express');
const axios = require('axios');
const app = express();

// Configuration pulled from environment variables
const config = {
    clientId: process.env.PBI_CLIENT_ID,
    clientSecret: process.env.PBI_CLIENT_SECRET,
    tenantId: process.env.PBI_TENANT_ID,
    workspaceId: process.env.PBI_WORKSPACE_ID,
    reportId: process.env.PBI_REPORT_ID
};

// Function to acquire an Azure AD access token
async function getAccessToken() {
    const url = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
        grant_type: 'client_credentials'
    });

    const response = await axios.post(url, params);
    return response.data.access_token;
}

// Endpoint that the frontend calls to get embed configuration
app.get('/api/embed-config', async (req, res) => {
    try {
        const accessToken = await getAccessToken();

        // Request an embed token from the Power BI REST API
        const embedUrl = `https://api.powerbi.com/v1.0/myorg/groups/${config.workspaceId}/reports/${config.reportId}/GenerateToken`;
        const embedResponse = await axios.post(
            embedUrl,
            { accessLevel: 'View' },
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        // Return everything the frontend needs for embedding
        res.json({
            embedToken: embedResponse.data.token,
            embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${config.reportId}&groupId=${config.workspaceId}`,
            reportId: config.reportId
        });
    } catch (error) {
        console.error('Error generating embed token:', error.message);
        res.status(500).json({ error: 'Failed to generate embed token' });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

## Step 7: Embed the Report in Your Web Application

On the frontend, use the Power BI JavaScript SDK to render the embedded report.

```html
<!-- index.html - Frontend page that renders the embedded Power BI report -->
<!DOCTYPE html>
<html>
<head>
    <title>Embedded Dashboard</title>
    <!-- Power BI JavaScript SDK for embedding -->
    <script src="https://cdn.jsdelivr.net/npm/powerbi-client/dist/powerbi.min.js"></script>
    <style>
        /* Give the embed container enough height to display the report */
        #reportContainer { height: 600px; width: 100%; }
    </style>
</head>
<body>
    <h1>Sales Dashboard</h1>
    <div id="reportContainer"></div>

    <script>
        // Fetch embed configuration from our backend
        fetch('/api/embed-config')
            .then(res => res.json())
            .then(config => {
                // Configure the embed settings
                const embedConfig = {
                    type: 'report',
                    id: config.reportId,
                    embedUrl: config.embedUrl,
                    accessToken: config.embedToken,
                    tokenType: 1, // 1 = Embed token (not AAD token)
                    settings: {
                        panes: {
                            filters: { visible: false }, // Hide the filter pane
                            pageNavigation: { visible: true }
                        }
                    }
                };

                // Get the container element and embed the report
                const container = document.getElementById('reportContainer');
                const report = powerbi.embed(container, embedConfig);

                // Log when the report finishes rendering
                report.on('loaded', () => {
                    console.log('Report loaded successfully');
                });
            });
    </script>
</body>
</html>
```

## Step 8: Configure Row-Level Security (Optional)

If you need different users to see different data, configure Row-Level Security (RLS) in Power BI Desktop. Define roles and DAX filter expressions on your tables.

When generating the embed token, pass the effective identity:

```javascript
// Generate embed token with RLS identity to filter data per user
const embedResponse = await axios.post(embedUrl, {
    accessLevel: 'View',
    identities: [{
        username: 'user@company.com',
        roles: ['SalesRegion'],
        datasets: [datasetId]
    }]
}, { headers: { Authorization: `Bearer ${accessToken}` } });
```

## Monitoring and Troubleshooting

Once your embedded dashboard is live, keep an eye on a few things. The Power BI Embedded capacity metrics app (available in the Power BI portal) shows CPU usage, memory consumption, and query performance. If you see throttling, consider scaling up your capacity SKU.

Common issues include embed token expiration (tokens last about an hour by default), data source credential failures after password rotations, and CORS errors if your frontend domain is not whitelisted.

For production deployments, implement token refresh logic on the frontend. The Power BI JavaScript SDK provides events that fire before a token expires, giving you time to fetch a new one from your backend.

## Summary

Power BI Embedded combined with Azure data sources gives you a powerful way to bring analytics into your applications without forcing users to leave their workflow. The key steps are publishing a report to a workspace, registering an Azure AD app, assigning embedded capacity, generating embed tokens on the backend, and rendering with the JavaScript SDK. With RLS, you can personalize the data each user sees, making the experience both secure and relevant.
