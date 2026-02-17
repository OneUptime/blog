# How to Build a Spring Batch Job That Reads from Cloud Storage and Writes to BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Spring Batch, Cloud Storage, BigQuery, ETL, Java

Description: Build a Spring Batch job that reads CSV files from Google Cloud Storage and writes the processed data to BigQuery, with chunk-based processing and error handling.

---

ETL pipelines are one of the most common workloads in data engineering. You have data landing in Cloud Storage as CSV files, and it needs to end up in BigQuery for analysis. Spring Batch is a solid framework for this kind of work - it gives you chunk-based processing, retry logic, skip policies, and job monitoring out of the box.

In this post, I will build a Spring Batch job that reads CSV files from a Cloud Storage bucket, transforms the data, and writes it to a BigQuery table.

## Project Setup

Add the required dependencies:

```xml
<!-- Spring Batch for job processing -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-batch</artifactId>
</dependency>

<!-- Google Cloud Storage client -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-storage</artifactId>
</dependency>

<!-- Google Cloud BigQuery client -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-bigquery</artifactId>
</dependency>

<!-- Spring Boot Web for triggering jobs via REST -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- H2 for Spring Batch job repository (metadata storage) -->
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

Configure the application:

```properties
# Spring Batch configuration
spring.batch.jdbc.initialize-schema=always
spring.batch.job.enabled=false

# GCP project
spring.cloud.gcp.project-id=my-project-id
```

## The Data Model

Define the data object that flows through the batch pipeline:

```java
// Represents a single sales record from the CSV file
public class SalesRecord {
    private String transactionId;
    private String productId;
    private String customerId;
    private LocalDate saleDate;
    private int quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalAmount;
    private String region;

    // Default constructor for deserialization
    public SalesRecord() {}

    // Getters and setters
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public LocalDate getSaleDate() { return saleDate; }
    public void setSaleDate(LocalDate saleDate) { this.saleDate = saleDate; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
}
```

## Reading from Cloud Storage

The reader downloads the CSV file from Cloud Storage and parses it line by line:

```java
@Configuration
public class ReaderConfig {

    private final Storage storage;

    public ReaderConfig() {
        this.storage = StorageOptions.getDefaultInstance().getService();
    }

    // ItemReader that reads a CSV file from Cloud Storage
    @Bean
    @StepScope
    public FlatFileItemReader<SalesRecord> csvReader(
            @Value("#{jobParameters['bucketName']}") String bucketName,
            @Value("#{jobParameters['fileName']}") String fileName) throws IOException {

        // Download the file from Cloud Storage to a temp file
        Blob blob = storage.get(BlobId.of(bucketName, fileName));
        Path tempFile = Files.createTempFile("batch-input-", ".csv");
        blob.downloadTo(tempFile);

        FlatFileItemReader<SalesRecord> reader = new FlatFileItemReader<>();
        reader.setResource(new FileSystemResource(tempFile.toFile()));
        reader.setLinesToSkip(1); // Skip the CSV header

        // Map CSV columns to SalesRecord fields
        DefaultLineMapper<SalesRecord> lineMapper = new DefaultLineMapper<>();

        DelimitedLineTokenizer tokenizer = new DelimitedLineTokenizer();
        tokenizer.setNames("transactionId", "productId", "customerId",
                "saleDate", "quantity", "unitPrice", "totalAmount", "region");

        BeanWrapperFieldSetMapper<SalesRecord> fieldMapper = new BeanWrapperFieldSetMapper<>();
        fieldMapper.setTargetType(SalesRecord.class);

        lineMapper.setLineTokenizer(tokenizer);
        lineMapper.setFieldSetMapper(fieldMapper);
        reader.setLineMapper(lineMapper);

        return reader;
    }
}
```

## The Processor

The processor validates and transforms each record:

```java
// Processor that validates and enriches sales records
@Component
public class SalesRecordProcessor implements ItemProcessor<SalesRecord, SalesRecord> {

    @Override
    public SalesRecord process(SalesRecord record) throws Exception {
        // Skip records with invalid data by returning null
        if (record.getQuantity() <= 0) {
            return null; // Returning null tells Spring Batch to skip this item
        }

        // Recalculate total amount to ensure consistency
        BigDecimal calculatedTotal = record.getUnitPrice()
                .multiply(BigDecimal.valueOf(record.getQuantity()));
        record.setTotalAmount(calculatedTotal);

        // Normalize region names
        record.setRegion(record.getRegion().toUpperCase().trim());

        // Validate required fields
        if (record.getTransactionId() == null || record.getTransactionId().isEmpty()) {
            return null;
        }

        return record;
    }
}
```

## Writing to BigQuery

The writer inserts records into BigQuery using the InsertAll API:

```java
// ItemWriter that inserts records into a BigQuery table
@Component
public class BigQueryWriter implements ItemWriter<SalesRecord> {

    private final BigQuery bigquery;
    private final String datasetName;
    private final String tableName;

    public BigQueryWriter(@Value("${bigquery.dataset}") String datasetName,
                          @Value("${bigquery.table}") String tableName) {
        this.bigquery = BigQueryOptions.getDefaultInstance().getService();
        this.datasetName = datasetName;
        this.tableName = tableName;
    }

