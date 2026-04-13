# How to Query HTTP Endpoints in Atlas Data Federation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Data Federation, REST API

Description: Configure MongoDB Atlas Data Federation to query external HTTP endpoints and REST APIs as virtual collections using standard MQL aggregation pipelines.

---

Atlas Data Federation can treat external HTTP endpoints as queryable data sources. This lets you query REST APIs and internal HTTP services alongside your S3 and Atlas data using the same MongoDB aggregation pipeline syntax.

## When to Use HTTP Data Sources

- Querying internal microservice APIs that expose JSON data
- Including real-time data from external APIs in federated queries
- Joining API data with MongoDB collections in a single pipeline

## Configuring an HTTP Data Source

Add an HTTP store to your FDI storage configuration:

```json
{
  "databases": [
    {
      "name": "api_data",
      "collections": [
        {
          "name": "exchange_rates",
          "dataSources": [
            {
              "storeName": "http-store",
              "urls": [
                "https://api.exchangerate-api.com/v4/latest/USD"
              ]
            }
          ]
        },
        {
          "name": "weather",
          "dataSources": [
            {
              "storeName": "http-store",
              "urls": [
                "https://api.weather.internal/current?location=us-east"
              ]
            }
          ]
        }
      ]
    }
  ],
  "stores": [
    {
      "name": "http-store",
      "provider": "http",
      "urls": [
        "https://api.exchangerate-api.com",
        "https://api.weather.internal"
      ],
      "defaultFormat": ".json",
      "allowInsecure": false
    }
  ]
}
```

## Querying HTTP Data

Once configured, query the endpoint as a collection:

```javascript
// Returns parsed JSON from the HTTP endpoint
db.exchange_rates.findOne()

// Aggregate with standard MQL
db.exchange_rates.aggregate([
  { $project: { rates: 1 } },
  {
    $addFields: {
      eur: "$rates.EUR",
      gbp: "$rates.GBP",
      jpy: "$rates.JPY"
    }
  }
])
```

## Joining HTTP API Data with Atlas Collections

Combine live API data with MongoDB documents:

```javascript
// Join product prices with live exchange rates
db.exchange_rates.aggregate([
  // Get current rates from HTTP endpoint
  { $project: { rates: 1 } },

  // Join with products from Atlas cluster
  {
    $lookup: {
      from: "products",         // Atlas cluster collection
      pipeline: [
        { $project: { name: 1, priceUSD: 1 } },
        { $limit: 100 }
      ],
      as: "products"
    }
  },
  { $unwind: "$products" },
  {
    $project: {
      name: "$products.name",
      priceUSD: "$products.priceUSD",
      priceEUR: { $multiply: ["$products.priceUSD", "$rates.EUR"] },
      priceGBP: { $multiply: ["$products.priceUSD", "$rates.GBP"] }
    }
  }
])
```

## Authentication Limitations

Atlas Data Federation HTTP stores only support publicly accessible URLs that do not require authentication. You cannot configure custom headers or authentication credentials on HTTP store requests. If you need to query authenticated APIs, consider these alternatives:

- Place an unauthenticated reverse proxy or API gateway in front of the authenticated service that restricts access by IP allowlisting
- Periodically fetch data from the authenticated API and store it in S3 or an Atlas collection, then query that data source through Data Federation instead

## Multiple Endpoint URLs

Map multiple endpoint URLs to a single collection for union queries:

```json
{
  "name": "sensor_readings",
  "dataSources": [
    {
      "storeName": "http-store",
      "urls": [
        "https://sensors.internal/region/us-east/latest",
        "https://sensors.internal/region/us-west/latest",
        "https://sensors.internal/region/eu-central/latest"
      ]
    }
  ]
}
```

Data Federation merges responses from all URLs into a single collection.

## Limitations

HTTP data sources in Atlas Data Federation are suitable for relatively small API responses. They are not designed for high-throughput ingestion or large paginated APIs. Each query fetches the endpoint fresh, so caching is not supported. For large datasets, use S3 or Atlas collections instead.

## Summary

Atlas Data Federation HTTP data sources let you query REST API endpoints as virtual MongoDB collections. Configure the endpoint URLs and optional authentication headers in the store definition, then query with standard MQL including `$lookup` joins against Atlas collections. This is most useful for enriching existing MongoDB queries with real-time data from small, low-latency API responses.
