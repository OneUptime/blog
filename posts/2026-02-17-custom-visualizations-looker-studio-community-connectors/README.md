# How to Create Custom Visualizations in Looker Studio Using Community Connectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Looker Studio, Community Connectors, Custom Visualizations, Data Visualization, Apps Script

Description: Learn how to build community connectors and custom visualizations in Looker Studio to extend its capabilities beyond built-in chart types.

---

Looker Studio's built-in charts cover most use cases, but sometimes you need something specific - a funnel chart with custom stages, a heatmap calendar, a Sankey diagram, or a visualization that matches your brand's design system. Community visualizations and connectors let you build exactly what you need using web technologies you already know.

This guide covers both community connectors (to bring data from custom sources) and community visualizations (to render data in custom ways).

## Understanding the Two Extension Points

Looker Studio has two distinct extension mechanisms:

**Community Connectors** let you bring data from any source into Looker Studio. They define how data is fetched and what schema it has. Think of them as custom data source drivers.

**Community Visualizations** let you render data in custom ways. They receive data from any Looker Studio data source and render it using JavaScript and a canvas or DOM elements.

You can use them independently or together. A community connector brings the data in, and a community visualization renders it.

## Building a Community Connector

Community connectors are built with Google Apps Script. They implement four required functions that Looker Studio calls at different stages of the data flow.

### Step 1: Create the Apps Script Project

1. Go to script.google.com
2. Create a new project
3. Name it something descriptive like "Custom API Connector"

### Step 2: Implement Required Functions

Here is a complete connector that pulls data from a REST API:

```javascript
/**
 * Returns the connector configuration to the user.
 * Defines what inputs the user needs to provide when connecting.
 */
function getConfig(request) {
  var config = cc.getConfig();

  config.newInfo()
    .setId('instructions')
    .setText('Enter the API endpoint and authentication details.');

  config.newTextInput()
    .setId('apiUrl')
    .setName('API URL')
    .setHelpText('The base URL of your API')
    .setPlaceholder('https://api.example.com/v1/metrics');

  config.newTextInput()
    .setId('apiKey')
    .setName('API Key')
    .setHelpText('Your API authentication key');

  config.setDateRangeRequired(true);

  return config.build();
}

/**
 * Returns the schema (field definitions) for this connector.
 * Looker Studio uses this to understand what dimensions and metrics are available.
 */
function getSchema(request) {
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;

  // Define dimensions
  fields.newDimension()
    .setId('date')
    .setName('Date')
    .setType(types.YEAR_MONTH_DAY);

  fields.newDimension()
    .setId('category')
    .setName('Category')
    .setType(types.TEXT);

  // Define metrics
  fields.newMetric()
    .setId('value')
    .setName('Value')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newMetric()
    .setId('count')
    .setName('Count')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  return { schema: fields.build() };
}

/**
 * Fetches data from the API and returns it in the format Looker Studio expects.
 */
function getData(request) {
  var apiUrl = request.configParams.apiUrl;
  var apiKey = request.configParams.apiKey;

  // Build the request URL with date range from Looker Studio
  var startDate = request.dateRange.startDate;
  var endDate = request.dateRange.endDate;
  var url = apiUrl + '?start=' + startDate + '&end=' + endDate;

  // Fetch data from the API
  var options = {
    'method': 'get',
    'headers': {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    'muteHttpExceptions': true
  };

  var response = UrlFetchApp.fetch(url, options);
  var data = JSON.parse(response.getContentText());

  // Build the schema for requested fields only
  var requestedFields = getFields().forIds(
    request.fields.map(function(field) { return field.name; })
  );

  // Transform API response into Looker Studio row format
  var rows = data.results.map(function(item) {
    var row = [];
    requestedFields.asArray().forEach(function(field) {
      switch(field.getId()) {
        case 'date':
          row.push(item.date.replace(/-/g, ''));
          break;
        case 'category':
          row.push(item.category);
          break;
        case 'value':
          row.push(item.value);
          break;
        case 'count':
          row.push(item.count);
          break;
        default:
          row.push('');
      }
    });
    return { values: row };
  });

  return {
    schema: requestedFields.build(),
    rows: rows
  };
}

/**
 * Returns authentication type. Can be NONE, KEY, USER_PASS, or OAUTH2.
 */
function getAuthType() {
  return cc.newAuthTypeResponse()
    .setAuthType(cc.AuthType.NONE)
    .build();
}

// Initialize the community connector
var cc = DataStudioApp.createCommunityConnector();

function getFields() {
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;

  fields.newDimension().setId('date').setType(types.YEAR_MONTH_DAY);
  fields.newDimension().setId('category').setType(types.TEXT);
  fields.newMetric().setId('value').setType(types.NUMBER).setAggregation(aggregations.SUM);
  fields.newMetric().setId('count').setType(types.NUMBER).setAggregation(aggregations.SUM);

  return fields;
}
```

### Step 3: Deploy the Connector

1. In the Apps Script editor, click "Deploy" then "New deployment"
2. Select "Add-on" as the deployment type
3. Fill in the description
4. Click "Deploy"
5. Copy the deployment ID

### Step 4: Use in Looker Studio

1. In Looker Studio, create a new data source
2. Select "Build your own" in the connector list
3. Enter your deployment ID
4. Configure the connector parameters
5. Connect

## Building a Community Visualization

Community visualizations use the Looker Studio Visualization API with standard web technologies (HTML, CSS, JavaScript).

### Project Structure

A community visualization project has this structure:

```
my-viz/
  manifest.json    - Metadata and configuration
  myViz.js         - Visualization logic
  myViz.css        - Styling (optional)
  myViz.json       - Configuration schema
```

