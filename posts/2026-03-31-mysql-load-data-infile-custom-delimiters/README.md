# How to Use LOAD DATA INFILE with Custom Delimiters in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, LOAD DATA INFILE, Delimiter, Import, Data Migration

Description: Learn how to configure LOAD DATA INFILE with custom field delimiters, enclosures, and line terminators to import any flat-file format into MySQL.

---

## Introduction

`LOAD DATA INFILE` is MySQL's high-performance bulk import mechanism. While CSV and TSV are the most common formats, real-world data files often use pipe characters, semicolons, tildes, or multi-character delimiters. MySQL's `FIELDS TERMINATED BY` clause accepts strings of any length (including multi-character delimiters like `'::'` or `'||'`), giving you full control over flat-file parsing.

## Syntax Overview

The full `LOAD DATA INFILE` clause for delimiter customization:

```sql
LOAD DATA INFILE '/path/to/file.dat'
INTO TABLE target_table
FIELDS
  TERMINATED BY 'delimiter'
  OPTIONALLY ENCLOSED BY 'quote_char'
  ESCAPED BY 'escape_char'
LINES
  STARTING BY 'prefix'
  TERMINATED BY 'line_ending'
IGNORE n ROWS;
```

## Pipe-Delimited Files

A common format in legacy systems and Unix utilities:

```text
1|Alice Smith|alice@example.com|active
2|Bob Jones|bob@example.com|inactive
```

```sql
LOAD DATA INFILE '/tmp/users.dat'
INTO TABLE users
FIELDS TERMINATED BY '|'
LINES TERMINATED BY '\n'
(id, name, email, status);
```

## Semicolon-Delimited Files

Common in European CSV exports (where comma is a decimal separator):

```sql
LOAD DATA INFILE '/tmp/data.csv'
INTO TABLE products
FIELDS TERMINATED BY ';'
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

## Tilde-Delimited Files

Used when data may contain commas, semicolons, and pipes:

```sql
LOAD DATA INFILE '/tmp/records.dat'
INTO TABLE records
FIELDS TERMINATED BY '~'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

## Windows vs Unix Line Endings

Files generated on Windows use `\r\n` as the line terminator:

```sql
LOAD DATA INFILE '/tmp/windows_export.csv'
INTO TABLE customers
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS;
```

## Fixed-Width Files via SET

For fixed-width files or files requiring field transformation, use `SET` to manipulate values after parsing:

```sql
LOAD DATA INFILE '/tmp/padded.dat'
INTO TABLE employees
FIELDS TERMINATED BY '|'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(@id, @name, @salary_str)
SET
  id = TRIM(@id),
  name = TRIM(@name),
  salary = CAST(REPLACE(@salary_str, '$', '') AS DECIMAL(10,2));
```

## Handling Fields with the Delimiter Inside Values

When field values themselves may contain the delimiter, use an enclosure character:

```sql
LOAD DATA INFILE '/tmp/notes.csv'
INTO TABLE notes
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

A field like `"This, is a note"` will be parsed correctly as a single field.

## Escaping the Escape Character

If the escape character itself appears in data, double-escape:

```sql
LOAD DATA INFILE '/tmp/paths.dat'
INTO TABLE file_paths
FIELDS TERMINATED BY '|'
ESCAPED BY '\\'
LINES TERMINATED BY '\n';
```

## Testing with a Small Sample

Before importing a full file, test with a small subset:

```sql
LOAD DATA INFILE '/tmp/sample_10rows.dat'
INTO TABLE test_import
FIELDS TERMINATED BY '|'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;

SELECT * FROM test_import;
```

## Summary

`LOAD DATA INFILE` accommodates virtually any flat-file delimiter format through its `FIELDS TERMINATED BY`, `ENCLOSED BY`, `ESCAPED BY`, and `LINES TERMINATED BY` clauses. Always test with a small sample file first to validate that MySQL parses columns correctly before importing production data volumes.
