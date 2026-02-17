# How to Use the Cloud Data Fusion Wrangler for Data Cleansing and Transformation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Data Fusion, Data Wrangler, Data Cleansing, Data Transformation, ETL

Description: Learn how to use the Cloud Data Fusion Wrangler to interactively cleanse and transform your data before building production pipelines on Google Cloud.

---

If you have ever tried to build a data pipeline only to discover that your source data is messy, inconsistent, or just plain broken, you know how painful data preparation can be. Google Cloud Data Fusion includes a tool called the Wrangler that lets you interactively explore and transform data before you commit to a full pipeline design. In this post, I will walk through how to use the Wrangler effectively for data cleansing and transformation tasks.

## What Is the Cloud Data Fusion Wrangler?

The Wrangler is a visual, interactive data preparation tool built into Cloud Data Fusion. Think of it as a spreadsheet-like interface where you can apply transformations step by step and immediately see the results. Each action you take gets recorded as a directive, and those directives translate directly into pipeline transformation steps.

This is especially useful when you are dealing with data from sources that do not have strict schemas - CSV files, JSON blobs, or legacy databases where column names are cryptic and values are inconsistent.

## Getting Started with the Wrangler

To open the Wrangler, navigate to your Cloud Data Fusion instance in the GCP Console and click on the "Wrangler" tab. You can load data from various sources:

- Upload a file (CSV, JSON, Excel)
- Connect to a database
- Browse GCS buckets
- Pull from BigQuery tables

For this walkthrough, let's say you have a CSV file with customer records that needs cleaning before loading into BigQuery.

## Loading Your Data

Once you are in the Wrangler, click "Add Connection" or upload a file directly. After you select your data source, the Wrangler will show you a preview of the first several hundred rows in a tabular format. Each column is displayed with its inferred data type, and you can immediately start spotting issues.

Common problems you will notice right away include null values, inconsistent date formats, mixed-case strings, and columns that contain data that should be split into multiple fields.

## Applying Transformations

The power of the Wrangler comes from its directive system. You can either use the dropdown menus on each column header or type directives directly into the command bar. Here are some of the most common operations.

### Cleaning Up String Data

To standardize a column with inconsistent casing, click the column header dropdown and select "Uppercase" or "Lowercase." This generates a directive like:

```
// Convert the customer_name column to lowercase for consistency
lowercase customer_name
```

To trim whitespace from string fields:

```
// Remove leading and trailing spaces from the email column
trim email
```

### Handling Missing Values

The Wrangler lets you filter or fill null values. If you want to fill null values in a numeric column with a default:

```
// Replace null values in the revenue column with 0
fill-null-or-empty revenue '0'
```

To drop rows where a critical field is missing:

```
// Remove rows where the customer_id column is empty
filter-rows-on condition-if-matched customer_id =~ '^\s*$'
```

### Parsing and Splitting Columns

If you have a column that contains combined data - say a full address in a single field - you can split it:

```
// Split the address column on commas into separate fields
split-to-columns address ','
```

For dates that arrive in a non-standard format, you can parse them:

```
// Parse the order_date column from a custom format to a standard date
parse-as-datetime order_date "MM/dd/yyyy"
```

### Type Conversions

The Wrangler often infers types incorrectly, especially when reading from CSV files. You can explicitly set column types:

```
// Convert the amount column from string to decimal
set-type amount decimal
```

### Renaming and Dropping Columns

To rename a column for clarity:

```
// Rename the cryptic column name to something readable
rename col_7 shipping_cost
```

To drop columns you do not need:

```
// Remove the internal_notes column before loading to BigQuery
drop internal_notes
```

## Working with the Directive Recipe

Every transformation you apply gets added to a recipe - a sequential list of directives shown on the right side of the screen. This recipe is the heart of the Wrangler experience. You can:

- Reorder steps by dragging them
- Delete steps you no longer want
- Edit directives directly if you prefer typing
- Copy the entire recipe for use in other contexts

The recipe is also fully reproducible. If you load new data from the same source next week, you can apply the same recipe and get consistent results.

## Previewing and Validating Results

After each transformation, the Wrangler updates the data preview in real time. This is where you catch issues early. Pay attention to:

- Column data types shown in the header
- The number of rows that remain after filtering operations
- Any error indicators on cells that failed to parse

You can also use the column statistics feature. Click on a column header and look at the distribution of values, null counts, and unique value counts. This helps you decide whether additional cleansing steps are needed.

## Creating a Pipeline from the Wrangler

Once your data looks clean, you can convert your Wrangler work directly into a Data Fusion pipeline. Click the "Create a Pipeline" button in the top right corner of the Wrangler. This generates a pipeline with:

- A source node connected to your data origin
- A Wrangler transform node containing all your directives
- A placeholder sink node where you can configure the destination (BigQuery, GCS, or another target)

The pipeline YAML that gets generated will include your Wrangler directives as a configuration property on the transform node, so everything you did interactively is preserved.

## Advanced Wrangler Techniques

### Conditional Transformations

You can apply transformations conditionally using the `set-column` directive with expressions:

```
// Set a new column based on a condition - categorize orders by size
set-column order_category exp:{order_amount > 1000 ? 'large' : 'small'}
```

### Merging Columns

To combine multiple columns into one:

```
// Merge first_name and last_name into a full_name column
merge first_name last_name full_name ' '
```

### Using Custom Expressions

The Wrangler supports JEXL expressions for more advanced logic:

```
// Calculate a discount column based on customer tier
set-column discount exp:{tier == 'gold' ? amount * 0.2 : amount * 0.1}
```

## Tips for Getting the Most Out of the Wrangler

First, always start with a representative sample of your data. If you only preview the first 100 rows and your data has edge cases in row 5,000, you might miss them.

Second, keep your directive recipes version-controlled. Export them and save them alongside your pipeline definitions in Git. This makes it easy to review changes and roll back if a transformation introduces problems.

Third, use the Wrangler as an exploration tool even if you plan to write your transformations in code. It is a fast way to understand the shape of your data and prototype cleaning logic before investing time in a full pipeline.

Finally, remember that the Wrangler is not just for one-time use. You can build pipelines that use the Wrangler transform node in production, running the same cleansing logic on every batch of data that flows through.

## Wrapping Up

The Cloud Data Fusion Wrangler takes a lot of the tedium out of data preparation. Instead of writing transformation code blind and hoping it handles all the edge cases, you can work interactively with your actual data, apply changes, and see results immediately. The directives you build become reusable pipeline components, bridging the gap between ad-hoc data exploration and production-grade ETL. If you are spending too much time fixing data quality issues downstream, give the Wrangler a try - it might save you more time than you expect.
