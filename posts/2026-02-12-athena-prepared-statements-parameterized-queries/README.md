# How to Use Athena Prepared Statements for Parameterized Queries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Athena, SQL, Security

Description: Learn how to use Athena prepared statements for parameterized queries to prevent SQL injection, improve query reusability, and simplify application code.

---

If your application constructs Athena SQL queries by concatenating strings with user input, you've got a SQL injection risk. Even if you're sanitizing inputs yourself, it's error-prone and unnecessary. Athena prepared statements let you define a query template with parameter placeholders, then execute it with specific values. The parameters are handled safely by Athena itself, so you don't have to worry about escaping or injection.

Beyond security, prepared statements make your queries more reusable and your application code cleaner.

## Creating a Prepared Statement

A prepared statement is a named query template with `?` placeholders where parameters go:

```bash
# Create a prepared statement for looking up sales by region and date range
aws athena create-prepared-statement \
    --statement-name "sales_by_region" \
    --work-group "primary" \
    --query-statement "SELECT sale_date, category, SUM(amount) as total_sales, COUNT(*) as transaction_count FROM sales WHERE region = ? AND sale_date BETWEEN ? AND ? GROUP BY sale_date, category ORDER BY sale_date, total_sales DESC"
```

The `?` marks are positional parameters that get replaced when you execute the statement.

Here are a few more practical examples:

```bash
# Prepared statement for customer lookup
aws athena create-prepared-statement \
    --statement-name "customer_details" \
    --work-group "primary" \
    --query-statement "SELECT customer_id, name, email, signup_date, total_orders, lifetime_value FROM customers WHERE customer_id = ?"

# Prepared statement for log search with multiple filters
aws athena create-prepared-statement \
    --statement-name "search_logs" \
    --work-group "primary" \
    --query-statement "SELECT timestamp, service, level, message FROM application_logs WHERE service = ? AND level = ? AND timestamp >= ? AND timestamp < ? ORDER BY timestamp DESC LIMIT 1000"

# Prepared statement for inventory check
aws athena create-prepared-statement \
    --statement-name "low_inventory" \
    --work-group "primary" \
    --query-statement "SELECT product_id, product_name, warehouse_id, current_stock FROM inventory WHERE warehouse_id = ? AND current_stock < ? ORDER BY current_stock ASC"
```

## Executing Prepared Statements

Execute a prepared statement using the EXECUTE command:

```bash
# Execute the sales_by_region prepared statement
aws athena start-query-execution \
    --query-string "EXECUTE sales_by_region USING 'us-east-1', DATE '2026-01-01', DATE '2026-01-31'" \
    --work-group "primary" \
    --result-configuration '{"OutputLocation": "s3://my-athena-results/output/"}'
```

```bash
# Execute the customer lookup
aws athena start-query-execution \
    --query-string "EXECUTE customer_details USING 12345" \
    --work-group "primary" \
    --result-configuration '{"OutputLocation": "s3://my-athena-results/output/"}'

# Execute the log search
aws athena start-query-execution \
    --query-string "EXECUTE search_logs USING 'payment-api', 'ERROR', TIMESTAMP '2026-02-12 00:00:00', TIMESTAMP '2026-02-13 00:00:00'" \
    --work-group "primary" \
    --result-configuration '{"OutputLocation": "s3://my-athena-results/output/"}'
```

## Using Prepared Statements in Python

Here's how to use prepared statements from a Python application:

```python
# Python application using Athena prepared statements
import boto3
import time

athena = boto3.client('athena', region_name='us-east-1')

def execute_prepared_statement(statement_name, parameters, workgroup='primary'):
    """Execute a prepared statement and return results."""

    # Build the EXECUTE query with parameters
    param_str = ', '.join(format_parameter(p) for p in parameters)
    query = f"EXECUTE {statement_name} USING {param_str}"

    # Start the query execution
    response = athena.start_query_execution(
        QueryString=query,
        WorkGroup=workgroup,
        ResultConfiguration={
            'OutputLocation': 's3://my-athena-results/output/'
        }
    )

    execution_id = response['QueryExecutionId']

    # Wait for the query to complete
    while True:
        status = athena.get_query_execution(
            QueryExecutionId=execution_id
        )
        state = status['QueryExecution']['Status']['State']

        if state == 'SUCCEEDED':
            break
        elif state in ['FAILED', 'CANCELLED']:
            reason = status['QueryExecution']['Status'].get('StateChangeReason', 'Unknown')
            raise Exception(f"Query {state}: {reason}")

        time.sleep(1)

    # Fetch results
    results = athena.get_query_results(
        QueryExecutionId=execution_id
    )

    return parse_results(results)


def format_parameter(value):
    """Format a parameter value for the EXECUTE statement."""
    if isinstance(value, str):
        # Escape single quotes in string values
        escaped = value.replace("'", "''")
        return f"'{escaped}'"
    elif isinstance(value, (int, float)):
        return str(value)
    elif value is None:
        return 'NULL'
    else:
        return f"'{value}'"


def parse_results(results):
    """Parse Athena query results into a list of dictionaries."""
    rows = results['ResultSet']['Rows']
    if not rows:
        return []

    # First row contains column headers
    headers = [col['VarCharValue'] for col in rows[0]['Data']]

    parsed = []
    for row in rows[1:]:
        values = [col.get('VarCharValue', None) for col in row['Data']]
        parsed.append(dict(zip(headers, values)))

    return parsed


# Example usage
# Query sales for a specific region and date range
results = execute_prepared_statement(
    'sales_by_region',
    ['us-east-1', "DATE '2026-01-01'", "DATE '2026-01-31'"]
)

for row in results:
    print(f"{row['sale_date']}: {row['category']} - ${row['total_sales']}")
```

