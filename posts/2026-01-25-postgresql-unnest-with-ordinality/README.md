# How to Use unnest() with Element Numbers in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, SQL, Arrays, unnest, WITH ORDINALITY, Data Processing

Description: Learn how to expand PostgreSQL arrays into rows while preserving element positions using unnest() with WITH ORDINALITY. This guide covers syntax, practical examples, and common use cases.

---

PostgreSQL arrays are powerful for storing ordered collections, but working with individual elements requires expanding them into rows. The `unnest()` function does this, and `WITH ORDINALITY` adds element positions. Together, they enable sophisticated array processing while maintaining element order.

## Basic unnest() Usage

The `unnest()` function transforms an array into a set of rows, one per element.

```sql
-- Simple array expansion
SELECT unnest(ARRAY['apple', 'banana', 'cherry']) AS fruit;

-- Result:
-- fruit
-- -------
-- apple
-- banana
-- cherry

-- Unnest from a table column
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100),
    items TEXT[]
);

INSERT INTO orders (customer_name, items)
VALUES
    ('Alice', ARRAY['laptop', 'mouse', 'keyboard']),
    ('Bob', ARRAY['monitor', 'webcam']);

-- Expand items into individual rows
SELECT id, customer_name, unnest(items) AS item
FROM orders;
```

## Adding Element Numbers with WITH ORDINALITY

`WITH ORDINALITY` adds a column containing the 1-based position of each element.

```sql
-- Basic WITH ORDINALITY syntax
SELECT *
FROM unnest(ARRAY['first', 'second', 'third']) WITH ORDINALITY AS t(value, position);

-- Result:
-- value  | position
-- -------+---------
-- first  | 1
-- second | 2
-- third  | 3

-- Applied to table data
SELECT
    o.id,
    o.customer_name,
    item.value AS item_name,
    item.ordinality AS item_position
FROM orders o
CROSS JOIN LATERAL unnest(o.items) WITH ORDINALITY AS item(value, ordinality);
```

## Preserving Original Order

Element position is crucial when order matters, such as ranked lists or sequential data.

```sql
-- Table storing ranked preferences
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY,
    favorite_genres TEXT[]  -- Ordered by preference
);

INSERT INTO user_preferences VALUES
    (1, ARRAY['rock', 'jazz', 'classical']),
    (2, ARRAY['pop', 'electronic', 'hip-hop', 'r&b']);

-- Extract with rank position
SELECT
    user_id,
    genre,
    rank
FROM user_preferences
CROSS JOIN LATERAL unnest(favorite_genres) WITH ORDINALITY AS prefs(genre, rank);

-- Result:
-- user_id | genre      | rank
-- --------+------------+------
-- 1       | rock       | 1
-- 1       | jazz       | 2
-- 1       | classical  | 3
-- 2       | pop        | 1
-- 2       | electronic | 2
-- 2       | hip-hop    | 3
-- 2       | r&b        | 4
```

## Filtering by Position

Use the ordinal value to filter specific positions.

```sql
-- Get only the first choice for each user
SELECT user_id, genre AS top_choice
FROM user_preferences
CROSS JOIN LATERAL unnest(favorite_genres) WITH ORDINALITY AS prefs(genre, rank)
WHERE rank = 1;

-- Get top 3 choices
SELECT user_id, genre, rank
FROM user_preferences
CROSS JOIN LATERAL unnest(favorite_genres) WITH ORDINALITY AS prefs(genre, rank)
WHERE rank <= 3;

-- Get the last element (requires knowing array length)
SELECT user_id, genre AS last_choice
FROM user_preferences
CROSS JOIN LATERAL unnest(favorite_genres) WITH ORDINALITY AS prefs(genre, rank)
WHERE rank = array_length(favorite_genres, 1);
```

## Multiple Arrays with Synchronized Positions

When unnesting multiple arrays, `WITH ORDINALITY` helps keep them aligned.

```sql
-- Table with parallel arrays
CREATE TABLE survey_responses (
    respondent_id INTEGER PRIMARY KEY,
    questions TEXT[],
    answers TEXT[]
);

INSERT INTO survey_responses VALUES
    (1, ARRAY['Q1', 'Q2', 'Q3'], ARRAY['Yes', 'No', 'Maybe']),
    (2, ARRAY['Q1', 'Q2', 'Q3'], ARRAY['No', 'Yes', 'Yes']);

-- Method 1: unnest multiple arrays together (assumes equal lengths)
SELECT
    respondent_id,
    question,
    answer
FROM survey_responses,
LATERAL unnest(questions, answers) AS qa(question, answer);

-- Method 2: Use ordinality to join parallel arrays
SELECT
    s.respondent_id,
    q.question,
    a.answer
FROM survey_responses s
CROSS JOIN LATERAL unnest(s.questions) WITH ORDINALITY AS q(question, q_ord)
CROSS JOIN LATERAL unnest(s.answers) WITH ORDINALITY AS a(answer, a_ord)
WHERE q.q_ord = a.a_ord;
```

## Processing JSON Arrays with Ordinality

Combine `jsonb_array_elements` with ordinality for JSON arrays.

```sql
-- Table with JSON array
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    response_data JSONB
);

INSERT INTO api_logs (response_data) VALUES
    ('{"items": ["item1", "item2", "item3"]}'),
    ('{"items": ["only_one"]}');

-- Extract JSON array elements with positions
SELECT
    l.id,
    elem.value AS item,
    elem.ordinality AS position
FROM api_logs l
CROSS JOIN LATERAL jsonb_array_elements_text(l.response_data->'items')
    WITH ORDINALITY AS elem(value, ordinality);
```

