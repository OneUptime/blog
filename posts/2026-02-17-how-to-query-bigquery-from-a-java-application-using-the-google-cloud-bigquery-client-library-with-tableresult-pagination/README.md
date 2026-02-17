# How to Query BigQuery from a Java Application Using the google-cloud-bigquery Client Library with TableResult Pagination

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Java, Client Library, Pagination, Data Analytics

Description: Learn how to query Google BigQuery from a Java application using the google-cloud-bigquery client library, including handling large result sets with TableResult pagination.

---

BigQuery is Google's serverless data warehouse, and when you need to run analytical queries from a Java application, the `google-cloud-bigquery` client library is the standard way to do it. The library handles authentication, query execution, and result retrieval. But when your queries return millions of rows, you need to understand how pagination works with `TableResult` to avoid loading everything into memory at once.

This post covers setting up the BigQuery client, running queries, and properly iterating through paginated results.

## Adding the Dependency

Add the BigQuery client library to your project. If you are using Maven:

```xml
<!-- Google Cloud BigQuery client library -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-bigquery</artifactId>
    <version>2.38.0</version>
</dependency>
```

For Gradle:

```groovy
// BigQuery client library dependency
implementation 'com.google.cloud:google-cloud-bigquery:2.38.0'
```

## Creating the BigQuery Client

The `BigQuery` client is the main entry point. It picks up credentials from the environment automatically.

```java
// Create a BigQuery client using application default credentials
BigQuery bigquery = BigQueryOptions.newBuilder()
        .setProjectId("my-project-id")
        .build()
        .getService();
```

When running locally, the client uses credentials from `gcloud auth application-default login`. On GCP infrastructure like Cloud Run or GKE, it uses the attached service account.

## Running a Simple Query

Here is a basic query execution. The `QueryJobConfiguration` defines the SQL and any query parameters.

```java
public class BigQueryService {

    private final BigQuery bigquery;

    public BigQueryService(BigQuery bigquery) {
        this.bigquery = bigquery;
    }

    // Execute a query and return the results
    public TableResult runQuery(String sql) throws InterruptedException {
        QueryJobConfiguration queryConfig = QueryJobConfiguration.newBuilder(sql)
                // Use standard SQL syntax instead of legacy SQL
                .setUseLegacySql(false)
                .build();

        // Run the query and wait for it to complete
        TableResult result = bigquery.query(queryConfig);

        System.out.println("Total rows: " + result.getTotalRows());
        return result;
    }
}
```

The `bigquery.query()` method is synchronous - it submits the query job and waits for completion. For simple queries that return quickly, this is fine.

## Understanding TableResult Pagination

`TableResult` implements `Iterable<FieldValueList>`, so you can loop over it directly. But here is the important part: BigQuery returns results in pages. Each page contains a subset of the total rows, and you fetch pages on demand.

When you iterate with a for-each loop, the client handles page fetching automatically:

```java
// Iterating through results - pagination is handled automatically
public void processResults(TableResult result) {
    long rowCount = 0;

    // The iterator fetches new pages as needed
    for (FieldValueList row : result.iterateAll()) {
        String name = row.get("name").getStringValue();
        long count = row.get("count").getLongValue();

        // Process each row
        System.out.println(name + ": " + count);
        rowCount++;
    }

    System.out.println("Processed " + rowCount + " rows total");
}
```

The `iterateAll()` method returns an iterable that transparently fetches the next page when you reach the end of the current page. This is convenient but be aware that it loads each page into memory as it goes.

## Manual Pagination for Better Control

If you want explicit control over pagination, you can work with pages directly:

```java
// Manual pagination - process one page at a time
public void processWithManualPagination(TableResult result) {
    int pageNumber = 1;

    // Get the first page of results
    Page<FieldValueList> currentPage = result;

    while (currentPage != null) {
        System.out.println("Processing page " + pageNumber);

        // Process all rows in the current page
        for (FieldValueList row : currentPage.getValues()) {
            processRow(row);
        }

        // Check if there are more pages
        if (currentPage.hasNextPage()) {
            currentPage = currentPage.getNextPage();
            pageNumber++;
        } else {
            currentPage = null;
        }
    }

    System.out.println("Finished processing " + pageNumber + " pages");
}

private void processRow(FieldValueList row) {
    // Extract values by column name
    String timestamp = row.get("event_time").getStringValue();
    String eventType = row.get("event_type").getStringValue();
    double value = row.get("metric_value").getDoubleValue();

    // Your processing logic here
}
```

## Controlling Page Size

You can set the page size in the query configuration to control how many rows are returned per page:

```java
// Set a custom page size for result pagination
public TableResult queryWithPageSize(String sql, int pageSize) throws InterruptedException {
    QueryJobConfiguration queryConfig = QueryJobConfiguration.newBuilder(sql)
            .setUseLegacySql(false)
            .build();

    // The page size controls how many rows are fetched per API call
    BigQuery.QueryResultsOption pageSizeOption =
            BigQuery.QueryResultsOption.pageSize(pageSize);

    return bigquery.query(queryConfig, pageSizeOption);
}
```

