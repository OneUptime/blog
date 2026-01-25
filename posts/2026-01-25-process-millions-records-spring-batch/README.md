# How to Process Millions of Records with Spring Batch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Batch, Batch Processing, Big Data, ETL

Description: A practical guide to processing millions of records efficiently with Spring Batch, covering chunked processing, parallel execution, and production-ready patterns for high-volume ETL jobs.

---

Processing large datasets is one of those problems that sounds simple until you actually try it. Load a million rows, transform them, write them somewhere else. What could go wrong? Everything, it turns out. Memory explodes, transactions time out, and your database connection pool gives up halfway through.

Spring Batch exists precisely because these problems are common and well-understood. It provides a framework for building batch jobs that handle large volumes of data reliably, with built-in support for restartability, chunk-based processing, and parallel execution. Here's how to use it properly.

## Understanding the Core Model

Spring Batch organizes work into Jobs, which contain Steps. Each Step typically follows the read-process-write pattern. The framework reads a chunk of items from a source, processes each one, and writes the results to a destination. If something fails, it knows exactly where to restart.

The key abstraction is the chunk. Instead of loading all million records into memory, you process them in batches of, say, 1000 at a time. Each chunk is wrapped in a single transaction. If the transaction fails, only that chunk rolls back.

```java
@Configuration
@EnableBatchProcessing
public class BatchConfig {

    @Bean
    public Job importUserJob(JobRepository jobRepository, Step step1) {
        return new JobBuilder("importUserJob", jobRepository)
                .start(step1)
                .build();
    }

    @Bean
    public Step step1(JobRepository jobRepository,
                      PlatformTransactionManager transactionManager,
                      ItemReader<User> reader,
                      ItemProcessor<User, ProcessedUser> processor,
                      ItemWriter<ProcessedUser> writer) {
        return new StepBuilder("step1", jobRepository)
                // Process 1000 records per transaction
                .<User, ProcessedUser>chunk(1000, transactionManager)
                .reader(reader)
                .processor(processor)
                .writer(writer)
                .build();
    }
}
```

The chunk size of 1000 is not arbitrary. Too small and you pay transaction overhead for every few records. Too large and you risk memory pressure and long-running transactions. Start with 1000, measure, and adjust.

## Reading From Large Datasets

The reader is where most batch jobs go wrong. A naive JDBC query that returns all rows will try to load everything into memory before processing starts. For millions of records, that's a guaranteed OutOfMemoryError.

Spring Batch provides cursor-based and paging readers that fetch data incrementally. The `JdbcCursorItemReader` streams results row by row, while the `JdbcPagingItemReader` fetches pages of records in separate queries.

```java
@Bean
public JdbcPagingItemReader<User> userReader(DataSource dataSource) {
    // Use a map-based row mapper for simplicity
    Map<String, Order> sortKeys = new HashMap<>();
    sortKeys.put("id", Order.ASCENDING);

    JdbcPagingItemReader<User> reader = new JdbcPagingItemReader<>();
    reader.setDataSource(dataSource);
    reader.setFetchSize(1000);
    reader.setPageSize(1000);

    // Configure the query provider for your database
    PostgresPagingQueryProvider queryProvider = new PostgresPagingQueryProvider();
    queryProvider.setSelectClause("id, email, created_at, status");
    queryProvider.setFromClause("users");
    queryProvider.setWhereClause("status = 'pending'");
    queryProvider.setSortKeys(sortKeys);

    reader.setQueryProvider(queryProvider);
    reader.setRowMapper(new BeanPropertyRowMapper<>(User.class));

    return reader;
}
```

The paging reader issues separate queries for each page, which means the database cursor does not stay open across the entire job. This is important for long-running jobs where holding a cursor open can cause issues with connection timeouts or database locks.

For file-based sources, the `FlatFileItemReader` handles CSV, fixed-width, and delimited files with built-in support for header skipping, custom delimiters, and error handling.

```java
@Bean
public FlatFileItemReader<User> csvReader() {
    return new FlatFileItemReaderBuilder<User>()
            .name("userCsvReader")
            .resource(new FileSystemResource("/data/users.csv"))
            .delimited()
            .names("id", "email", "createdAt", "status")
            .targetType(User.class)
            .linesToSkip(1) // Skip the header row
            .build();
}
```

## Processing and Transformation

The processor is where your business logic lives. Keep it stateless and idempotent. Since chunks can be retried on failure, your processor might see the same record multiple times.

```java
@Component
public class UserProcessor implements ItemProcessor<User, ProcessedUser> {

    private final ValidationService validationService;
    private final EnrichmentService enrichmentService;

    public UserProcessor(ValidationService validationService,
                         EnrichmentService enrichmentService) {
        this.validationService = validationService;
        this.enrichmentService = enrichmentService;
    }

    @Override
    public ProcessedUser process(User user) throws Exception {
        // Return null to skip this record
        if (!validationService.isValid(user)) {
            return null;
        }

        // Transform the record
        ProcessedUser processed = new ProcessedUser();
        processed.setUserId(user.getId());
        processed.setNormalizedEmail(user.getEmail().toLowerCase().trim());
        processed.setRegion(enrichmentService.lookupRegion(user));
        processed.setProcessedAt(Instant.now());

        return processed;
    }
}
```

Returning null from a processor tells Spring Batch to skip that record. It will not be passed to the writer. This is cleaner than throwing exceptions for expected business conditions.

## Writing Results Efficiently

Writers receive the entire chunk at once, which allows for efficient bulk operations. The `JdbcBatchItemWriter` uses JDBC batch statements under the hood, dramatically reducing round trips to the database.