## Rebuilding Arrays with Modified Order

Use ordinality to reorder or filter array elements before reaggregating.

```sql
-- Reverse array order
SELECT
    user_id,
    array_agg(genre ORDER BY rank DESC) AS reversed_genres
FROM user_preferences
CROSS JOIN LATERAL unnest(favorite_genres) WITH ORDINALITY AS prefs(genre, rank)
GROUP BY user_id;

-- Remove specific positions (e.g., remove second element)
SELECT
    user_id,
    array_agg(genre ORDER BY rank) AS filtered_genres
FROM user_preferences
CROSS JOIN LATERAL unnest(favorite_genres) WITH ORDINALITY AS prefs(genre, rank)
WHERE rank != 2
GROUP BY user_id;

-- Keep only odd positions
SELECT
    user_id,
    array_agg(genre ORDER BY rank) AS odd_positions
FROM user_preferences
CROSS JOIN LATERAL unnest(favorite_genres) WITH ORDINALITY AS prefs(genre, rank)
WHERE rank % 2 = 1
GROUP BY user_id;
```

## Calculating Gaps in Sequences

Detect missing elements in numbered sequences.

```sql
-- Table with potentially sparse numbered items
CREATE TABLE inventory_slots (
    shelf_id INTEGER,
    slot_numbers INTEGER[]  -- Should be consecutive but might have gaps
);

INSERT INTO inventory_slots VALUES
    (1, ARRAY[1, 2, 4, 5, 8]),  -- Missing 3, 6, 7
    (2, ARRAY[1, 2, 3, 4, 5]);  -- Complete

-- Find gaps in slot numbers
WITH expanded AS (
    SELECT
        shelf_id,
        slot_num,
        ordinality,
        slot_num - ordinality AS gap_indicator
    FROM inventory_slots
    CROSS JOIN LATERAL unnest(slot_numbers) WITH ORDINALITY AS s(slot_num, ordinality)
)
SELECT shelf_id, slot_num
FROM expanded
WHERE slot_num != ordinality
ORDER BY shelf_id, slot_num;
```

## Weighted Calculations Using Position

Position can serve as a weight or priority in calculations.

```sql
-- Calculate weighted preference score
-- Earlier positions (lower rank) get higher weight
SELECT
    user_id,
    genre,
    rank,
    1.0 / rank AS weight,
    -- Exponential decay weighting
    POWER(0.5, rank - 1) AS decay_weight
FROM user_preferences
CROSS JOIN LATERAL unnest(favorite_genres) WITH ORDINALITY AS prefs(genre, rank);

-- Aggregate weighted scores by genre across users
SELECT
    genre,
    SUM(1.0 / rank) AS total_weighted_score,
    COUNT(*) AS mention_count
FROM user_preferences
CROSS JOIN LATERAL unnest(favorite_genres) WITH ORDINALITY AS prefs(genre, rank)
GROUP BY genre
ORDER BY total_weighted_score DESC;
```

## Unnesting with Multiple Output Columns

When array elements are composite types or you need paired arrays:

```sql
-- Create a type for structured data
CREATE TYPE product_quantity AS (
    product_name TEXT,
    quantity INTEGER
);

-- Table using the composite type in an array
CREATE TABLE order_details (
    order_id INTEGER PRIMARY KEY,
    line_items product_quantity[]
);

INSERT INTO order_details VALUES
    (1, ARRAY[('Widget', 5), ('Gadget', 3)]::product_quantity[]),
    (2, ARRAY[('Sprocket', 10)]::product_quantity[]);

-- Unnest with ordinality, accessing composite fields
SELECT
    order_id,
    (item).product_name,
    (item).quantity,
    line_number
FROM order_details
CROSS JOIN LATERAL unnest(line_items) WITH ORDINALITY AS line(item, line_number);
```

## Performance Considerations

Unnesting large arrays can be resource-intensive. Consider these optimizations.

```sql
-- Create index on array column for containment queries
CREATE INDEX idx_items_gin ON orders USING GIN (items);

-- For frequent unnesting, consider normalizing the data
CREATE TABLE order_items_normalized (
    order_id INTEGER REFERENCES orders(id),
    position INTEGER,
    item_name TEXT,
    PRIMARY KEY (order_id, position)
);

-- Populate normalized table from array data
INSERT INTO order_items_normalized (order_id, position, item_name)
SELECT
    id,
    ordinality,
    item
FROM orders
CROSS JOIN LATERAL unnest(items) WITH ORDINALITY AS i(item, ordinality);
```

## Common Patterns

Here are frequently used patterns with unnest and ordinality:

```sql
-- Get array element at specific index (1-based)
CREATE FUNCTION array_element_at(arr ANYARRAY, idx INTEGER)
RETURNS ANYELEMENT AS $$
    SELECT elem
    FROM unnest(arr) WITH ORDINALITY AS t(elem, pos)
    WHERE pos = idx;
$$ LANGUAGE SQL;

SELECT array_element_at(ARRAY['a', 'b', 'c'], 2);  -- Returns 'b'

-- Convert array to numbered rows for joins
SELECT
    u.user_id,
    u.genre,
    u.rank,
    g.genre_details
FROM user_preferences up
CROSS JOIN LATERAL unnest(up.favorite_genres) WITH ORDINALITY AS u(genre, rank)
LEFT JOIN genre_metadata g ON g.genre_name = u.genre;
```

The combination of `unnest()` and `WITH ORDINALITY` transforms PostgreSQL arrays from simple storage containers into queryable data structures. Whether you need element positions for ordering, filtering, or calculations, this pattern provides the flexibility to work with array data as easily as regular table rows.
