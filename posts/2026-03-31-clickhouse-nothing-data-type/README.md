# How to Use Nothing Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Nothing

Description: Understand ClickHouse's Nothing type, which always holds NULL, its role in Nullable(Nothing), and its use in higher-order functions.

---

ClickHouse includes a special `Nothing` data type that represents the absence of a value. A bare `NULL` literal has the type `Nullable(Nothing)`, where `Nothing` is the inner type indicating no concrete value domain exists. At first glance this may seem useless, but `Nothing` plays a specific role as a bottom type in the type system. It appears in contexts where ClickHouse needs a type placeholder, particularly when inferring types in empty arrays, higher-order functions, or constructing arrays that contain only null literals.

## What is the Nothing Data Type

The `Nothing` type has no valid non-null values. It serves as the base type of `NULL` literals - a bare `NULL` has the type `Nullable(Nothing)`, where `Nothing` is the inner type indicating no concrete value domain. You will rarely declare a `Nothing` column directly - instead you encounter it through type inference.

```sql
-- The type of a bare NULL literal is Nullable(Nothing)
SELECT toTypeName(NULL);
-- Result: Nullable(Nothing)
```

## Nullable(Nothing)

`Nothing` is most useful wrapped in `Nullable`, which is essentially equivalent to a typed null. `Nullable(Nothing)` is the concrete type ClickHouse assigns to a `NULL` value when no target type has been specified.

```sql
SELECT
    NULL                          AS raw_null,
    toTypeName(NULL)              AS null_type,
    CAST(NULL AS Nullable(Int32)) AS typed_null,
    toTypeName(CAST(NULL AS Nullable(Int32))) AS typed_null_type;
```

Understanding this distinction matters when you use `NULL` in array constructors or function arguments, because ClickHouse must reconcile types.

## Nothing in Array Contexts

When you create an array containing only `NULL` values, ClickHouse infers the element type as `Nullable(Nothing)`:

```sql
-- Array of only NULLs has element type Nullable(Nothing)
SELECT
    [NULL, NULL, NULL]               AS null_array,
    toTypeName([NULL, NULL, NULL])   AS array_type;
-- Result type: Array(Nullable(Nothing))
```

When you mix `NULL` with typed values, ClickHouse promotes `Nothing` to the appropriate `Nullable` type:

```sql
SELECT
    [NULL, 1, 2]                   AS mixed_array,
    toTypeName([NULL, 1, 2])       AS mixed_type;
-- Result type: Array(Nullable(UInt8))
```

## Nothing in Higher-Order Functions

Higher-order functions like `arrayMap`, `arrayFilter`, and `arrayFold` sometimes produce `Nothing` typed results when operating on empty or null-only arrays. This is where `Nothing` becomes practically relevant.

```sql
-- arrayMap over an array of NULLs
SELECT
    arrayMap(x -> x, [NULL, NULL]) AS mapped,
    toTypeName(arrayMap(x -> x, [NULL, NULL])) AS result_type;
```

```sql
-- arrayFilter returning an empty typed array
SELECT
    arrayFilter(x -> x > 0, emptyArrayInt32())              AS empty_filtered,
    toTypeName(arrayFilter(x -> x > 0, emptyArrayInt32()))  AS filtered_type;
```

## Empty Arrays and the Nothing Type

An empty array literal `[]` has the element type `Nothing`, since ClickHouse has no values from which to infer a concrete type. This is distinct from the typed empty array helpers like `emptyArrayInt32()`.

```sql
SELECT
    []                      AS empty_nothing,
    toTypeName([])          AS its_type,
    emptyArrayInt32()       AS empty_int,
    toTypeName(emptyArrayInt32()) AS int_type;
-- [] has type Array(Nothing), emptyArrayInt32() has type Array(Int32)
```

## Type Inference and Nothing in UNION ALL

`UNION ALL` queries must reconcile column types across branches. When one branch returns a bare `NULL` and the other returns a typed value, ClickHouse uses the `Nothing` type to trigger promotion to `Nullable`.

```sql
SELECT NULL AS value, toTypeName(NULL) AS t
UNION ALL
SELECT 42   AS value, toTypeName(42)   AS t;
-- The NULL column becomes Nullable(UInt8) after type unification, since 42 fits in UInt8
```

## Practical Example - Conditional Arrays

A real-world use case is building dynamic arrays in queries where some branches produce no values:

```sql
SELECT
    user_id,
    arrayFilter(
        x -> isNotNull(x),
        [if(has_email, email_hash, NULL),
         if(has_phone, phone_hash, NULL)]
    ) AS contact_hashes
FROM (
    SELECT
        1      AS user_id,
        true   AS has_email,
        12345  AS email_hash,
        false  AS has_phone,
        toInt64(NULL) AS phone_hash
);
```

## Limitations and Caveats

You cannot insert data into a `Nothing`-typed column - it has no storage representation for non-null values. Attempting to create a standalone `Nothing` column will result in an error or a permanently null column. The type is primarily an internal mechanism for type unification.

```sql
-- This works - querying the type name
SELECT toTypeName(NULL);

-- This will fail - Nothing cannot hold non-null values
-- SELECT CAST(42 AS Nothing);  -- Error: cannot convert Int32 to Nothing
```

## Summary

The `Nothing` type is ClickHouse's bottom type - a placeholder that represents pure nullability with no concrete value domain. It appears in NULL literal inference, empty array construction, and type unification in `UNION ALL` queries. Understanding it helps you reason about type promotion rules and avoid unexpected type errors when working with NULL values and higher-order functions.