```java
@Bean
public JdbcBatchItemWriter<ProcessedUser> processedUserWriter(DataSource dataSource) {
    return new JdbcBatchItemWriterBuilder<ProcessedUser>()
            .dataSource(dataSource)
            .sql("INSERT INTO processed_users (user_id, normalized_email, region, processed_at) " +
                 "VALUES (:userId, :normalizedEmail, :region, :processedAt)")
            .beanMapped()
            .build();
}
```

For truly massive inserts, consider using database-specific bulk loading mechanisms like PostgreSQL's COPY command or MySQL's LOAD DATA. You can implement a custom writer that buffers records and flushes them using these fast paths.

## Scaling With Parallel Processing

A single-threaded step is often enough for jobs that need to run nightly. But when you need to process millions of records in minutes rather than hours, Spring Batch offers several scaling options.

The simplest is multi-threaded step execution. Each chunk is processed by a different thread from a pool.

```java
@Bean
public Step parallelStep(JobRepository jobRepository,
                         PlatformTransactionManager transactionManager,
                         ItemReader<User> reader,
                         ItemProcessor<User, ProcessedUser> processor,
                         ItemWriter<ProcessedUser> writer,
                         TaskExecutor taskExecutor) {
    return new StepBuilder("parallelStep", jobRepository)
            .<User, ProcessedUser>chunk(1000, transactionManager)
            .reader(reader)
            .processor(processor)
            .writer(writer)
            .taskExecutor(taskExecutor)
            .throttleLimit(8) // Max concurrent chunks
            .build();
}

@Bean
public TaskExecutor taskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(8);
    executor.setMaxPoolSize(16);
    executor.setQueueCapacity(100);
    executor.setThreadNamePrefix("batch-");
    return executor;
}
```

There is a catch: your reader must be thread-safe. The paging reader is inherently thread-safe because each page query is independent. Cursor-based readers are not, since multiple threads would fight over the same cursor. Wrap non-thread-safe readers with `SynchronizedItemStreamReader` if needed.

For even larger scale, use partitioning. The job splits the dataset into independent partitions, and each partition runs as a separate step instance. Partitions can run on different threads, processes, or even different machines.

```java
@Bean
public Step partitionedStep(JobRepository jobRepository,
                            Step workerStep,
                            Partitioner partitioner,
                            TaskExecutor taskExecutor) {
    return new StepBuilder("partitionedStep", jobRepository)
            .partitioner("workerStep", partitioner)
            .step(workerStep)
            .gridSize(10) // Number of partitions
            .taskExecutor(taskExecutor)
            .build();
}

@Bean
public Partitioner rangePartitioner(DataSource dataSource) {
    // Partition by ID ranges
    ColumnRangePartitioner partitioner = new ColumnRangePartitioner();
    partitioner.setColumn("id");
    partitioner.setTable("users");
    partitioner.setDataSource(dataSource);
    return partitioner;
}
```

Each partition receives its own execution context with the start and end values of its range. The worker step uses these values to query only its subset of the data.

## Handling Failures Gracefully

Production batch jobs fail. Networks blip, databases hiccup, source files contain garbage. Spring Batch provides skip and retry policies to handle transient failures without aborting the entire job.

```java
@Bean
public Step faultTolerantStep(JobRepository jobRepository,
                              PlatformTransactionManager transactionManager,
                              ItemReader<User> reader,
                              ItemProcessor<User, ProcessedUser> processor,
                              ItemWriter<ProcessedUser> writer) {
    return new StepBuilder("faultTolerantStep", jobRepository)
            .<User, ProcessedUser>chunk(1000, transactionManager)
            .reader(reader)
            .processor(processor)
            .writer(writer)
            .faultTolerant()
            // Retry transient exceptions up to 3 times
            .retry(DeadlockLoserDataAccessException.class)
            .retryLimit(3)
            // Skip bad records, up to 100 total
            .skip(ValidationException.class)
            .skip(DataIntegrityViolationException.class)
            .skipLimit(100)
            // Log skipped items for later review
            .listener(new SkipListener<User, ProcessedUser>() {
                @Override
                public void onSkipInProcess(User item, Throwable t) {
                    log.warn("Skipped user {} due to: {}", item.getId(), t.getMessage());
                }
            })
            .build();
}
```

The job metadata tables track which chunks succeeded and which failed. If you restart a failed job, it picks up where it left off rather than reprocessing everything from the beginning.

## Monitoring and Observability

Spring Batch integrates with Micrometer out of the box. You get metrics for job duration, step duration, read count, write count, and skip count. Wire these into your observability stack to alert on failed jobs or jobs that run longer than expected.

```java
@Bean
public JobExecutionListener metricsListener(MeterRegistry registry) {
    return new JobExecutionListener() {
        private Timer.Sample sample;

        @Override
        public void beforeJob(JobExecution jobExecution) {
            sample = Timer.start(registry);
        }

        @Override
        public void afterJob(JobExecution jobExecution) {
            sample.stop(registry.timer("batch.job.duration",
                    "job", jobExecution.getJobInstance().getJobName(),
                    "status", jobExecution.getStatus().toString()));
        }
    };
}
```

---

Processing millions of records reliably is not about clever tricks. It is about using a framework that has already solved the hard problems: chunked processing, restartability, parallel execution, and graceful error handling. Spring Batch gives you all of that. The job is to configure it correctly for your specific data volumes and latency requirements. Start with sensible defaults, measure everything, and scale up only when the numbers tell you to.
