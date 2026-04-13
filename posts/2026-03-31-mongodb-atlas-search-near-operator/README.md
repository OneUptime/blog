# How to Use the near Operator for Date and Number Proximity in Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Near, Proximity, Atlas

Description: Learn how to use the Atlas Search near operator to score documents by proximity to a target date or number, enabling relevance-based date and numeric ranking.

---

The `near` operator in MongoDB Atlas Search scores documents based on how close a numeric or date field value is to a specified origin. Documents nearest to the target score highest, and score degrades as values move further away. This is distinct from geospatial `near` - it works with numbers and dates.

## How near Scoring Works

The score follows an inverse decay function:
- Documents where the field equals the `origin` receive the highest score
- Score decreases as the value moves away from `origin`
- The `pivot` parameter controls how fast the score decays - it defines the distance at which the score drops to half

## Basic Numeric near

Score products by how close their price is to $50:

```javascript
db.products.aggregate([
  {
    $search: {
      near: {
        path: "price",
        origin: 50,
        pivot: 20
      }
    }
  },
  {
    $project: {
      name: 1,
      price: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $sort: { score: -1 } },
  { $limit: 10 }
])
```

A product at $50 scores highest. One at $70 (pivot distance away) scores half as much.

## Date Proximity Scoring

Surface the most recently published articles, with older articles scoring lower. The `pivot` is a duration in milliseconds:

```javascript
const now = new Date();

db.articles.aggregate([
  {
    $search: {
      near: {
        path: "publishedAt",
        origin: now,
        pivot: 2592000000  // 30 days in milliseconds
      }
    }
  },
  {
    $project: {
      title: 1,
      publishedAt: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $sort: { score: -1 } },
  { $limit: 5 }
])
```

Articles published within the last 30 days score higher than older ones.

## Combining near with Text Search

Blend relevance and recency by combining `near` and `text` inside `compound`:

```javascript
db.articles.aggregate([
  {
    $search: {
      compound: {
        must: [
          {
            text: {
              query: "mongodb performance",
              path: ["title", "body"]
            }
          }
        ],
        should: [
          {
            near: {
              path: "publishedAt",
              origin: new Date(),
              pivot: 7776000000,  // 90 days
              score: { boost: { value: 1.5 } }
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      title: 1,
      publishedAt: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $sort: { score: -1 } }
])
```

The query scores articles higher if they are both relevant to "mongodb performance" AND recently published.

## Scoring Events by Upcoming Date

For event listings, surface events happening soonest:

```javascript
const today = new Date();

db.events.aggregate([
  {
    $search: {
      compound: {
        filter: [
          {
            range: {
              path: "eventDate",
              gte: today
            }
          }
        ],
        should: [
          {
            near: {
              path: "eventDate",
              origin: today,
              pivot: 604800000  // 7 days
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      title: 1,
      eventDate: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $sort: { score: -1 } },
  { $limit: 10 }
])
```

## Index Requirements

Fields must be typed correctly in the index mapping:

```json
{
  "mappings": {
    "fields": {
      "price": { "type": "number" },
      "publishedAt": { "type": "date" },
      "eventDate": { "type": "date" }
    }
  }
}
```

## Summary

The `near` operator scores documents by numeric or temporal proximity to a target value, enabling relevance-boosted date ranking and price proximity searches. It integrates naturally with `compound` `should` clauses, letting you blend full-text relevance with recency or price closeness in a single query.

