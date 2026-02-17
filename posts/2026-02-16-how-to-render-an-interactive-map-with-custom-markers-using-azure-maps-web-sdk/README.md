# How to Render an Interactive Map with Custom Markers Using Azure Maps Web SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Maps, Web SDK, Interactive Maps, Custom Markers, JavaScript, Geospatial, Map Visualization

Description: Learn how to render an interactive map with custom markers, popups, and clustering using the Azure Maps Web SDK in a JavaScript application.

---

Azure Maps provides a rich JavaScript SDK for embedding interactive maps in web applications. Unlike static map images, the Web SDK gives you a fully interactive map canvas where users can pan, zoom, and interact with data layers. You can add markers, draw polygons, overlay heatmaps, and respond to click events. If you have built with Google Maps or Mapbox before, the concepts are similar, but the Azure Maps SDK has its own API patterns worth understanding.

This guide covers setting up the SDK, rendering a map, adding different types of markers, implementing popups, and handling user interactions.

## Prerequisites

You need an Azure Maps account. Create one through the Azure portal or CLI.

```bash
# Create an Azure Maps account
az maps account create \
  --name my-maps-account \
  --resource-group maps-rg \
  --sku S1 \
  --kind Gen2

# Get the subscription key
az maps account keys list \
  --name my-maps-account \
  --resource-group maps-rg \
  --query primaryKey -o tsv
```

## Step 1: Set Up the HTML Page

Start with a basic HTML page that loads the Azure Maps SDK from the CDN.

```html
<!DOCTYPE html>
<html>
<head>
    <title>Azure Maps - Custom Markers</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- Azure Maps CSS -->
    <link rel="stylesheet"
          href="https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.css"
          type="text/css" />

    <!-- Azure Maps JavaScript SDK -->
    <script src="https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js"></script>

    <style>
        /* Make the map fill the viewport */
        html, body {
            margin: 0;
            padding: 0;
            height: 100%;
        }
        #myMap {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <div id="myMap"></div>
    <script src="app.js"></script>
</body>
</html>
```

## Step 2: Initialize the Map

Create the map instance with your subscription key and configure the initial view.

```javascript
// app.js - Initialize the Azure Maps map instance

// Wait for the page to load before initializing the map
document.addEventListener('DOMContentLoaded', function () {

    // Create the map with configuration options
    const map = new atlas.Map('myMap', {
        // Center the map on Seattle
        center: [-122.3321, 47.6062],
        zoom: 12,

        // Map style - options include road, satellite, night, grayscale_dark, etc.
        style: 'road',

        // Authentication using subscription key
        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: 'YOUR_AZURE_MAPS_KEY'
        }
    });

    // Wait for the map to be ready before adding data
    map.events.add('ready', function () {
        console.log('Map is ready');
        addMarkers(map);
        addControls(map);
    });
});
```

## Step 3: Add Navigation Controls

Add standard map controls so users can zoom, rotate, and change the map style.

```javascript
function addControls(map) {
    // Add zoom buttons
    map.controls.add(new atlas.control.ZoomControl(), {
        position: 'top-right'
    });

    // Add a compass control for rotation
    map.controls.add(new atlas.control.CompassControl(), {
        position: 'top-right'
    });

    // Add a style picker to switch between road, satellite, etc.
    map.controls.add(new atlas.control.StyleControl({
        mapStyles: ['road', 'satellite', 'satellite_road_labels', 'night', 'grayscale_dark']
    }), {
        position: 'top-left'
    });
}
```

## Step 4: Add Basic Markers

Azure Maps uses two approaches for markers: HTML markers (DOM elements) and symbol layers (WebGL-rendered). HTML markers are simpler and support full CSS styling. Symbol layers perform better with large datasets.

Here is how to add HTML markers.

