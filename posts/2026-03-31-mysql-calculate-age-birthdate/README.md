# How to Calculate Age from a Birthdate in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Date Function, Database, Query

Description: Learn how to accurately calculate a person's age in MySQL using TIMESTAMPDIFF() and DATEDIFF(), handling birthday edge cases correctly.

---

## The Recommended Approach

The most accurate way to calculate age in MySQL is `TIMESTAMPDIFF(YEAR, birthdate, CURDATE())`. It returns the completed number of years between the birthdate and today, correctly handling leap years and birthdays that have not yet occurred this calendar year.

```sql
SELECT TIMESTAMPDIFF(YEAR, '1990-06-15', CURDATE()) AS age;
-- Example result: 35
```

Avoid subtracting `YEAR()` values directly - that approach does not account for whether the birthday has passed yet this year:

```sql
-- Wrong: does not account for birthday having passed
SELECT YEAR(CURDATE()) - YEAR('1990-06-15') AS wrong_age;
-- Returns 36 even before June 15 in a given year
```

## Basic Age Query on a Table

```sql
CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  birthdate DATE NOT NULL
);

INSERT INTO members (name, birthdate) VALUES
  ('Alice', '1990-06-15'),
  ('Bob',   '2000-03-31'),
  ('Carol', '1985-12-01');
```

Calculate age for every member:

```sql
SELECT
  name,
  birthdate,
  TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) AS age
FROM members
ORDER BY age DESC;
```

## Filter by Age Range

Find members who are between 18 and 30 years old:

```sql
SELECT name, birthdate,
       TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) AS age
FROM members
WHERE TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 18 AND 30;
```

Find members whose birthday is today:

```sql
SELECT name, birthdate
FROM members
WHERE MONTH(birthdate) = MONTH(CURDATE())
  AND DAY(birthdate)   = DAY(CURDATE());
```

## Find Upcoming Birthdays

Find members whose birthday falls within the next 7 days. Note that this approach does not handle year-end wrapping (e.g., checking from late December into January):

```sql
SELECT
  name,
  birthdate,
  DATE_FORMAT(birthdate, '%M %d') AS birthday
FROM members
WHERE
  DAYOFYEAR(
    DATE(CONCAT(YEAR(CURDATE()), '-', MONTH(birthdate), '-', DAY(birthdate)))
  ) BETWEEN DAYOFYEAR(CURDATE()) AND DAYOFYEAR(CURDATE()) + 7;
```

A simpler alternative that also does not handle year-end wrapping:

```sql
SELECT name, birthdate
FROM members
WHERE DATE_FORMAT(birthdate, '%m-%d')
      BETWEEN DATE_FORMAT(CURDATE(), '%m-%d')
      AND DATE_FORMAT(CURDATE() + INTERVAL 7 DAY, '%m-%d');
```

## Age at a Specific Past Date

You can replace `CURDATE()` with any target date to calculate age at that point in time:

```sql
SELECT
  name,
  TIMESTAMPDIFF(YEAR, birthdate, '2020-01-01') AS age_in_2020
FROM members;
```

## Age in Months or Days

`TIMESTAMPDIFF()` accepts other units:

```sql
SELECT
  name,
  TIMESTAMPDIFF(MONTH, birthdate, CURDATE()) AS age_months,
  TIMESTAMPDIFF(DAY,   birthdate, CURDATE()) AS age_days
FROM members;
```

This is useful for infant or toddler ages where years are too coarse, or for precise durations in medical or legal contexts.

## Handling Invalid or Future Birthdates

If a birthdate is in the future (data entry error), `TIMESTAMPDIFF()` returns a negative number. Add a `WHERE` clause or a `CASE` expression to handle this:

```sql
SELECT
  name,
  CASE
    WHEN birthdate > CURDATE() THEN NULL
    ELSE TIMESTAMPDIFF(YEAR, birthdate, CURDATE())
  END AS age
FROM members;
```

## Summary

Use `TIMESTAMPDIFF(YEAR, birthdate, CURDATE())` to calculate age in MySQL. It correctly handles leap years and birthdays that have not yet occurred in the current year. Switch the unit to `MONTH` or `DAY` for finer precision, filter with the same expression in `WHERE`, and guard against future birthdates with a `CASE` expression or data validation constraint.
