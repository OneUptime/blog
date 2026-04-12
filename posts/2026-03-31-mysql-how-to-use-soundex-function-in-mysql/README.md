# How to Use SOUNDEX() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SOUNDEX, String Function, Fuzzy Search, Phonetic Matching

Description: Learn how to use the SOUNDEX() function in MySQL to perform phonetic searches that match words that sound similar, even with different spellings.

---

## What Is SOUNDEX?

`SOUNDEX()` is a string function that converts a word to its Soundex code - a phonetic representation based on how the word sounds in English. Two words that sound similar will produce the same or similar Soundex codes, enabling "sounds like" searches. The standard Soundex algorithm produces a 4-character code (one letter followed by three digits), but MySQL's `SOUNDEX()` returns an arbitrarily long string without truncating.

```sql
SELECT SOUNDEX('Smith');   -- Returns 'S530'
SELECT SOUNDEX('Smyth');   -- Returns 'S530' (same sound!)
SELECT SOUNDEX('Johnson'); -- Returns 'J525'
SELECT SOUNDEX('Jonson');  -- Returns 'J525' (same sound!)
```

## How Soundex Works

```sql
-- The code is: first letter + 3 digits encoding consonants
-- Vowels and H, W, Y are ignored
-- Similar-sounding consonants get the same digit:
-- B, F, P, V = 1
-- C, G, J, K, Q, S, X, Z = 2
-- D, T = 3
-- L = 4
-- M, N = 5
-- R = 6

SELECT
    SOUNDEX('Robert') AS robert,   -- R163
    SOUNDEX('Rupert') AS rupert,   -- R163 (same!)
    SOUNDEX('Rubert') AS rubert;   -- R163 (same!)
```

## Basic SOUNDEX Search

```sql
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100)
);

INSERT INTO customers (name) VALUES
('Smith'), ('Smyth'), ('Smite'), ('Jones'), ('Johnson'), ('Jonson'), ('Williams');

-- Find names that sound like 'Smith'
SELECT name, SOUNDEX(name) AS code
FROM customers
WHERE SOUNDEX(name) = SOUNDEX('Smith');
-- Returns: Smith, Smyth, Smite

-- Find names that sound like 'Johnson'
SELECT name FROM customers
WHERE SOUNDEX(name) = SOUNDEX('Johnson');
-- Returns: Johnson (J525), Jonson (J525)
```

## Using SOUNDS LIKE Operator

MySQL provides a `SOUNDS LIKE` operator as a shorthand for comparing SOUNDEX values:

```sql
-- SOUNDS LIKE is equivalent to SOUNDEX(a) = SOUNDEX(b)
SELECT name FROM customers WHERE name SOUNDS LIKE 'Smith';
-- Equivalent to:
SELECT name FROM customers WHERE SOUNDEX(name) = SOUNDEX('Smith');

-- Find customers with names that sound like a user input
SELECT * FROM customers WHERE name SOUNDS LIKE 'Jonsen';
-- Returns rows for Johnson, Jonson, etc.
```

## Practical Use Case - Name Search

```sql
-- Search for patients even with misspelled names
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    dob DATE
);

INSERT INTO patients (first_name, last_name, dob) VALUES
('Catherine', 'Thomson', '1990-07-11'),
('Kathrine', 'Tomson', '1978-12-01'),
('Katherine', 'Thomsen', '1985-03-22'),
('Jennifer', 'Adams', '1995-05-15');

-- Search with phonetic matching on last name
SELECT first_name, last_name, dob
FROM patients
WHERE last_name SOUNDS LIKE 'Thomson';
-- Returns: Thomson, Tomson, Thomsen (all share SOUNDEX code T525)
```

## Combining SOUNDEX with Other Searches

```sql
-- Phonetic search combined with first name initial (using patients table)
SELECT * FROM patients
WHERE SOUNDEX(last_name) = SOUNDEX('Tomson')
  AND first_name LIKE 'C%';

-- Rank results by exact match vs phonetic match
SELECT
    name,
    CASE
        WHEN name = 'Smith' THEN 1
        WHEN name SOUNDS LIKE 'Smith' THEN 2
        ELSE 3
    END AS match_quality
FROM customers
WHERE name SOUNDS LIKE 'Smith'
ORDER BY match_quality;
```

## SOUNDEX Limitations

```sql
-- SOUNDEX is designed for English only
-- Non-ASCII characters and non-English names work poorly

-- MySQL returns longer codes than the standard 4-character Soundex
SELECT SOUNDEX('Washington');  -- Returns 'W25235' (6 characters)
SELECT SOUNDEX('Weston');      -- Returns 'W235' (4 characters)

-- Different-sounding names can share a code when few consonants are present
SELECT SOUNDEX('Lee');   -- Returns 'L000'
SELECT SOUNDEX('Law');   -- Returns 'L000'

-- MySQL does not have a DIFFERENCE() function (that is SQL Server)
-- To compare SOUNDEX codes in MySQL, use direct equality or SOUNDS LIKE
SELECT SOUNDEX('Smith') = SOUNDEX('Smyth');     -- Returns 1 (match)
SELECT SOUNDEX('Smith') = SOUNDEX('Jones');     -- Returns 0 (no match)
```

## Summary

`SOUNDEX()` enables phonetic matching in MySQL, making it useful for customer name searches, deduplication, and typo-tolerant lookups. Use `SOUNDS LIKE` as a convenient shorthand. Keep in mind that SOUNDEX is designed for English phonetics and may not work well for non-English names or words. For higher-precision fuzzy matching, consider full-text search or application-level libraries like Levenshtein distance.
