# How to Generate Realistic Test Data for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Test Data, Data Generation, Testing, Development, Synthetic Data

Description: A comprehensive guide to generating realistic test data for ClickHouse using generateRandom, dictionaries, and custom data generators for development and testing environments.

---

Realistic test data is essential for development, testing, and performance benchmarking. This guide covers ClickHouse's built-in data generation functions and strategies for creating meaningful synthetic data.

## Built-in Data Generation

### Using generateRandom

```sql
-- Generate random table data
SELECT * FROM generateRandom(
    'id UInt64, name String, age UInt8, salary Float64',
    1,      -- Random seed
    10,     -- Max string length
    5       -- Max array length
)
LIMIT 10;

-- Insert random data into existing table
INSERT INTO users
SELECT * FROM generateRandom(
    'id UInt64, name String, email String, created_at DateTime',
    42, 20, 1
)
LIMIT 100000;
```

### Using numbers() for Controlled Generation

```sql
-- Generate events with specific patterns
INSERT INTO events (timestamp, user_id, event_type, revenue)
SELECT
    now() - INTERVAL number SECOND AS timestamp,
    rand() % 10000 AS user_id,
    arrayElement(['page_view', 'click', 'purchase', 'signup'], (rand() % 4) + 1) AS event_type,
    if(rand() % 10 = 0, round(rand() % 1000 / 10, 2), 0) AS revenue
FROM numbers(1000000);

-- Generate time-series with realistic patterns
INSERT INTO metrics (timestamp, metric_name, value, host)
SELECT
    toDateTime('2024-01-01 00:00:00') + INTERVAL number MINUTE AS timestamp,
    arrayElement(['cpu', 'memory', 'disk_io', 'network'], (number % 4) + 1) AS metric_name,
    -- Add daily pattern with noise
    50 + 30 * sin(number * 0.004363) + (rand() % 20 - 10) AS value,
    concat('server-', toString((number % 10) + 1)) AS host
FROM numbers(43200);  -- 30 days of minute data
```

## Realistic Data Patterns

### User Data Generation

```sql
-- Create realistic user profiles
INSERT INTO users (user_id, username, email, country, signup_date, plan_type)
SELECT
    number AS user_id,
    concat(
        arrayElement(['john', 'jane', 'bob', 'alice', 'charlie', 'diana', 'eve', 'frank'], (rand() % 8) + 1),
        toString(rand() % 1000)
    ) AS username,
    concat(
        lower(username),
        '@',
        arrayElement(['gmail.com', 'yahoo.com', 'outlook.com', 'company.com'], (rand() % 4) + 1)
    ) AS email,
    arrayElement(
        ['US', 'UK', 'DE', 'FR', 'JP', 'BR', 'IN', 'AU', 'CA', 'MX'],
        -- Weighted distribution (more US users)
        if(rand() % 100 < 40, 1, (rand() % 9) + 2)
    ) AS country,
    toDate('2020-01-01') + INTERVAL (rand() % 1500) DAY AS signup_date,
    arrayElement(
        ['free', 'basic', 'pro', 'enterprise'],
        -- Weighted: more free users
        if(rand() % 100 < 60, 1, if(rand() % 100 < 85, 2, if(rand() % 100 < 95, 3, 4)))
    ) AS plan_type
FROM numbers(100000);
```

### E-commerce Data Generation

```sql
-- Products
INSERT INTO products (product_id, name, category, price, stock)
SELECT
    number AS product_id,
    concat(
        arrayElement(['Premium', 'Basic', 'Pro', 'Ultra', 'Classic'], (rand() % 5) + 1),
        ' ',
        arrayElement(['Widget', 'Gadget', 'Tool', 'Device', 'Accessory'], (rand() % 5) + 1),
        ' ',
        toString(rand() % 100)
    ) AS name,
    arrayElement(
        ['Electronics', 'Clothing', 'Home', 'Sports', 'Books', 'Food'],
        (rand() % 6) + 1
    ) AS category,
    round(5 + rand() % 500 + (rand() % 100) / 100, 2) AS price,
    rand() % 1000 AS stock
FROM numbers(10000);

-- Orders with realistic patterns
INSERT INTO orders (order_id, user_id, product_id, quantity, order_time, status)
SELECT
    number AS order_id,
    rand() % 100000 AS user_id,
    rand() % 10000 AS product_id,
    1 + rand() % 5 AS quantity,
    -- More orders during business hours
    toDateTime('2024-01-01') + INTERVAL number * 30 SECOND +
        INTERVAL (if(rand() % 100 < 70, 9 + rand() % 12, rand() % 24)) HOUR AS order_time,
    arrayElement(
        ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        -- Most orders delivered
        if(rand() % 100 < 70, 4, if(rand() % 100 < 85, 3, if(rand() % 100 < 92, 2, if(rand() % 100 < 97, 1, 5))))
    ) AS status
FROM numbers(1000000);
```