    @Override
    public void write(Chunk<? extends SalesRecord> chunk) throws Exception {
        TableId tableId = TableId.of(datasetName, tableName);

        // Build insert request with all records in the chunk
        InsertAllRequest.Builder requestBuilder = InsertAllRequest.newBuilder(tableId);

        for (SalesRecord record : chunk) {
            Map<String, Object> row = new HashMap<>();
            row.put("transaction_id", record.getTransactionId());
            row.put("product_id", record.getProductId());
            row.put("customer_id", record.getCustomerId());
            row.put("sale_date", record.getSaleDate().toString());
            row.put("quantity", record.getQuantity());
            row.put("unit_price", record.getUnitPrice().doubleValue());
            row.put("total_amount", record.getTotalAmount().doubleValue());
            row.put("region", record.getRegion());

            requestBuilder.addRow(record.getTransactionId(), row);
        }

        // Execute the insert
        InsertAllResponse response = bigquery.insertAll(requestBuilder.build());

        // Check for errors
        if (response.hasErrors()) {
            StringBuilder errors = new StringBuilder("BigQuery insert errors:\n");
            response.getInsertErrors().forEach((index, errorList) ->
                    errorList.forEach(error ->
                            errors.append("Row ").append(index).append(": ")
                                    .append(error.getMessage()).append("\n")));
            throw new RuntimeException(errors.toString());
        }
    }
}
```

## Configuring the Job

Wire everything together in the batch job configuration:

```java
@Configuration
public class BatchJobConfig {

    @Bean
    public Job importSalesJob(JobRepository jobRepository, Step importStep) {
        return new JobBuilder("importSalesJob", jobRepository)
                .incrementer(new RunIdIncrementer())
                .listener(new JobCompletionListener())
                .start(importStep)
                .build();
    }

    @Bean
    public Step importStep(JobRepository jobRepository,
                           PlatformTransactionManager transactionManager,
                           FlatFileItemReader<SalesRecord> reader,
                           SalesRecordProcessor processor,
                           BigQueryWriter writer) {

        return new StepBuilder("importStep", jobRepository)
                // Process 500 records per chunk
                .<SalesRecord, SalesRecord>chunk(500, transactionManager)
                .reader(reader)
                .processor(processor)
                .writer(writer)
                // Skip up to 100 bad records before failing
                .faultTolerant()
                .skipLimit(100)
                .skip(FlatFileParseException.class)
                .skip(NumberFormatException.class)
                // Retry BigQuery write failures up to 3 times
                .retryLimit(3)
                .retry(RuntimeException.class)
                .build();
    }
}
```

## Job Completion Listener

Track job results:

```java
// Listener that logs job completion statistics
public class JobCompletionListener implements JobExecutionListener {

    @Override
    public void afterJob(JobExecution jobExecution) {
        if (jobExecution.getStatus() == BatchStatus.COMPLETED) {
            long readCount = jobExecution.getStepExecutions().stream()
                    .mapToLong(StepExecution::getReadCount)
                    .sum();
            long writeCount = jobExecution.getStepExecutions().stream()
                    .mapToLong(StepExecution::getWriteCount)
                    .sum();
            long skipCount = jobExecution.getStepExecutions().stream()
                    .mapToLong(StepExecution::getSkipCount)
                    .sum();

            System.out.println("Job completed successfully!");
            System.out.println("Records read: " + readCount);
            System.out.println("Records written: " + writeCount);
            System.out.println("Records skipped: " + skipCount);
        } else {
            System.err.println("Job failed with status: " + jobExecution.getStatus());
        }
    }
}
```

## Triggering the Job via REST

Create an endpoint to trigger the batch job:

```java
@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobLauncher jobLauncher;
    private final Job importSalesJob;

    public JobController(JobLauncher jobLauncher, Job importSalesJob) {
        this.jobLauncher = jobLauncher;
        this.importSalesJob = importSalesJob;
    }

    // Trigger the import job with bucket and file parameters
    @PostMapping("/import")
    public ResponseEntity<Map<String, String>> triggerImport(
            @RequestParam String bucketName,
            @RequestParam String fileName) throws Exception {

        JobParameters params = new JobParametersBuilder()
                .addString("bucketName", bucketName)
                .addString("fileName", fileName)
                .addLong("timestamp", System.currentTimeMillis())
                .toJobParameters();

        JobExecution execution = jobLauncher.run(importSalesJob, params);

        return ResponseEntity.ok(Map.of(
                "jobId", String.valueOf(execution.getJobId()),
                "status", execution.getStatus().toString()));
    }
}
```

## Wrapping Up

Spring Batch gives you a production-ready framework for ETL jobs between Cloud Storage and BigQuery. The chunk-based processing model means you never load the entire file into memory. The skip and retry policies handle bad records and transient BigQuery errors gracefully. Combine this with Cloud Scheduler to trigger jobs on a schedule, or use Cloud Storage event notifications to trigger the job whenever a new file lands in the bucket. The framework handles the hard parts - you just define how to read, transform, and write your data.
