# How to Write a Custom Apache Beam IO Connector for Dataflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataflow, Apache Beam, IO Connector, Custom Integration

Description: Build a custom Apache Beam IO connector for reading from and writing to external systems in Dataflow pipelines when no built-in connector exists.

---

Apache Beam comes with built-in IO connectors for common systems like BigQuery, Pub/Sub, Kafka, JDBC databases, and Cloud Storage. But what about that internal REST API, that legacy database, or that niche message queue your company uses? When there is no existing connector, you need to build your own.

Writing a custom IO connector is not as daunting as it sounds. The Beam SDK provides a clear framework for it. I will walk through building both a source (reader) and a sink (writer) connector from scratch.

## When to Build a Custom Connector

Before building a custom connector, check whether you can work around it. Sometimes a simple DoFn that calls an API is good enough for small-scale use cases. But a proper IO connector gives you:

- Automatic parallelism for reads through splitting
- Backpressure handling for writes
- Consistent error handling patterns
- Reusability across pipelines

## Building a Custom Source: BoundedSource

Let us build a source that reads records from a REST API. We will implement `BoundedSource` for batch reads first, then discuss unbounded sources for streaming.

```java
// Custom source that reads from a REST API
public class RestApiSource extends BoundedSource<Record> {

    private final String apiBaseUrl;
    private final String authToken;
    private final int startPage;
    private final int endPage;

    public RestApiSource(String apiBaseUrl, String authToken,
                         int startPage, int endPage) {
        this.apiBaseUrl = apiBaseUrl;
        this.authToken = authToken;
        this.startPage = startPage;
        this.endPage = endPage;
    }

    // Estimate the total size of data to read (helps Dataflow plan parallelism)
    @Override
    public long getEstimatedSizeBytes(PipelineOptions options) {
        // Estimate based on average page size and number of pages
        long avgPageSize = 50000;  // 50KB per page
        return avgPageSize * (endPage - startPage);
    }

    // Split the source into smaller chunks for parallel reading
    @Override
    public List<? extends BoundedSource<Record>> split(
            long desiredBundleSizeBytes, PipelineOptions options) {

        List<RestApiSource> splits = new ArrayList<>();
        int totalPages = endPage - startPage;
        int pagesPerSplit = Math.max(1, (int) (desiredBundleSizeBytes / 50000));

        // Create sub-sources, each handling a range of pages
        for (int page = startPage; page < endPage; page += pagesPerSplit) {
            int splitEnd = Math.min(page + pagesPerSplit, endPage);
            splits.add(new RestApiSource(apiBaseUrl, authToken, page, splitEnd));
        }

        return splits;
    }

    // Create a reader that actually fetches data
    @Override
    public BoundedReader<Record> createReader(PipelineOptions options) {
        return new RestApiReader(this);
    }

    @Override
    public Coder<Record> getOutputCoder() {
        return SerializableCoder.of(Record.class);
    }
}
```

## Implementing the Reader

The reader handles the actual data fetching, element by element.

```java
// Reader that fetches records page by page from the REST API
public class RestApiReader extends BoundedSource.BoundedReader<Record> {

    private final RestApiSource source;
    private transient HttpClient httpClient;
    private int currentPage;
    private List<Record> currentPageRecords;
    private int currentIndex;
    private Record currentRecord;

    public RestApiReader(RestApiSource source) {
        this.source = source;
        this.currentPage = source.getStartPage();
    }

    // Called once at the start - fetch the first page
    @Override
    public boolean start() throws IOException {
        httpClient = HttpClient.newHttpClient();
        return fetchNextPage();
    }

    // Called repeatedly to advance to the next element
    @Override
    public boolean advance() throws IOException {
        currentIndex++;

        // If we have more records on the current page, use them
        if (currentIndex < currentPageRecords.size()) {
            currentRecord = currentPageRecords.get(currentIndex);
            return true;
        }

        // Otherwise, fetch the next page
        currentPage++;
        if (currentPage >= source.getEndPage()) {
            return false;  // No more pages to read
        }

        return fetchNextPage();
    }

    // Fetch a page of records from the API
    private boolean fetchNextPage() throws IOException {
        String url = String.format("%s/records?page=%d&size=100",
            source.getApiBaseUrl(), currentPage);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Authorization", "Bearer " + source.getAuthToken())
            .GET()
            .build();

        try {
            HttpResponse<String> response = httpClient.send(
                request, HttpResponse.BodyHandlers.ofString());

            currentPageRecords = parseRecords(response.body());
            currentIndex = 0;

            if (currentPageRecords.isEmpty()) {
                return false;  // API returned empty page
            }

            currentRecord = currentPageRecords.get(0);
            return true;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("API request interrupted", e);
        }
    }

    @Override
    public Record getCurrent() {
        return currentRecord;
    }

    @Override
    public void close() {
        // Clean up resources
    }

    @Override
    public BoundedSource<Record> getCurrentSource() {
        return source;
    }
}
```

## Creating the Read Transform

Wrap the source in a PTransform for a clean API.

