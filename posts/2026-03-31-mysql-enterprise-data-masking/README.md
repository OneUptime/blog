# How to Use MySQL Enterprise Data Masking and De-Identification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Enterprise, Data Masking, Security

Description: Learn how to use MySQL Enterprise Data Masking functions to mask, obfuscate, and generate synthetic PII for development, testing, and compliance workflows.

---

## What Is MySQL Enterprise Data Masking?

MySQL Enterprise Data Masking and De-Identification provides a set of SQL functions that transform sensitive data - replacing real PII with masked or synthetic values. This is essential for compliance (GDPR, HIPAA, PCI DSS) when sharing production data with developers, running tests, or generating reports.

In MySQL 8.0.33+, the feature is delivered as a set of `data_masking` components.

## Installing the Component

```sql
-- MySQL 8.0.33+ (component-based)
INSTALL COMPONENT 'file://component_masking';
INSTALL COMPONENT 'file://component_masking_functions';

-- Older MySQL 8.0 versions use the plugin
INSTALL PLUGIN data_masking SONAME 'data_masking.so';

-- Verify (component)
SELECT * FROM mysql.component;

-- Verify (plugin)
SHOW PLUGINS WHERE Name = 'data_masking';
```

## Masking Functions Overview

```text
mask_inner(str, margin1, margin2)   - mask middle characters, keep edges
mask_outer(str, margin1, margin2)   - mask edges, keep middle
mask_pan(str)                       - mask payment card number
mask_pan_relaxed(str)               - mask card, keep last 4 digits
mask_ssn(str)                       - mask US social security number
mask_iban(str)                      - mask IBAN bank account number
mask_uuid(str)                      - mask UUID, keep structure
```

## Masking Credit Card Numbers

```sql
-- mask_pan: mask all but last 4 digits
SELECT mask_pan('4111111111111111');
-- Result: XXXXXXXXXXXX1111

-- mask_pan_relaxed: keep first 6 and last 4 digits
SELECT mask_pan_relaxed('4111111111111111');
-- Result: 411111XXXXXX1111
```

## Masking Custom Strings

```sql
-- mask_inner: mask characters between margin offsets
SELECT mask_inner('John Smith', 2, 2);
-- Result: JoXXXXXXth (keeps 2 from start and 2 from end)

-- mask_outer: mask characters outside the margins
SELECT mask_outer('john.doe@example.com', 4, 7);
-- Result: XXXX.doe@examXXXXXXX
```

## Masking SSN and IBAN

```sql
SELECT mask_ssn('123-45-6789');
-- Result: XXX-XX-6789

SELECT mask_iban('DE89370400440532013000');
-- Result: DE********************
```

## Generating Random Synthetic Data

The component also provides random data generators for creating test datasets:

```sql
-- Generate a random email
SELECT gen_rnd_email();
-- Result: something like 'xvbqzt@example.com'

-- Generate a random US phone number
SELECT gen_rnd_us_phone();

-- Generate a random SSN-format string
SELECT gen_rnd_ssn();

-- Generate a random payment card number (passes Luhn check)
SELECT gen_rnd_pan();
```

## Applying Masking in Views

A common pattern is to create masked views of sensitive tables for developer or analyst access:

```sql
-- Create a masked view of the customers table
CREATE VIEW customers_masked AS
SELECT
  id,
  mask_inner(name, 1, 1) AS name,
  mask_outer(email, 0, 10) AS email,
  mask_pan_relaxed(credit_card) AS credit_card,
  country,
  created_at
FROM customers;

-- Grant read access to the view (not the base table)
GRANT SELECT ON mydb.customers_masked TO 'analyst_user'@'%';
```

## Using Dictionaries for Realistic Substitution

```sql
-- Load a dictionary of terms for substitution masking
SELECT masking_dictionary_term_add('names', 'Alice');
SELECT masking_dictionary_term_add('names', 'Bob');
SELECT masking_dictionary_term_add('names', 'Carol');

-- Replace names with random dictionary terms
SELECT gen_dictionary('names') AS masked_name;
```

## Summary

MySQL Enterprise Data Masking provides a practical toolkit for protecting PII in non-production environments. Use the masking functions to redact real data in views shared with developers or analysts, and the random generators to create realistic synthetic datasets for testing. This approach satisfies regulatory requirements without sacrificing developer productivity.
