# How to Create JavaScript UDFs in BigQuery for Custom Transformations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, JavaScript, UDF, Data Transformation

Description: Learn how to create JavaScript User-Defined Functions in BigQuery to implement custom data transformations that go beyond what standard SQL can do.

---

Standard SQL in BigQuery covers a lot of ground, but sometimes you need custom logic that SQL cannot express cleanly - parsing proprietary data formats, implementing business-specific calculations, or applying string manipulations that would be painful in pure SQL. That is where JavaScript UDFs come in.

BigQuery lets you write User-Defined Functions in JavaScript, and they run directly inside BigQuery's execution engine. No external services, no data movement - just JavaScript embedded in your SQL.

## Basic JavaScript UDF

Here is a simple JavaScript UDF that extracts a domain from an email address.

```sql
-- Create a JavaScript UDF that extracts the domain from an email
CREATE OR REPLACE FUNCTION `my_project.my_dataset.extract_domain`(email STRING)
RETURNS STRING
LANGUAGE js
AS r"""
  // Return null for null or empty inputs
  if (!email) return null;

  // Split on @ and return the domain part
  var parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
""";

-- Use the UDF in a query
SELECT
  email,
  `my_project.my_dataset.extract_domain`(email) AS domain
FROM `my_project.my_dataset.users`
LIMIT 10;
```

The `r"""..."""` syntax is a raw string literal that avoids escaping issues. Always use this for JavaScript UDFs.

## JavaScript UDF with Complex Return Types

JavaScript UDFs can return complex types like STRUCT and ARRAY.

```sql
-- UDF that parses a user agent string into components
CREATE OR REPLACE FUNCTION `my_project.my_dataset.parse_user_agent`(ua STRING)
RETURNS STRUCT<browser STRING, os STRING, is_mobile BOOL>
LANGUAGE js
AS r"""
  if (!ua) return {browser: null, os: null, is_mobile: false};

  // Simple browser detection
  var browser = 'Other';
  if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
  else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
  else if (ua.indexOf('Safari') > -1) browser = 'Safari';
  else if (ua.indexOf('Edge') > -1) browser = 'Edge';

  // Simple OS detection
  var os = 'Other';
  if (ua.indexOf('Windows') > -1) os = 'Windows';
  else if (ua.indexOf('Mac OS') > -1) os = 'macOS';
  else if (ua.indexOf('Linux') > -1) os = 'Linux';
  else if (ua.indexOf('Android') > -1) os = 'Android';
  else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1) os = 'iOS';

  // Mobile detection
  var is_mobile = /Mobile|Android|iPhone|iPad/.test(ua);

  return {browser: browser, os: os, is_mobile: is_mobile};
""";

-- Use the UDF and access struct fields
SELECT
  user_agent,
  `my_project.my_dataset.parse_user_agent`(user_agent).browser AS browser,
  `my_project.my_dataset.parse_user_agent`(user_agent).os AS os,
  `my_project.my_dataset.parse_user_agent`(user_agent).is_mobile AS is_mobile
FROM `my_project.my_dataset.web_events`
LIMIT 10;
```

## Returning Arrays

UDFs can also return arrays, which is useful for splitting or tokenizing strings.

```sql
-- UDF that splits a comma-separated tags string into an array
CREATE OR REPLACE FUNCTION `my_project.my_dataset.parse_tags`(tags_string STRING)
RETURNS ARRAY<STRING>
LANGUAGE js
AS r"""
  if (!tags_string) return [];

  // Split by comma, trim whitespace, and filter empty strings
  return tags_string
    .split(',')
    .map(function(tag) { return tag.trim(); })
    .filter(function(tag) { return tag.length > 0; });
""";

-- Use the UDF with UNNEST to expand tags into rows
SELECT
  product_id,
  tag
FROM `my_project.my_dataset.products`,
UNNEST(`my_project.my_dataset.parse_tags`(tags)) AS tag;
```

## Temporary JavaScript UDFs

If you only need a UDF for a single query session, create it as a temporary function. Temporary UDFs do not persist in any dataset.

```sql
-- Temporary UDF available only in this query session
CREATE TEMP FUNCTION calculate_score(
  views INT64,
  clicks INT64,
  conversions INT64
)
RETURNS FLOAT64
LANGUAGE js
AS r"""
  // Weighted engagement score calculation
  if (views === 0) return 0;

  var ctr = clicks / views;
  var cvr = conversions / Math.max(clicks, 1);

  // Custom scoring formula
  return (ctr * 0.3 + cvr * 0.7) * 100;
""";

-- Use it in the same script
SELECT
  campaign_id,
  views,
  clicks,
  conversions,
  calculate_score(views, clicks, conversions) AS engagement_score
FROM `my_project.my_dataset.campaign_metrics`
ORDER BY engagement_score DESC;
```

## Handling JSON Data

JavaScript UDFs are particularly useful for parsing complex JSON structures.