```java
// PTransform that wraps the custom source for easy use in pipelines
public class RestApiIO {

    public static Read read() {
        return new Read();
    }

    public static class Read extends PTransform<PBegin, PCollection<Record>> {

        private String apiBaseUrl;
        private String authToken;
        private int totalPages = 100;

        public Read withApiUrl(String url) {
            this.apiBaseUrl = url;
            return this;
        }

        public Read withAuthToken(String token) {
            this.authToken = token;
            return this;
        }

        public Read withTotalPages(int pages) {
            this.totalPages = pages;
            return this;
        }

        @Override
        public PCollection<Record> expand(PBegin input) {
            return input.apply("ReadFromRestApi",
                org.apache.beam.sdk.io.Read.from(
                    new RestApiSource(apiBaseUrl, authToken, 0, totalPages)));
        }
    }
}
```

Now the source can be used cleanly in any pipeline.

```java
// Using the custom source in a pipeline
PCollection<Record> records = pipeline
    .apply("ReadFromAPI", RestApiIO.read()
        .withApiUrl("https://api.internal.company.com/v2")
        .withAuthToken(options.getApiToken())
        .withTotalPages(500));
```

## Building a Custom Sink

For writing data to an external system, implement a DoFn with batching and error handling. The modern approach uses a ParDo-based sink rather than the older Sink API.

```java
// Custom sink that writes records to a REST API in batches
public class RestApiWriteFn extends DoFn<Record, Void> {

    private final String apiBaseUrl;
    private final String authToken;
    private static final int BATCH_SIZE = 50;

    private transient HttpClient httpClient;
    private transient List<Record> batch;

    public RestApiWriteFn(String apiBaseUrl, String authToken) {
        this.apiBaseUrl = apiBaseUrl;
        this.authToken = authToken;
    }

    @Setup
    public void setup() {
        // Initialize HTTP client once per worker
        httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        batch = new ArrayList<>();
    }

    @ProcessElement
    public void processElement(ProcessContext c) throws IOException {
        batch.add(c.element());

        // Flush when batch is full
        if (batch.size() >= BATCH_SIZE) {
            flushBatch();
        }
    }

    @FinishBundle
    public void finishBundle() throws IOException {
        // Flush any remaining records at end of bundle
        if (!batch.isEmpty()) {
            flushBatch();
        }
    }

    private void flushBatch() throws IOException {
        // Serialize the batch to JSON
        String jsonPayload = serializeRecords(batch);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(apiBaseUrl + "/records/bulk"))
            .header("Authorization", "Bearer " + authToken)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
            .build();

        try {
            HttpResponse<String> response = httpClient.send(
                request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                throw new IOException("API write failed with status "
                    + response.statusCode() + ": " + response.body());
            }

            batch.clear();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("API write interrupted", e);
        }
    }

    @Teardown
    public void teardown() {
        // Clean up resources when worker shuts down
    }
}
```

## Wrapping the Sink as a PTransform

```java
// PTransform for the write side
public class RestApiIO {

    // ... read() method from above ...

    public static Write write() {
        return new Write();
    }

    public static class Write extends PTransform<PCollection<Record>, PDone> {

        private String apiBaseUrl;
        private String authToken;

        public Write withApiUrl(String url) {
            this.apiBaseUrl = url;
            return this;
        }

        public Write withAuthToken(String token) {
            this.authToken = token;
            return this;
        }

        @Override
        public PDone expand(PCollection<Record> input) {
            input.apply("WriteToRestApi",
                ParDo.of(new RestApiWriteFn(apiBaseUrl, authToken)));
            return PDone.in(input.getPipeline());
        }
    }
}
```

Usage in a pipeline is clean.

```java
// Using the custom sink
records
    .apply("WriteToAPI", RestApiIO.write()
        .withApiUrl("https://api.internal.company.com/v2")
        .withAuthToken(options.getApiToken()));
```

## Adding Retry Logic

Production connectors need retry logic for transient failures.

```java
// Flush with exponential backoff retry
private void flushBatch() throws IOException {
    int maxRetries = 3;

    for (int attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            sendBatchRequest(batch);
            batch.clear();
            return;  // Success
        } catch (IOException e) {
            if (attempt == maxRetries) {
                throw e;  // Give up after max retries
            }
            // Exponential backoff: 1s, 2s, 4s
            long delay = (long) Math.pow(2, attempt) * 1000;
            try {
                Thread.sleep(delay);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new IOException("Retry interrupted", ie);
            }
        }
    }
}
```

## Testing Your Connector

Test your connector locally with the DirectRunner before deploying to Dataflow.

```java
// Unit test for the custom source
@Test
public void testRestApiSource() {
    PipelineOptions options = PipelineOptionsFactory.create();
    Pipeline pipeline = Pipeline.create(options);

    PCollection<Record> records = pipeline
        .apply(RestApiIO.read()
            .withApiUrl("http://localhost:8080")  // Mock server
            .withAuthToken("test-token")
            .withTotalPages(5));

    PAssert.that(records).satisfies(input -> {
        int count = 0;
        for (Record r : input) {
            count++;
            assertNotNull(r.getId());
        }
        assertTrue(count > 0);
        return null;
    });

    pipeline.run().waitUntilFinish();
}
```

Building custom IO connectors takes more upfront effort than a quick DoFn, but the payoff is a reusable, well-structured component that handles parallelism, batching, and error recovery correctly. Once built, your team can use the connector across multiple pipelines without worrying about the integration details.