## Using in a Lambda Function

Here's a Lambda function that exposes Athena prepared statements as an API endpoint:

```python
# Lambda function that serves as an API for Athena prepared statements
# Prevents SQL injection by never constructing raw SQL from user input
import boto3
import json
import time

athena = boto3.client('athena')

# Map of allowed queries and their parameter types
ALLOWED_QUERIES = {
    'sales_by_region': {
        'params': ['string', 'date', 'date'],
        'description': 'Get sales by region and date range'
    },
    'customer_details': {
        'params': ['integer'],
        'description': 'Look up customer by ID'
    },
    'search_logs': {
        'params': ['string', 'string', 'timestamp', 'timestamp'],
        'description': 'Search logs by service, level, and time range'
    }
}

def lambda_handler(event, context):
    body = json.loads(event.get('body', '{}'))
    statement_name = body.get('query_name')
    parameters = body.get('parameters', [])

    # Validate the query name
    if statement_name not in ALLOWED_QUERIES:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': f'Unknown query: {statement_name}',
                'available_queries': list(ALLOWED_QUERIES.keys())
            })
        }

    # Validate parameter count
    expected_params = ALLOWED_QUERIES[statement_name]['params']
    if len(parameters) != len(expected_params):
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': f'Expected {len(expected_params)} parameters, got {len(parameters)}'
            })
        }

    # Format parameters safely
    formatted_params = []
    for value, param_type in zip(parameters, expected_params):
        if param_type == 'string':
            formatted_params.append(f"'{str(value).replace(chr(39), chr(39)+chr(39))}'")
        elif param_type == 'integer':
            formatted_params.append(str(int(value)))
        elif param_type == 'date':
            formatted_params.append(f"DATE '{value}'")
        elif param_type == 'timestamp':
            formatted_params.append(f"TIMESTAMP '{value}'")

    param_str = ', '.join(formatted_params)
    query = f"EXECUTE {statement_name} USING {param_str}"

    # Execute the query
    execution = athena.start_query_execution(
        QueryString=query,
        WorkGroup='primary',
        ResultConfiguration={
            'OutputLocation': 's3://my-athena-results/api-queries/'
        }
    )

    execution_id = execution['QueryExecutionId']

    # Poll for completion (with timeout)
    max_wait = 30
    elapsed = 0
    while elapsed < max_wait:
        status = athena.get_query_execution(QueryExecutionId=execution_id)
        state = status['QueryExecution']['Status']['State']

        if state == 'SUCCEEDED':
            results = athena.get_query_results(QueryExecutionId=execution_id)
            return {
                'statusCode': 200,
                'body': json.dumps(format_results(results))
            }
        elif state in ['FAILED', 'CANCELLED']:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Query {state}'})
            }

        time.sleep(1)
        elapsed += 1

    return {
        'statusCode': 202,
        'body': json.dumps({
            'message': 'Query still running',
            'execution_id': execution_id
        })
    }


def format_results(results):
    rows = results['ResultSet']['Rows']
    if len(rows) <= 1:
        return {'data': [], 'count': 0}

    headers = [col['VarCharValue'] for col in rows[0]['Data']]
    data = []
    for row in rows[1:]:
        values = [col.get('VarCharValue') for col in row['Data']]
        data.append(dict(zip(headers, values)))

    return {'data': data, 'count': len(data)}
```

## Managing Prepared Statements

List, update, and delete prepared statements:

```bash
# List all prepared statements in a workgroup
aws athena list-prepared-statements --work-group "primary"

# Get details of a specific prepared statement
aws athena get-prepared-statement \
    --statement-name "sales_by_region" \
    --work-group "primary"

# Update a prepared statement (add a new column to the output)
aws athena update-prepared-statement \
    --statement-name "sales_by_region" \
    --work-group "primary" \
    --query-statement "SELECT sale_date, category, region, SUM(amount) as total_sales, COUNT(*) as transaction_count, COUNT(DISTINCT customer_id) as unique_customers FROM sales WHERE region = ? AND sale_date BETWEEN ? AND ? GROUP BY sale_date, category, region ORDER BY sale_date, total_sales DESC"

# Delete a prepared statement
aws athena delete-prepared-statement \
    --statement-name "old_query" \
    --work-group "primary"
```

## Workgroup Isolation

Prepared statements are scoped to workgroups. You can use different workgroups for different teams or applications, each with their own set of prepared statements:

```bash
# Create a workgroup for the API application
aws athena create-work-group \
    --name "api-queries" \
    --configuration '{
        "ResultConfiguration": {
            "OutputLocation": "s3://my-athena-results/api/"
        },
        "EnforceWorkGroupConfiguration": true,
        "BytesScannedCutoffPerQuery": 10737418240
    }'

# Create prepared statements in the API workgroup
aws athena create-prepared-statement \
    --statement-name "sales_by_region" \
    --work-group "api-queries" \
    --query-statement "SELECT sale_date, SUM(amount) FROM sales WHERE region = ? AND sale_date BETWEEN ? AND ? GROUP BY sale_date"
```

The `BytesScannedCutoffPerQuery` setting (10 GB in this example) prevents any single query from scanning too much data, protecting you from runaway costs even if someone finds a way to execute expensive queries.

Prepared statements are a best practice for any application that queries Athena. They're more secure, cleaner, and easier to manage than string concatenation. For optimizing the tables these queries run against, see [CTAS for optimized tables](https://oneuptime.com/blog/post/athena-ctas-creating-optimized-tables/view) and [partitioning data in S3](https://oneuptime.com/blog/post/partition-data-s3-efficient-athena-queries/view).
