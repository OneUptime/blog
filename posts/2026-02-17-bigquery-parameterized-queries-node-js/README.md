# How to Run BigQuery Parameterized Queries from Node.js Using the google-cloud/bigquery Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Node.js, SQL, Google Cloud

Description: A practical guide to running parameterized queries in BigQuery from Node.js using the google-cloud/bigquery library to prevent SQL injection and improve performance.

---

Running raw SQL queries with user-provided values is a recipe for SQL injection vulnerabilities. BigQuery supports parameterized queries, which let you safely pass values into your SQL statements without string concatenation. The `@google-cloud/bigquery` Node.js library makes this straightforward, and in this post I will show you how to use both named and positional parameters, handle different data types, and work with arrays and structs.

## Why Parameterized Queries Matter

When you build SQL queries by concatenating strings, you open yourself up to injection attacks and also lose the benefit of query caching. BigQuery caches the results of identical queries, and parameterized queries with the same structure but different parameter values can still benefit from the query plan cache. Beyond security and performance, parameterized queries also handle type coercion correctly - you do not need to worry about formatting dates, escaping strings, or converting numbers yourself.

## Setting Up

Install the BigQuery client library in your project.

```bash
# Install the BigQuery library
npm install @google-cloud/bigquery
```

Then create your client instance.

```javascript
// Initialize the BigQuery client
const { BigQuery } = require('@google-cloud/bigquery');

const bigquery = new BigQuery({
  projectId: 'your-gcp-project-id',
});
```

## Named Parameters

Named parameters use the `@paramName` syntax in your SQL query and are passed as a `params` object. This is the most common and readable approach.

```javascript
// Query with named parameters - the @ prefix marks each parameter
async function getOrdersByStatus(status, minAmount) {
  const query = `
    SELECT order_id, customer_name, amount, created_at
    FROM \`your-project.orders_dataset.orders\`
    WHERE status = @status
      AND amount >= @minAmount
    ORDER BY created_at DESC
    LIMIT 100
  `;

  const options = {
    query,
    params: {
      status: status,       // String parameter
      minAmount: minAmount,  // Numeric parameter
    },
  };

  const [rows] = await bigquery.query(options);
  console.log(`Found ${rows.length} orders`);
  return rows;
}

// Usage
getOrdersByStatus('shipped', 50.00);
```

BigQuery infers the parameter types from the JavaScript values you pass. Strings become `STRING`, numbers become `FLOAT64` or `INT64`, booleans become `BOOL`, and Date objects become `TIMESTAMP`.

## Positional Parameters

If you prefer positional parameters (using `?` placeholders), you can pass parameters as an array instead. Set the `params` option to an array and set `types` accordingly.

```javascript
// Query with positional parameters - values are matched in order
async function getRecentOrders(daysBack, limit) {
  const query = `
    SELECT order_id, customer_name, amount
    FROM \`your-project.orders_dataset.orders\`
    WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ? DAY)
    ORDER BY created_at DESC
    LIMIT ?
  `;

  const options = {
    query,
    params: [daysBack, limit],  // Positional - order matters
  };

  const [rows] = await bigquery.query(options);
  return rows;
}
```

I generally prefer named parameters because they are self-documenting and less error-prone when queries get long.

## Specifying Parameter Types Explicitly

Sometimes BigQuery cannot infer the correct type from a JavaScript value. For example, the number `42` could be `INT64` or `FLOAT64`. You can explicitly specify types using the `types` option.

```javascript
// Explicitly specify parameter types when inference is not enough
async function queryWithExplicitTypes(customerId, startDate) {
  const query = `
    SELECT *
    FROM \`your-project.analytics.events\`
    WHERE customer_id = @customerId
      AND event_timestamp >= @startDate
  `;

  const options = {
    query,
    params: {
      customerId: customerId,
      startDate: startDate,
    },
    types: {
      customerId: 'INT64',       // Force integer type
      startDate: 'TIMESTAMP',    // Ensure timestamp handling
    },
  };

  const [rows] = await bigquery.query(options);
  return rows;
}

// Pass a Date object for the timestamp
queryWithExplicitTypes(12345, new Date('2025-01-01T00:00:00Z'));
```

## Working with Array Parameters

BigQuery supports `UNNEST` for working with arrays, and you can pass JavaScript arrays as parameters.

```javascript
// Pass an array of values to use with IN or UNNEST
async function getOrdersByIds(orderIds) {
  const query = `
    SELECT order_id, customer_name, amount, status
    FROM \`your-project.orders_dataset.orders\`
    WHERE order_id IN UNNEST(@orderIds)
  `;

  const options = {
    query,
    params: {
      orderIds: orderIds,  // Pass a JavaScript array directly
    },
    types: {
      orderIds: ['STRING'],  // Array of strings
    },
  };

  const [rows] = await bigquery.query(options);
  return rows;
}

