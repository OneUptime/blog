# How to Create Grafana Canvas Panels

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Grafana, Observability, Dashboard, Canvas

Description: Learn how to build interactive, custom visualizations with Grafana Canvas panels to create dynamic infrastructure diagrams and real-time system overviews.

---

Grafana dashboards are powerful, but sometimes standard charts and graphs are not enough. When you need to visualize your infrastructure as an interactive diagram, show the flow of data through your systems, or create custom visual representations of your architecture, Canvas panels are the answer.

Canvas panels let you place elements freely on a canvas, bind them to data sources, and create dynamic visualizations that update in real time. Think of it as combining the flexibility of a drawing tool with the power of Grafana's data connectivity.

This guide walks you through everything you need to know to create effective Canvas panels.

---

## What are Canvas Panels?

Canvas panels are a visualization type in Grafana that allow you to:

- Place elements freely anywhere on the panel
- Create custom shapes, icons, and connections
- Bind element properties (color, size, text) to query results
- Build interactive infrastructure diagrams
- Design custom status boards and system overviews

Unlike traditional panels that automatically lay out data, Canvas gives you complete control over positioning and appearance.

```mermaid
flowchart LR
    subgraph Traditional["Traditional Panel"]
        D1[Data] --> C1[Chart]
        C1 --> V1[Fixed Layout]
    end

    subgraph Canvas["Canvas Panel"]
        D2[Data] --> E1[Element 1]
        D2 --> E2[Element 2]
        D2 --> E3[Element 3]
        E1 --> L[Free Layout]
        E2 --> L
        E3 --> L
    end
```

---

## When to Use Canvas Panels

Canvas panels excel in specific scenarios:

| Use Case | Why Canvas Works |
|----------|------------------|
| Infrastructure diagrams | Show servers, databases, and connections visually |
| Network topology | Display network flow and device status |
| Floor plans | Monitor IoT devices by physical location |
| Custom dashboards | Create branded or unique visual layouts |
| Status boards | Build NOC-style overview displays |

Avoid Canvas when simple time series charts or tables would communicate the information more effectively.

---

## Creating Your First Canvas Panel

### Step 1: Add a Canvas Panel

In your Grafana dashboard, click Add panel and select Canvas from the visualization options.

You will see an empty canvas with Canvas options in the panel editor.

### Step 2: Add Basic Elements

The Canvas panel supports several element types:

- **Rectangle** - Basic shapes for backgrounds or containers
- **Text** - Labels and dynamic text values
- **Icon** - Grafana's icon library for visual indicators
- **Server** - Pre-built server representation
- **Button** - Interactive elements for links or actions
- **Metric Value** - Display query results directly

To add an element, use **Add item** in the Canvas layer options, choose the element type, then position it on the canvas.

### Step 3: Configure Element Properties

Select any element to see its properties in the right sidebar.

Common properties include:

- **Position** - X, Y coordinates and size
- **Background** - Color and opacity
- **Border** - Style, width, and color
- **Text** - Content, font size, and alignment

---

## Connecting Data to Canvas Elements

The real power of Canvas panels comes from binding element properties to your data queries.

### Setting Up a Data Source

First, add a query to your panel. For this example, we will query Prometheus for CPU usage.

Create a query that returns the metrics you want to visualize.

```promql
100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))
```

### Binding Data to Elements

With your query configured, you can bind element properties to the results.

Select an element and find the data binding options in the properties panel.

For example, configure an icon or server element with a field-backed fill or status color, then use the panel's field thresholds to map values to colors.

```json
{
  "fieldConfig": {
    "defaults": {
      "color": {
        "mode": "thresholds"
      },
      "thresholds": {
        "mode": "absolute",
        "steps": [
          { "color": "green", "value": null },
          { "color": "yellow", "value": 70 },
          { "color": "red", "value": 90 }
        ]
      }
    }
  }
}
```

This configuration changes the server icon color based on CPU usage thresholds.

---

## Building an Infrastructure Diagram

Let us create a practical example: a three-tier application architecture diagram.

### Architecture Overview

```mermaid
flowchart TB
    subgraph Frontend["Frontend Tier"]
        LB[Load Balancer]
        W1[Web Server 1]
        W2[Web Server 2]
    end

    subgraph Backend["Backend Tier"]
        A1[API Server 1]
        A2[API Server 2]
    end

    subgraph Data["Data Tier"]
        DB[(Database)]
        C[(Cache)]
    end

    LB --> W1
    LB --> W2
    W1 --> A1
    W1 --> A2
    W2 --> A1
    W2 --> A2
    A1 --> DB
    A2 --> DB
    A1 --> C
    A2 --> C
```

