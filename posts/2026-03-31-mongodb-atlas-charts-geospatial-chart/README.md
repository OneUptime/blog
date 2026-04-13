# How to Create a Geospatial Chart in MongoDB Atlas Charts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Charts, Visualization, Geospatial, Map

Description: Learn how to create geospatial maps in MongoDB Atlas Charts to visualize location data, choropleth regions, and point density on interactive maps.

---

## Geospatial Chart Types in Atlas Charts

MongoDB Atlas Charts supports three geospatial chart types:

1. **Geo Scatter** - plots individual documents as markers on a map using lat/lon coordinates
2. **Geo Choropleth** - fills geographic regions (countries, states) with colors based on aggregate values
3. **Geo Heatmap** - displays data density as a heat map overlay on a geographic map

Both types render on an interactive map powered by Mapbox, with built-in zoom and pan support.

## Prerequisites

Your collection must contain location data in one of these formats:
- A GeoJSON field (`{ type: "Point", coordinates: [lng, lat] }`)
- Separate numeric latitude and longitude fields

## Creating a Geo Point Chart

1. Click **Add Chart** in your Atlas dashboard
2. Select **Chart Type: Geo Point**
3. Choose your collection - for example, `sample_restaurants.restaurants`

### Configuring the Coordinates

If your data uses a GeoJSON field:
```text
Coordinates:  location    (GeoJSON Point field)
```

If your data uses separate lat/lon fields, Atlas Charts can handle them:
```text
Latitude:   lat
Longitude:  lng
```

### Adding Color and Size

Use the **Color** channel to differentiate markers by category (e.g., cuisine type) and the **Size** channel to scale markers by a numeric value (e.g., review count):

```text
Coordinates:  location
Color:        cuisine      (Category)
Size:         stars        (Aggregation: Average)
```

### Sample Document Format

```javascript
{
  _id: ObjectId("..."),
  name: "The Golden Fork",
  cuisine: "Italian",
  stars: 4.5,
  location: {
    type: "Point",
    coordinates: [-73.9857, 40.7484]
  },
  borough: "Manhattan"
}
```

## Creating a Geo Choropleth Chart

1. Select **Chart Type: Geo Choropleth**
2. Choose your collection
3. Configure the **Location** field to map to a geographic region

```text
Location:  country       (maps to country borders)
Color:     revenue       (Aggregation: Sum)
```

Atlas Charts recognizes ISO 3166-1 alpha-2 country codes (US, GB, DE), US state names, or can be configured for custom GeoJSON region boundaries.

## Zooming to a Region

In the **Customize** tab, set the default map view by specifying center coordinates and zoom level. This ensures the map opens on the region most relevant to your data:

```text
Default Center Latitude:   40.7128
Default Center Longitude:  -74.0060
Default Zoom:              10
```

## Clustering Dense Points

For datasets with thousands of location points, enable **Cluster Points** in the Customize tab. Nearby points are grouped into circles with a count label. As the user zooms in, clusters break apart into individual markers.

## Using a Custom Pipeline for Aggregated Points

Instead of one marker per document, you may want one marker per city with aggregate values:

```javascript
[
  {
    "$group": {
      "_id": "$city",
      "totalOrders": { "$sum": 1 },
      "avgOrderValue": { "$avg": "$orderTotal" },
      "location": { "$first": "$storeLocation" }
    }
  }
]
```

This produces one point per city, sized by order volume.

## Filtering with a Map Bounding Box

Atlas Charts supports a **Map Region Filter** that lets dashboard users draw a bounding box on the map to filter the rest of the dashboard. Enable this in the Filter tab and select **Geographic Filter**. All other charts on the dashboard then update to reflect only data within the drawn area.

## Geospatial Index Requirement

For optimal performance on large collections, ensure your location field has a 2dsphere index:

```javascript
db.restaurants.createIndex({ location: "2dsphere" });
```

Without this index, the chart may time out on large collections.

## Summary

Geospatial charts in MongoDB Atlas Charts support point maps, choropleth maps, and heatmaps. Geo Scatter charts accept a GeoJSON coordinates field or separate latitude/longitude fields and support Color and Size channels for multi-dimensional visualization. Geo Choropleth charts map document field values to geographic regions using aggregate color intensity. Enable point clustering for dense datasets, set default map bounds in Customize, and ensure a 2dsphere index exists for performant queries on large collections.