A smaller page size means more API calls but less memory usage per page. A larger page size means fewer API calls but more memory per page. For most workloads, the default page size works fine. If you are processing very large result sets and memory is tight, reduce the page size.

## Parameterized Queries

Always use parameterized queries to prevent SQL injection and improve query caching:

```java
// Parameterized query to safely pass user input
public TableResult queryWithParameters(String datasetName, String minDate, long minCount)
        throws InterruptedException {

    String sql = "SELECT name, event_count, last_seen "
            + "FROM `my-project." + datasetName + ".events` "
            + "WHERE last_seen >= @minDate AND event_count >= @minCount "
            + "ORDER BY event_count DESC";

    QueryJobConfiguration queryConfig = QueryJobConfiguration.newBuilder(sql)
            .setUseLegacySql(false)
            // Add named parameters to prevent SQL injection
            .addNamedParameter("minDate", QueryParameterValue.string(minDate))
            .addNamedParameter("minCount", QueryParameterValue.int64(minCount))
            .build();

    return bigquery.query(queryConfig);
}
```

## Handling Different Data Types

BigQuery has its own type system, and the client library maps these to Java types through `FieldValueList`:

```java
// Extracting different data types from BigQuery results
public void extractTypedValues(FieldValueList row) {
    // String values
    String name = row.get("name").getStringValue();

    // Numeric values
    long intVal = row.get("count").getLongValue();
    double floatVal = row.get("score").getDoubleValue();

    // Boolean values
    boolean isActive = row.get("is_active").getBooleanValue();

    // Timestamp values - returned as microseconds since epoch
    long timestampMicros = row.get("created_at").getTimestampValue();
    Instant timestamp = Instant.ofEpochMilli(timestampMicros / 1000);

    // Handle nullable fields by checking for null
    FieldValue nullableField = row.get("optional_field");
    if (!nullableField.isNull()) {
        String optionalValue = nullableField.getStringValue();
    }

    // Repeated (array) fields
    FieldValue repeatedField = row.get("tags");
    List<String> tags = repeatedField.getRepeatedValue().stream()
            .map(FieldValue::getStringValue)
            .collect(Collectors.toList());
}
```

## Async Query Execution

For long-running queries, you might want to submit the job and poll for results:

```java
// Submit a query job and poll for completion
public TableResult asyncQuery(String sql) throws InterruptedException {
    QueryJobConfiguration queryConfig = QueryJobConfiguration.newBuilder(sql)
            .setUseLegacySql(false)
            .build();

    // Create a unique job ID
    JobId jobId = JobId.of(UUID.randomUUID().toString());

    // Submit the query job
    Job queryJob = bigquery.create(JobInfo.newBuilder(queryConfig).setJobId(jobId).build());

    // Wait for the job to complete, polling every 5 seconds
    queryJob = queryJob.waitFor(
            RetryOption.initialRetryDelay(Duration.ofSeconds(1)),
            RetryOption.totalTimeout(Duration.ofMinutes(10)));

    if (queryJob == null) {
        throw new RuntimeException("Job no longer exists");
    }

    if (queryJob.getStatus().getError() != null) {
        throw new RuntimeException("Query failed: " + queryJob.getStatus().getError());
    }

    // Retrieve the results
    return queryJob.getQueryResults();
}
```

## Putting It All Together

Here is a complete example that ties the concepts together in a Spring Boot service:

```java
@Service
public class AnalyticsService {

    private final BigQuery bigquery;

    public AnalyticsService() {
        this.bigquery = BigQueryOptions.getDefaultInstance().getService();
    }

    // Fetch analytics data with pagination, returning a list of DTOs
    public List<EventSummary> getEventSummary(String startDate, String endDate)
            throws InterruptedException {

        String sql = "SELECT event_type, COUNT(*) as total, AVG(duration_ms) as avg_duration "
                + "FROM `my-project.analytics.events` "
                + "WHERE event_date BETWEEN @startDate AND @endDate "
                + "GROUP BY event_type "
                + "ORDER BY total DESC";

        QueryJobConfiguration config = QueryJobConfiguration.newBuilder(sql)
                .setUseLegacySql(false)
                .addNamedParameter("startDate", QueryParameterValue.string(startDate))
                .addNamedParameter("endDate", QueryParameterValue.string(endDate))
                .build();

        TableResult result = bigquery.query(config);

        List<EventSummary> summaries = new ArrayList<>();
        for (FieldValueList row : result.iterateAll()) {
            summaries.add(new EventSummary(
                    row.get("event_type").getStringValue(),
                    row.get("total").getLongValue(),
                    row.get("avg_duration").getDoubleValue()));
        }

        return summaries;
    }
}
```

## Wrapping Up

The `google-cloud-bigquery` client library makes it straightforward to query BigQuery from Java. The `TableResult` pagination system handles large result sets without loading everything into memory, whether you use the automatic `iterateAll()` approach or manage pages manually. Use parameterized queries for safety, control page size based on your memory constraints, and pick sync or async execution based on how long your queries take to run.