### Log Data Generation

```sql
-- Realistic log entries
INSERT INTO logs (timestamp, level, service, message, trace_id)
SELECT
    now() - INTERVAL number MILLISECOND * 10 AS timestamp,
    arrayElement(
        ['DEBUG', 'INFO', 'WARN', 'ERROR'],
        -- Weighted: mostly INFO
        if(rand() % 100 < 60, 2, if(rand() % 100 < 85, 1, if(rand() % 100 < 95, 3, 4)))
    ) AS level,
    arrayElement(
        ['api-gateway', 'auth-service', 'user-service', 'order-service', 'payment-service'],
        (rand() % 5) + 1
    ) AS service,
    concat(
        arrayElement(['Processing', 'Completed', 'Started', 'Failed', 'Retrying'], (rand() % 5) + 1),
        ' request for user ',
        toString(rand() % 10000),
        ' - ',
        arrayElement(['success', 'timeout', 'error', 'pending'], (rand() % 4) + 1)
    ) AS message,
    generateUUIDv4() AS trace_id
FROM numbers(10000000);
```

## Using Dictionaries for Realistic Values

```sql
-- Create a dictionary of real city names
CREATE TABLE city_data (
    city_id UInt32,
    city_name String,
    country String,
    population UInt32
) ENGINE = Memory;

INSERT INTO city_data VALUES
    (1, 'New York', 'US', 8336817),
    (2, 'Los Angeles', 'US', 3979576),
    (3, 'London', 'UK', 8982000),
    (4, 'Paris', 'FR', 2161000),
    (5, 'Tokyo', 'JP', 13960000),
    (6, 'Berlin', 'DE', 3645000),
    (7, 'Sydney', 'AU', 5312000),
    (8, 'Mumbai', 'IN', 20411000);

CREATE DICTIONARY city_dict (
    city_id UInt32,
    city_name String,
    country String,
    population UInt32
)
PRIMARY KEY city_id
SOURCE(CLICKHOUSE(TABLE 'city_data'))
LAYOUT(FLAT())
LIFETIME(0);

-- Use dictionary for realistic locations
INSERT INTO user_locations (user_id, city, country)
SELECT
    number AS user_id,
    dictGet('city_dict', 'city_name', toUInt32((rand() % 8) + 1)) AS city,
    dictGet('city_dict', 'country', toUInt32((rand() % 8) + 1)) AS country
FROM numbers(100000);
```

## External Data Generation Tools

### Python Faker Integration

```python
from faker import Faker
import clickhouse_connect
import random

fake = Faker()
client = clickhouse_connect.get_client(host='localhost')

def generate_users(count):
    data = []
    for i in range(count):
        data.append({
            'user_id': i + 1,
            'name': fake.name(),
            'email': fake.email(),
            'address': fake.address().replace('\n', ', '),
            'phone': fake.phone_number(),
            'company': fake.company(),
            'created_at': fake.date_time_between(start_date='-2y', end_date='now')
        })
    return data

# Generate and insert
users = generate_users(10000)
client.insert('users', users, column_names=list(users[0].keys()))
```

## Performance Testing Data

```sql
-- Generate large dataset for benchmarking
CREATE TABLE benchmark_data (
    id UInt64,
    timestamp DateTime,
    dimension1 LowCardinality(String),
    dimension2 LowCardinality(String),
    dimension3 String,
    metric1 Float64,
    metric2 Float64,
    metric3 Int64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (dimension1, timestamp);

-- Insert 1 billion rows in batches
INSERT INTO benchmark_data
SELECT
    number AS id,
    toDateTime('2023-01-01') + INTERVAL number SECOND AS timestamp,
    concat('dim1_', toString(number % 100)) AS dimension1,
    concat('dim2_', toString(number % 1000)) AS dimension2,
    concat('dim3_', toString(number % 10000)) AS dimension3,
    rand() / 1000000000.0 * 1000 AS metric1,
    rand() / 1000000000.0 * 100 AS metric2,
    rand() % 1000000 AS metric3
FROM numbers(100000000);
```

## Conclusion

Generating realistic test data in ClickHouse involves:

1. **Built-in functions** like generateRandom() and numbers()
2. **Weighted distributions** for realistic patterns
3. **Dictionaries** for domain-specific values
4. **External tools** like Faker for complex data
5. **Time patterns** for realistic temporal data

With realistic test data, you can effectively develop, test, and benchmark your ClickHouse applications.