### The Manifest File

```json
{
  "name": "Custom Funnel Chart",
  "organization": "My Company",
  "description": "A custom funnel visualization for conversion analysis",
  "logoUrl": "https://example.com/logo.png",
  "organizationUrl": "https://example.com",
  "supportUrl": "https://example.com/support",
  "privacyPolicyUrl": "https://example.com/privacy",
  "termsOfServiceUrl": "https://example.com/tos",
  "packageUrl": "gs://my-viz-bucket/funnel-chart",
  "devMode": true,
  "components": [
    {
      "id": "funnelChart",
      "name": "Funnel Chart",
      "description": "Displays data as a funnel with configurable stages",
      "iconUrl": "https://example.com/funnel-icon.png",
      "resource": {
        "js": "funnel.js",
        "config": "funnel.json",
        "css": "funnel.css"
      }
    }
  ]
}
```

### The Visualization Code

Here is a custom funnel chart visualization:

```javascript
/**
 * Custom funnel chart for Looker Studio.
 * Renders conversion funnel stages with proportional widths.
 */
const dscc = require('@google/dscc');
const d3 = require('d3');

// Visualization entry point called by Looker Studio
function drawViz(data) {
  // Clear any previous rendering
  const container = document.getElementById('container');
  container.innerHTML = '';

  // Get the data from Looker Studio
  const tables = data.tables.DEFAULT;
  const dimensions = data.fields.dimID;
  const metrics = data.fields.metricID;

  // Extract stage names and values
  const stages = tables.map(row => ({
    name: row.dimID[0],
    value: row.metricID[0]
  }));

  // Sort by value descending (widest funnel at top)
  stages.sort((a, b) => b.value - a.value);

  // Get styling options from the config
  const style = data.style;
  const funnelColor = style.funnelColor.value || '#4285f4';
  const textColor = style.textColor.value || '#333333';
  const showPercentage = style.showPercentage.value || true;

  // Set up dimensions
  const width = dscc.getWidth();
  const height = dscc.getHeight();
  const stageHeight = height / stages.length;
  const maxValue = stages[0].value;

  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Draw funnel stages
  stages.forEach((stage, index) => {
    const stageWidth = (stage.value / maxValue) * width * 0.8;
    const x = (width - stageWidth) / 2;
    const y = index * stageHeight;

    // Draw the stage rectangle
    svg.append('rect')
      .attr('x', x)
      .attr('y', y + 2)
      .attr('width', stageWidth)
      .attr('height', stageHeight - 4)
      .attr('fill', funnelColor)
      .attr('opacity', 1 - (index * 0.15))
      .attr('rx', 4);

    // Add stage label
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', y + stageHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', textColor)
      .attr('font-size', '14px')
      .text(stage.name + ': ' + stage.value.toLocaleString());

    // Add conversion percentage
    if (showPercentage && index > 0) {
      const percentage = ((stage.value / stages[index - 1].value) * 100).toFixed(1);
      svg.append('text')
        .attr('x', width - 10)
        .attr('y', y + 5)
        .attr('text-anchor', 'end')
        .attr('fill', '#666')
        .attr('font-size', '11px')
        .text(percentage + '%');
    }
  });
}

// Subscribe to data changes from Looker Studio
dscc.subscribeToData(drawViz, { transform: dscc.objectTransform });
```

### The Configuration Schema

Define what options users can configure:

```json
{
  "data": [
    {
      "id": "concepts",
      "label": "Funnel Configuration",
      "elements": [
        {
          "id": "dimID",
          "label": "Stage Name",
          "type": "DIMENSION",
          "options": {
            "min": 1,
            "max": 1
          }
        },
        {
          "id": "metricID",
          "label": "Stage Value",
          "type": "METRIC",
          "options": {
            "min": 1,
            "max": 1
          }
        }
      ]
    }
  ],
  "style": [
    {
      "id": "funnelStyle",
      "label": "Funnel Style",
      "elements": [
        {
          "id": "funnelColor",
          "label": "Funnel Color",
          "type": "FILL_COLOR",
          "defaultValue": "#4285f4"
        },
        {
          "id": "textColor",
          "label": "Text Color",
          "type": "FONT_COLOR",
          "defaultValue": "#333333"
        },
        {
          "id": "showPercentage",
          "label": "Show Conversion %",
          "type": "CHECKBOX",
          "defaultValue": true
        }
      ]
    }
  ]
}
```

### Deploying the Visualization

1. Build your visualization files
2. Upload to a GCS bucket
3. Make the bucket publicly readable
4. In Looker Studio, add the visualization using the GCS path from the manifest

```bash
# Upload visualization files to GCS
gsutil mb gs://my-viz-bucket/
gsutil cp -r funnel-chart/ gs://my-viz-bucket/
gsutil iam ch allUsers:objectViewer gs://my-viz-bucket/
```

## Using the Community Visualization Gallery

Before building your own, check the existing community visualization gallery. There are many pre-built options:

- Sankey diagrams
- Treemaps
- Gauge charts
- Heatmap calendars
- Word clouds
- Radar charts

To use a community visualization:

1. Click "Add a chart" in your report
2. Scroll to the bottom and click "Explore more"
3. Browse the community gallery
4. Click "Build your own" to add a custom one by URL

## Wrapping Up

Community connectors and visualizations extend Looker Studio beyond its built-in capabilities. Connectors let you bring in data from any API, database, or service. Visualizations let you render that data in any way you can code with JavaScript. The development experience is straightforward if you are familiar with web development. For most teams, the community gallery has what you need, but when it does not, building your own is a reasonable investment that pays off across all your reports.