### Step-by-Step Implementation

**1. Create the background structure**

Add rectangles to represent each tier. Position them vertically to show the flow from frontend to data layer.

**2. Add server icons for each component**

Place server icons within each tier rectangle. Use the icon library to select appropriate icons (web server, database, cache).

**3. Add connection lines**

Enable inline editing, then drag from a connection anchor on one element to another element. Connections can be straight or adjusted with midpoint controls for routing.

**4. Configure queries for each component**

Add queries for each server's metrics.

```promql
# Web server health
up{job="web-servers"}

# API server response time
histogram_quantile(0.95, sum by (le, instance) (rate(http_request_duration_seconds_bucket{job="api"}[5m])))

# Database connections
sum(pg_stat_activity_count{datname="production"})

# Cache hit rate
rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100
```

**5. Bind data to visual properties**

For each server icon, bind the color property to the corresponding query with appropriate thresholds.

---

## Advanced Canvas Techniques

### Dynamic Text Values

Display live metric values directly on your canvas.

Add a Metric Value element and configure the text source to use a field from your query result.

```json
{
  "type": "metric-value",
  "config": {
    "text": {
      "mode": "field",
      "field": "Value"
    },
    "size": 24
  }
}
```

### Conditional Visibility

Show warning states based on data conditions. Canvas does not provide a separate per-element visibility rule in the standard options, so use value mappings, thresholds, or data links/actions to make warning indicators obvious only when the underlying value is unhealthy.

```json
{
  "fieldConfig": {
    "defaults": {
      "mappings": [
        {
          "type": "range",
          "options": {
            "from": 90,
            "to": null,
            "result": {
              "text": "High CPU",
              "color": "red"
            }
          }
        }
      ]
    }
  }
}
```

### Using Variables

Canvas elements can reference dashboard variables for dynamic behavior.

```yaml
text: "Server: ${server}"
link: "/d/server-detail?var-host=${server}"
```

### Blink Rates

Server elements support a bulb blink rate that can be configured with a fixed value or a field value. This is useful for drawing attention to unhealthy servers without relying on custom animation settings.

---

## Canvas Panel JSON Structure

Understanding the JSON structure helps when you need to programmatically create or modify Canvas panels.

Here is a simplified example of a Canvas panel configuration.

```json
{
  "type": "canvas",
  "title": "Infrastructure Overview",
  "options": {
    "root": {
      "elements": [
        {
          "type": "rectangle",
          "name": "frontend-tier",
          "constraint": {
            "horizontal": "left",
            "vertical": "top"
          },
          "background": {
            "color": {
              "fixed": "#2a2a2a"
            }
          },
          "config": {
            "align": "center",
            "valign": "middle",
            "text": {
              "mode": "fixed",
              "fixed": "Frontend"
            }
          },
          "placement": {
            "top": 10,
            "left": 10,
            "width": 300,
            "height": 150
          }
        },
        {
          "type": "icon",
          "name": "web-server-1",
          "constraint": {
            "horizontal": "left",
            "vertical": "top"
          },
          "config": {
            "path": {
              "mode": "fixed",
              "fixed": "img/icons/unicons/server.svg"
            },
            "fill": {
              "fixed": "#73BF69"
            }
          },
          "placement": {
            "top": 50,
            "left": 50,
            "width": 48,
            "height": 48
          }
        },
        {
          "type": "metric-value",
          "name": "cpu-value",
          "constraint": {
            "horizontal": "left",
            "vertical": "top"
          },
          "config": {
            "text": {
              "mode": "field",
              "field": "Value"
            },
            "size": 20
          },
          "placement": {
            "top": 100,
            "left": 50,
            "width": 80,
            "height": 30
          }
        },
        {
          "type": "server",
          "name": "api-server-1",
          "constraint": {
            "horizontal": "left",
            "vertical": "top"
          },
          "config": {
            "serverType": "server",
            "statusColor": {
              "fixed": "#73BF69"
            }
          },
          "placement": {
            "top": 50,
            "left": 200,
            "width": 80,
            "height": 80
          }
        }
      ],
      "connections": [
        {
          "source": {
            "element": "web-server-1"
          },
          "target": {
            "element": "api-server-1"
          },
          "color": {
            "fixed": "#888888"
          },
          "size": {
            "fixed": 2
          }
        }
      ]
    }
  }
}
```

