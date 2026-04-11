# How to Use REVERSE() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how REVERSE() reverses the characters of a string in MySQL, with examples for palindrome detection, generating test data, and reversing encoded strings.

---

`REVERSE(str)` returns `str` with the order of characters reversed. It works with multibyte character sets, reversing characters not bytes.

## Syntax

```sql
REVERSE(str)
```

Returns `NULL` if `str` is `NULL`. Returns an empty string if `str` is empty.

## Basic usage

```sql
SELECT REVERSE('Hello');       -- 'olleH'
SELECT REVERSE('MySQL');       -- 'LQSyM'
SELECT REVERSE('12345');       -- '54321'
SELECT REVERSE('abcde');       -- 'edcba'
SELECT REVERSE('');            -- ''
SELECT REVERSE(NULL);          -- NULL
```

## Palindrome detection

```sql
SELECT
    word,
    CASE WHEN word = REVERSE(word) THEN 'Yes' ELSE 'No' END AS is_palindrome
FROM (
    SELECT 'racecar' AS word
    UNION ALL SELECT 'level'
    UNION ALL SELECT 'hello'
    UNION ALL SELECT 'madam'
) AS words;
```

Result:

| word | is_palindrome |
|---|---|
| racecar | Yes |
| level | Yes |
| hello | No |
| madam | Yes |

## Finding palindromes in a table

```sql
CREATE TABLE words (
    word_id INT PRIMARY KEY,
    word    VARCHAR(100)
);

INSERT INTO words VALUES (1,'racecar'),(2,'hello'),(3,'level'),(4,'world'),(5,'noon');

SELECT word FROM words WHERE word = REVERSE(word);
-- racecar, level, noon
```

## Reversing a number stored as a string

```sql
SELECT REVERSE('9876543210');  -- '0123456789'

-- Reverse a numeric value (converts to string first)
SELECT REVERSE(CAST(123456 AS CHAR));  -- '654321'
```

## Using REVERSE with LIKE to search from the right

MySQL's `LIKE` can use an index only for left-anchored patterns (`'prefix%'`). For suffix searches, reverse both the column and the pattern:

```sql
CREATE TABLE domains (
    domain_id INT PRIMARY KEY,
    domain    VARCHAR(100)
);

CREATE INDEX idx_domain_rev ON domains ((REVERSE(domain)));

-- Find all .com domains using reversed index
SELECT domain
FROM domains
WHERE REVERSE(domain) LIKE REVERSE('%.com');
-- Internally: WHERE REVERSE(domain) LIKE 'moc.%'
```

This is a niche technique. The reversed functional index allows left-anchored pattern matching on the reversed string, which is equivalent to suffix matching on the original.

## Reversing words in a string

`REVERSE` operates on the entire string including spaces. To reverse word order you need application-side logic or a stored procedure.

```sql
-- Reverses characters, not words
SELECT REVERSE('Hello World');  -- 'dlroW olleH'
```

## Generating test data

```sql
-- Create a mirrored string
SELECT CONCAT(name, REVERSE(name)) AS mirrored FROM products LIMIT 5;
-- 'Widget' -> 'WidgettegdiW'
```

## Reversing domain names for hierarchical sorting

Reversed domain names allow grouping by TLD when sorted:

```sql
SELECT
    domain,
    REVERSE(domain) AS reversed_domain
FROM domains
ORDER BY REVERSE(domain);
-- .com domains sort together (e.g. www.google.com, api.example.com)
-- .io domains sort together (e.g. user.github.io)
```

## Multibyte character support

`REVERSE` reverses Unicode characters, not bytes, when the column uses a multibyte character set:

```sql
SELECT REVERSE('こんにちは');  -- 'はちにんこ'  (characters reversed, not bytes)
```

## Summary

`REVERSE()` returns a string with its characters in reverse order. Common uses include palindrome detection, reversed index suffix searches, and generating mirrored test strings. It correctly handles multibyte Unicode characters. For suffix-pattern indexing, combine `REVERSE` with a functional index and a left-anchored `LIKE` on the reversed value.