```javascript
function addMarkers(map) {
    // Sample data - locations of interest in Seattle
    const locations = [
        { name: 'Space Needle', lat: 47.6205, lon: -122.3493, category: 'landmark' },
        { name: 'Pike Place Market', lat: 47.6097, lon: -122.3425, category: 'market' },
        { name: 'Pioneer Square', lat: 47.6015, lon: -122.3345, category: 'landmark' },
        { name: 'Capitol Hill', lat: 47.6253, lon: -122.3222, category: 'neighborhood' },
        { name: 'University of Washington', lat: 47.6553, lon: -122.3035, category: 'education' },
        { name: 'Gas Works Park', lat: 47.6456, lon: -122.3344, category: 'park' },
        { name: 'Seattle Waterfront', lat: 47.6060, lon: -122.3421, category: 'landmark' }
    ];

    locations.forEach(function (location) {
        // Create a custom HTML marker with different colors by category
        const color = getCategoryColor(location.category);

        const marker = new atlas.HtmlMarker({
            position: [location.lon, location.lat],
            color: color,
            text: location.name.charAt(0),  // First letter as label
            htmlContent: createCustomMarkerHtml(location, color)
        });

        // Add click event to the marker
        map.events.add('click', marker, function () {
            showPopup(map, location);
        });

        // Add the marker to the map
        map.markers.add(marker);
    });
}

function getCategoryColor(category) {
    // Return a color based on the category
    const colors = {
        landmark: '#e74c3c',
        market: '#2ecc71',
        neighborhood: '#3498db',
        education: '#9b59b6',
        park: '#27ae60'
    };
    return colors[category] || '#95a5a6';
}
```

## Step 5: Create Custom Marker HTML

For fully custom markers, you can use any HTML and CSS.

```javascript
function createCustomMarkerHtml(location, color) {
    // Create a custom marker with an icon and label
    return `
        <div style="
            background-color: ${color};
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.2)'"
           onmouseout="this.style.transform='scale(1)'">
            ${location.name.charAt(0)}
        </div>
    `;
}
```

## Step 6: Add Interactive Popups

Popups display information when a user clicks on a marker.

```javascript
// Create a reusable popup instance
const popup = new atlas.Popup({
    pixelOffset: [0, -30],
    closeButton: true
});

function showPopup(map, location) {
    // Build the popup content
    const content = `
        <div style="padding: 12px; max-width: 250px;">
            <h3 style="margin: 0 0 8px 0; color: #333;">${location.name}</h3>
            <p style="margin: 0 0 4px 0; color: #666;">
                Category: <strong>${location.category}</strong>
            </p>
            <p style="margin: 0; color: #999; font-size: 12px;">
                ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}
            </p>
        </div>
    `;

    // Set the popup position and content, then open it
    popup.setOptions({
        position: [location.lon, location.lat],
        content: content
    });

    popup.open(map);
}
```

## Step 7: Use Symbol Layers for Large Datasets

When you have hundreds or thousands of markers, HTML markers become slow because each one is a DOM element. Switch to symbol layers, which render on the GPU.

```javascript
function addSymbolLayer(map) {
    // Create a data source to hold the point data
    const dataSource = new atlas.source.DataSource();
    map.sources.add(dataSource);

    // Load data points into the data source
    const sensorLocations = generateSensorData(500); // 500 sensors

    sensorLocations.forEach(function (sensor) {
        dataSource.add(new atlas.data.Feature(
            new atlas.data.Point([sensor.lon, sensor.lat]),
            {
                name: sensor.name,
                temperature: sensor.temperature,
                status: sensor.status
            }
        ));
    });

    // Create a symbol layer that renders the data source
    const symbolLayer = new atlas.layer.SymbolLayer(dataSource, null, {
        iconOptions: {
            // Use a built-in icon
            image: 'pin-round-darkblue',
            size: 0.8,
            // Color based on status property
            allowOverlap: true
        },
        textOptions: {
            // Show temperature as a label
            textField: ['concat', ['to-string', ['get', 'temperature']], ' F'],
            offset: [0, 1.2],
            size: 11,
            color: '#333'
        }
    });

    map.layers.add(symbolLayer);

    // Add click handler for the symbol layer
    map.events.add('click', symbolLayer, function (e) {
        if (e.shapes && e.shapes.length > 0) {
            const properties = e.shapes[0].getProperties();
            popup.setOptions({
                position: e.shapes[0].getCoordinates(),
                content: `<div style="padding: 10px;">
                    <strong>${properties.name}</strong><br/>
                    Temperature: ${properties.temperature} F<br/>
                    Status: ${properties.status}
                </div>`
            });
            popup.open(map);
        }
    });
}

function generateSensorData(count) {
    // Generate random sensor locations around Seattle for testing
    const sensors = [];
    for (let i = 0; i < count; i++) {
        sensors.push({
            name: `Sensor-${String(i).padStart(3, '0')}`,
            lat: 47.55 + Math.random() * 0.15,
            lon: -122.40 + Math.random() * 0.20,
            temperature: Math.round(50 + Math.random() * 40),
            status: Math.random() > 0.1 ? 'online' : 'offline'
        });
    }
    return sensors;
}
```