---

## Performance Considerations

Canvas panels can impact dashboard performance if not designed carefully.

### Best Practices for Performance

**Limit element count** - Keep each panel focused and test dashboard performance as you add elements.

**Optimize queries** - Use efficient queries with appropriate time ranges and aggregations.

**Reduce refresh rate** - Canvas panels do not need sub-second refresh rates for most use cases.

**Use efficient data binding** - Bind only necessary properties to data.

| Panel Complexity | Recommended Refresh |
|------------------|-------------------|
| Simple status board | 10 seconds or slower |
| Multi-service diagram | 30 seconds or slower |
| Large topology view | 1 minute or slower |

---

## Common Patterns and Templates

### Status Grid

Create a grid of status indicators for multiple services.

```mermaid
flowchart TB
    subgraph Grid["Service Status Grid"]
        direction LR
        S1[Service A<br/>OK]
        S2[Service B<br/>OK]
        S3[Service C<br/>WARN]
        S4[Service D<br/>OK]
    end

    style S1 fill:#73BF69
    style S2 fill:#73BF69
    style S3 fill:#FADE2A
    style S4 fill:#73BF69
```

### Data Flow Diagram

Visualize data moving through your pipeline with directional connections.

```mermaid
flowchart LR
    I[Ingestion] --> P[Processing]
    P --> T[Transform]
    T --> S[Storage]
    S --> Q[Query Layer]

    I -->|"100k/s"| P
    P -->|"95k/s"| T
    T -->|"90k/s"| S
```

### Geographic Layout

Map elements to physical or logical locations.

```mermaid
flowchart TB
    subgraph US["US Region"]
        US1[us-east-1]
        US2[us-west-2]
    end

    subgraph EU["EU Region"]
        EU1[eu-west-1]
        EU2[eu-central-1]
    end

    US1 <--> EU1
    US2 <--> EU2
    US1 <--> US2
    EU1 <--> EU2
```

---

## Troubleshooting Canvas Panels

### Elements Not Updating

- Verify your query returns data (check Query Inspector)
- Confirm data binding references the correct field name
- Check that thresholds are configured properly

### Layout Issues

- Use the alignment tools in the toolbar
- Use snapping and alignment guides for consistent spacing
- Check element layer ordering if elements overlap unexpectedly

### Performance Problems

- Reduce element count
- Increase refresh interval
- Simplify queries (avoid regex where possible)

---

## Canvas vs Other Visualizations

| Feature | Canvas | Diagram | Stat | Graph |
|---------|--------|---------|------|-------|
| Free positioning | Yes | No | No | No |
| Custom shapes | Yes | Limited | No | No |
| Data binding | Yes | Yes | Yes | Yes |
| Connections | Yes | Yes | No | No |
| Time series | Limited | No | No | Yes |
| Ease of use | Medium | Easy | Easy | Easy |

Choose Canvas when you need custom layouts and visual representations. Use standard panels when automatic data visualization is sufficient.

---

## Integrating with OneUptime

Canvas panels work excellently with OneUptime's observability data. Query your metrics, logs, and traces to build comprehensive infrastructure views.

Example integration for monitoring service health.

```promql
# Query OneUptime metrics
up{job="oneuptime-monitors"}

# Service response times
avg(oneuptime_monitor_response_time_seconds{monitor_type="http"}) * 1000

# Incident status
count(oneuptime_incident_status{state="active"})
```

Bind these queries to Canvas elements to create a unified view of your infrastructure health alongside your existing monitoring setup.

---

## Summary

Canvas panels unlock custom visualization capabilities in Grafana that go beyond traditional charts and graphs.

Key takeaways:

- Use Canvas for infrastructure diagrams, status boards, and custom layouts
- Bind element properties to queries for dynamic, real-time visualizations
- Keep element counts reasonable for good performance
- Combine Canvas with standard panels for comprehensive dashboards

Start simple with a few elements, then gradually add complexity as you become familiar with the Canvas workflow.

---

**Related Reading:**

- [Logs, Metrics and Traces: The Three Pillars of Observability](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [SRE Metrics to Track](https://oneuptime.com/blog/post/2025-11-28-sre-metrics-to-track/view)
- [Monitoring vs Observability](https://oneuptime.com/blog/post/2025-11-28-monitoring-vs-observability-sre/view)