```sql
-- UDF to extract nested values from a JSON string
CREATE OR REPLACE FUNCTION `my_project.my_dataset.extract_nested_json`(
  json_str STRING,
  path STRING
)
RETURNS STRING
LANGUAGE js
AS r"""
  if (!json_str || !path) return null;

  try {
    var obj = JSON.parse(json_str);
    // Navigate the path using dot notation
    var parts = path.split('.');
    var current = obj;

    for (var i = 0; i < parts.length; i++) {
      if (current === null || current === undefined) return null;
      current = current[parts[i]];
    }

    // Return as string regardless of type
    if (current === null || current === undefined) return null;
    if (typeof current === 'object') return JSON.stringify(current);
    return String(current);
  } catch (e) {
    return null;
  }
""";

-- Extract deeply nested values from JSON events
SELECT
  event_id,
  `my_project.my_dataset.extract_nested_json`(payload, 'user.preferences.theme') AS user_theme,
  `my_project.my_dataset.extract_nested_json`(payload, 'metadata.source') AS event_source
FROM `my_project.my_dataset.raw_events`;
```

## Including External JavaScript Libraries

BigQuery lets you reference JavaScript libraries stored in Google Cloud Storage. This is useful for reusing utility code across multiple UDFs.

```sql
-- UDF that uses an external JavaScript library
CREATE OR REPLACE FUNCTION `my_project.my_dataset.hash_value`(input STRING)
RETURNS STRING
LANGUAGE js
OPTIONS (
  -- Reference a JS library in Cloud Storage
  library=["gs://my-bucket/js-libs/md5.js"]
)
AS r"""
  // md5() function is available from the external library
  if (!input) return null;
  return md5(input);
""";
```

Upload your library to Cloud Storage first.

```bash
# Upload the JavaScript library to Cloud Storage
gsutil cp md5.js gs://my-bucket/js-libs/md5.js
```

## Performance Considerations

JavaScript UDFs are slower than native SQL functions because they run in a JavaScript sandbox. Here are some tips to keep performance reasonable.

**Avoid UDFs when SQL can do the job**: If you can express the logic in standard SQL, do that instead. SQL functions are optimized and run natively.

```sql
-- Bad: Using a JS UDF for something SQL handles natively
CREATE TEMP FUNCTION js_upper(s STRING) RETURNS STRING LANGUAGE js AS r"""
  return s ? s.toUpperCase() : null;
""";

-- Good: Use the native SQL function instead
SELECT UPPER(name) FROM `my_project.my_dataset.users`;
```

**Process data in the UDF input, not by querying**: UDFs should transform the input parameters, not make additional data lookups.

**Minimize object creation**: In hot loops, excessive object creation in JavaScript causes garbage collection overhead.

```sql
-- A performance-conscious UDF for cleaning strings
CREATE TEMP FUNCTION clean_text(input STRING)
RETURNS STRING
LANGUAGE js
AS r"""
  if (!input) return null;

  // Use regex replace instead of creating intermediate arrays
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')  // Remove control characters
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .trim();
""";
```

## Error Handling in UDFs

JavaScript UDFs that throw exceptions will cause the entire query to fail. Always handle potential errors inside the function.

```sql
-- UDF with proper error handling
CREATE OR REPLACE FUNCTION `my_project.my_dataset.safe_parse_json`(json_str STRING)
RETURNS STRING
LANGUAGE js
AS r"""
  if (!json_str) return null;

  try {
    var parsed = JSON.parse(json_str);
    return JSON.stringify(parsed);
  } catch (e) {
    // Return null instead of failing the entire query
    return null;
  }
""";
```

## Practical Example: Data Masking UDF

Here is a real-world example - a UDF that masks sensitive data while preserving format.

```sql
-- UDF to mask PII data while preserving the format
CREATE OR REPLACE FUNCTION `my_project.my_dataset.mask_pii`(
  value STRING,
  mask_type STRING
)
RETURNS STRING
LANGUAGE js
AS r"""
  if (!value) return null;

  switch (mask_type) {
    case 'email':
      // Show first char and domain: j***@gmail.com
      var parts = value.split('@');
      if (parts.length !== 2) return '***';
      return parts[0][0] + '***@' + parts[1];

    case 'phone':
      // Show last 4 digits: ***-***-1234
      return '***-***-' + value.slice(-4);

    case 'name':
      // Show first initial: J. ***
      return value[0] + '. ***';

    case 'ssn':
      // Show last 4: ***-**-1234
      return '***-**-' + value.slice(-4);

    default:
      return '***';
  }
""";

-- Use the masking UDF in a query
SELECT
  `my_project.my_dataset.mask_pii`(email, 'email') AS masked_email,
  `my_project.my_dataset.mask_pii`(phone, 'phone') AS masked_phone,
  `my_project.my_dataset.mask_pii`(full_name, 'name') AS masked_name,
  order_count,
  total_spent
FROM `my_project.my_dataset.customer_profiles`;
```

## Wrapping Up

JavaScript UDFs in BigQuery open up a world of custom data transformations that would be difficult or impossible in pure SQL. They are perfect for parsing non-standard formats, implementing business-specific logic, and handling edge cases that SQL functions do not cover. Just remember that they come with a performance cost, so use them when SQL truly cannot do the job, and always include error handling to avoid query failures.

For monitoring your BigQuery workloads and tracking UDF performance, [OneUptime](https://oneuptime.com) can help you set up dashboards and alerts to keep your data pipelines running smoothly.