## Step 8: Add Marker Clustering

When markers are dense, clustering groups nearby points together and shows a count. This dramatically improves readability.

```javascript
function addClusteredLayer(map) {
    // Create a data source with clustering enabled
    const dataSource = new atlas.source.DataSource(null, {
        cluster: true,
        clusterRadius: 45,       // Pixel radius for clustering
        clusterMaxZoom: 15       // Max zoom level for clustering
    });
    map.sources.add(dataSource);

    // Add data points
    const sensors = generateSensorData(1000);
    sensors.forEach(function (sensor) {
        dataSource.add(new atlas.data.Feature(
            new atlas.data.Point([sensor.lon, sensor.lat]),
            { name: sensor.name, temperature: sensor.temperature }
        ));
    });

    // Create a bubble layer for clusters
    map.layers.add(new atlas.layer.BubbleLayer(dataSource, null, {
        // Only render clustered points
        filter: ['has', 'point_count'],
        radius: [
            'step',
            ['get', 'point_count'],
            15,    // Default radius
            10, 20,  // 20px radius for 10+ points
            50, 30,  // 30px radius for 50+ points
            100, 40  // 40px radius for 100+ points
        ],
        color: [
            'step',
            ['get', 'point_count'],
            '#51bbd6',     // Default color (blue)
            10, '#f1f075',  // Yellow for 10+
            50, '#f28cb1',  // Pink for 50+
            100, '#e74c3c'  // Red for 100+
        ],
        strokeWidth: 0
    }));

    // Add labels showing cluster counts
    map.layers.add(new atlas.layer.SymbolLayer(dataSource, null, {
        filter: ['has', 'point_count'],
        textOptions: {
            textField: ['get', 'point_count_abbreviated'],
            size: 12,
            color: 'white',
            font: ['StandardFont-Bold']
        }
    }));

    // Add a symbol layer for individual (unclustered) points
    map.layers.add(new atlas.layer.SymbolLayer(dataSource, null, {
        filter: ['!', ['has', 'point_count']],
        iconOptions: {
            image: 'pin-round-darkblue',
            size: 0.6
        }
    }));
}
```

## Authentication Best Practices

For production applications, do not embed the subscription key in client-side code. Use Azure Active Directory authentication instead.

```javascript
// Use AAD authentication for production
const map = new atlas.Map('myMap', {
    center: [-122.3321, 47.6062],
    zoom: 12,
    authOptions: {
        authType: 'aad',
        clientId: 'YOUR_AAD_APP_CLIENT_ID',
        aadAppId: 'YOUR_AZURE_MAPS_CLIENT_ID',
        aadTenant: 'YOUR_AAD_TENANT_ID',
        aadInstance: 'https://login.microsoftonline.com/'
    }
});
```

This way, the subscription key stays on the server side and users authenticate through your app's AAD registration.

## Wrapping Up

The Azure Maps Web SDK gives you a powerful canvas for building geospatial applications. Start with simple HTML markers for small datasets and progress to symbol layers with clustering as your data grows. The event system supports clicks, hovers, and drag interactions, letting you build rich, interactive experiences. Pair the map with Azure Maps REST APIs for geocoding, routing, and geofencing to build complete location-aware applications. The key is matching your marker strategy to your data volume - HTML markers for tens of points, symbol layers for hundreds, and clustering for thousands.
