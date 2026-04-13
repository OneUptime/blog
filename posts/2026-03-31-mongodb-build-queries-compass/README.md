# How to Build Queries in MongoDB Compass

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compass, Query, Filter, Development

Description: Learn how to use MongoDB Compass to build, test, and export queries visually without writing raw MQL from scratch.

---

## The Compass Query Bar

MongoDB Compass provides a query bar at the top of the Documents tab that lets you construct MQL filter, projection, sort, skip, and limit clauses interactively. Compass validates your syntax as you type and executes the query when you click Find or press Enter.

## Writing a Basic Filter

Click into the Filter field and type a query object:

```json
{ "status": "active", "age": { "$gte": 25 } }
```

Click Find to execute. Compass shows matching documents and displays the count in the toolbar.

## Using the Query History

Compass saves every query you run. Click the history icon (clock) next to the filter bar to recall recent queries. You can also star a query to save it permanently for reuse.

## Adding Projections

Limit which fields appear in results using the Project field:

```json
{ "name": 1, "email": 1, "status": 1, "_id": 0 }
```

This is equivalent to `db.users.find({...}, { name: 1, email: 1, status: 1, _id: 0 })`.

## Sorting Results

Use the Sort field to order results:

```json
{ "createdAt": -1 }
```

## Pagination Controls

Use Skip and Limit to page through results:

```text
Skip: 20
Limit: 10
```

## The Schema Tab for Query Discovery

Before writing queries, use the Schema tab to understand your data. Compass samples documents and shows field types, cardinality, and value distributions as charts. Clicking a value in a chart automatically inserts it into the Filter field - this is the fastest way to build queries against unfamiliar collections.

## Query Options Panel

Expand the Options row below the filter bar to access all query parameters at once:

```text
Filter:  { "category": "electronics" }
Project: { "name": 1, "price": 1 }
Sort:    { "price": 1 }
Skip:    0
Limit:   25
```

## Exporting a Query to Code

Once you are happy with a query, click the Export to Language button (the `</>` icon). Compass generates equivalent driver code in multiple languages:

**JavaScript (Node.js):**

```javascript
collection.find(
  { category: "electronics" },
  { projection: { name: 1, price: 1 }, sort: { price: 1 }, limit: 25 }
);
```

**Python:**

```python
collection.find(
    {"category": "electronics"},
    projection={"name": 1, "price": 1},
    sort=[("price", 1)],
    limit=25
)
```

**Java:**

```java
collection.find(eq("category", "electronics"))
    .projection(include("name", "price"))
    .sort(ascending("price"))
    .limit(25);
```

## Using $regex for Text Search

Compass supports all MQL operators in the filter bar:

```json
{ "name": { "$regex": "^widget", "$options": "i" } }
```

## Array Queries

Query documents where an array field contains a specific value:

```json
{ "tags": "featured" }
```

Query for documents where the array contains all specified values:

```json
{ "scores": { "$all": [90, 95] } }
```

## Summary

Compass transforms query building from a text editor exercise into an interactive visual workflow. Use the Schema tab to discover field distributions, the filter bar to write and test MQL, and the Export to Language button to translate working queries into driver code. Query history and starred queries make it easy to return to complex filters without retyping them.