// Usage - find specific orders
getOrdersByIds(['ORD-001', 'ORD-002', 'ORD-003']);
```

The `types` value for arrays is itself an array containing the element type. So `['STRING']` means "array of STRING", `['INT64']` means "array of INT64", and so on.

## Working with Struct Parameters

For more complex parameter types, you can pass struct (object) parameters.

```javascript
// Use a struct parameter for complex filtering
async function queryWithStruct() {
  const query = `
    SELECT *
    FROM \`your-project.analytics.events\`
    WHERE event_name = @filter.event_name
      AND event_category = @filter.category
  `;

  const options = {
    query,
    params: {
      filter: {
        event_name: 'page_view',
        category: 'marketing',
      },
    },
    types: {
      filter: {
        event_name: 'STRING',
        category: 'STRING',
      },
    },
  };

  const [rows] = await bigquery.query(options);
  return rows;
}
```

## Handling NULL Values

Passing `null` as a parameter value requires explicit type specification because BigQuery cannot infer the type from a null value.

```javascript
// Handle nullable parameters properly
async function queryWithNullable(status, region) {
  const query = `
    SELECT *
    FROM \`your-project.orders_dataset.orders\`
    WHERE status = @status
      AND (region = @region OR @region IS NULL)
  `;

  const options = {
    query,
    params: {
      status: status,
      region: region,  // Can be null
    },
    types: {
      status: 'STRING',
      region: 'STRING',  // Must specify type even for null values
    },
  };

  const [rows] = await bigquery.query(options);
  return rows;
}

// Query with region filter
queryWithNullable('active', 'US-EAST');

// Query without region filter - pass null
queryWithNullable('active', null);
```

## Running Parameterized DML Statements

Parameterized queries work with DML statements too, not just SELECT queries.

```javascript
// Use parameterized DML for safe data modifications
async function updateOrderStatus(orderId, newStatus) {
  const query = `
    UPDATE \`your-project.orders_dataset.orders\`
    SET status = @newStatus, updated_at = CURRENT_TIMESTAMP()
    WHERE order_id = @orderId
  `;

  const options = {
    query,
    params: {
      orderId: orderId,
      newStatus: newStatus,
    },
  };

  const [job] = await bigquery.createQueryJob(options);
  const [result] = await job.getQueryResults();

  // DML results include the number of affected rows
  console.log(`Updated ${job.metadata.statistics.query.numDmlAffectedRows} rows`);
}
```

## Building Dynamic Queries Safely

Sometimes you need to build queries dynamically based on user input. You can still use parameters for the values while constructing the query structure in code.

```javascript
// Build a dynamic query while keeping values parameterized
async function searchOrders(filters) {
  let conditions = [];
  let params = {};
  let types = {};

  // Build conditions based on which filters are provided
  if (filters.status) {
    conditions.push('status = @status');
    params.status = filters.status;
    types.status = 'STRING';
  }

  if (filters.minAmount !== undefined) {
    conditions.push('amount >= @minAmount');
    params.minAmount = filters.minAmount;
    types.minAmount = 'FLOAT64';
  }

  if (filters.customerName) {
    conditions.push('LOWER(customer_name) LIKE LOWER(@customerName)');
    params.customerName = `%${filters.customerName}%`;
    types.customerName = 'STRING';
  }

  // Combine conditions with AND
  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const query = `
    SELECT order_id, customer_name, amount, status, created_at
    FROM \`your-project.orders_dataset.orders\`
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 100
  `;

  const [rows] = await bigquery.query({ query, params, types });
  return rows;
}

// Example usage with partial filters
searchOrders({ status: 'pending', minAmount: 100 });
```

## Error Handling

Parameterized query errors usually relate to type mismatches or missing parameters. Wrap your queries in try-catch blocks and handle errors appropriately.

```javascript
// Proper error handling for parameterized queries
async function safeQuery(userId) {
  try {
    const [rows] = await bigquery.query({
      query: 'SELECT * FROM `my-project.dataset.users` WHERE id = @userId',
      params: { userId },
      types: { userId: 'INT64' },
    });
    return { success: true, data: rows };
  } catch (error) {
    // Common errors: type mismatch, missing parameter, invalid query
    console.error('BigQuery error:', error.message);

    if (error.code === 400) {
      return { success: false, error: 'Invalid query or parameters' };
    }
    throw error;
  }
}
```

Parameterized queries in BigQuery are essential for building secure, maintainable Node.js applications. They protect against SQL injection, improve query plan caching, and handle type conversion automatically. Whether you are building an API that queries BigQuery based on user input or a backend service that processes data, always prefer parameterized queries over string concatenation.
