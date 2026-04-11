# How to Use SUBSTRING_INDEX() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how MySQL's SUBSTRING_INDEX() function splits a string by a delimiter and returns the portion before or after a specified count of delimiters.

---

## What is SUBSTRING_INDEX()?

`SUBSTRING_INDEX()` returns the substring from a string before (or after) a specified number of occurrences of a delimiter. This makes it very useful for parsing delimited strings such as IP addresses, file paths, CSV-like stored values, and domain names - all without needing application-layer string splitting.

The syntax is:

```sql
SUBSTRING_INDEX(str, delim, count)
```

- `str` - the source string
- `delim` - the delimiter to search for
- `count` - if positive, return everything before the Nth occurrence; if negative, return everything after the Nth occurrence from the right

## Basic Examples

```sql
SELECT SUBSTRING_INDEX('a,b,c,d', ',', 2);
-- Result: a,b

SELECT SUBSTRING_INDEX('a,b,c,d', ',', -2);
-- Result: c,d

SELECT SUBSTRING_INDEX('a,b,c,d', ',', 1);
-- Result: a
```

## Parsing IP Addresses

Extracting individual octets from a stored IP address:

```sql
SELECT
  ip_address,
  SUBSTRING_INDEX(ip_address, '.', 1)                              AS octet1,
  SUBSTRING_INDEX(SUBSTRING_INDEX(ip_address, '.', 2), '.', -1)   AS octet2,
  SUBSTRING_INDEX(SUBSTRING_INDEX(ip_address, '.', 3), '.', -1)   AS octet3,
  SUBSTRING_INDEX(ip_address, '.', -1)                             AS octet4
FROM server_logs;
```

## Extracting Domain from Email

```sql
SELECT
  email,
  SUBSTRING_INDEX(email, '@', -1) AS domain
FROM users;
```

## Extracting File Name from Path

```sql
SELECT
  file_path,
  SUBSTRING_INDEX(file_path, '/', -1) AS filename
FROM uploaded_files;
```

## Extracting Directory from Path

```sql
SELECT
  file_path,
  SUBSTRING_INDEX(file_path, '/', 4) AS directory
FROM uploaded_files;
```

For a path like `/var/www/html/index.php`, this returns `/var/www/html`.

## Using with Stored Tags or CSV Columns

If a column stores a comma-separated list of tags, you can extract the first tag:

```sql
SELECT
  product_id,
  SUBSTRING_INDEX(tags, ',', 1) AS first_tag
FROM products;
```

## Handling Count Larger Than Occurrences

If `count` exceeds the number of delimiters, the full string is returned:

```sql
SELECT SUBSTRING_INDEX('hello', ',', 5);
-- Result: hello
```

## NULL Handling

If any argument is `NULL`, the result is `NULL`:

```sql
SELECT SUBSTRING_INDEX(NULL, '.', 1);
-- Result: NULL
```

## Practical Example - Extracting Subdomain

```sql
SELECT
  url,
  SUBSTRING_INDEX(
    SUBSTRING_INDEX(url, '.', 1),
    '//',
    -1
  ) AS subdomain
FROM site_configs;
```

For `https://api.example.com`, this yields `api`.

## Summary

`SUBSTRING_INDEX()` is a powerful function for splitting and extracting parts of delimited strings directly in SQL. A positive `count` extracts from the left, a negative `count` extracts from the right. Nest calls to extract middle segments. It is ideal for parsing IP addresses, URLs, file paths, email domains, and any column that stores multiple values in a single delimited string - eliminating the need to post-process results in application code.
