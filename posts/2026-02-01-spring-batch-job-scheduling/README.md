# How to Configure Spring Batch Job Scheduling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Spring Batch, Scheduling, Jobs, ETL

Description: A practical guide to configuring and scheduling Spring Batch jobs for reliable data processing and ETL workflows.

---

If you have ever worked on data processing pipelines, you know that batch jobs are the backbone of most enterprise applications. Whether it is importing CSV files, syncing databases, generating reports, or running nightly ETL workflows - batch processing handles the heavy lifting when real-time processing is not necessary or practical.

Spring Batch is the go-to framework in the Java ecosystem for building robust batch applications. But writing the job logic is only half the battle. You also need to schedule these jobs to run at the right times, handle failures gracefully, and restart jobs that did not complete successfully. This post walks through configuring Spring Batch jobs from scratch and covers multiple scheduling approaches.

## Understanding Spring Batch Core Concepts

Before diving into scheduling, let us establish the foundational components that make up a Spring Batch job.

### Job

A Job is the top-level container that represents an entire batch process. Think of it as a blueprint that defines the sequence of steps your batch application will execute.

### Step

A Step is a single phase within a Job. Most jobs consist of multiple steps - for example, one step to read and validate data, another to transform it, and a third to write the results.

### ItemReader

The ItemReader is responsible for retrieving data from a source. Spring Batch provides readers for databases, flat files, XML, JSON, and more. You can also write custom readers.

### ItemProcessor

The ItemProcessor handles business logic and data transformation. It takes items from the reader, processes them, and passes them to the writer. This is where validation, enrichment, and filtering typically happen.

### ItemWriter

The ItemWriter persists the processed data to the target destination. Like readers, Spring Batch ships with writers for common destinations.

## Setting Up a Basic Spring Batch Project

First, add the necessary dependencies to your project. If you are using Maven, include these in your pom.xml:

```xml
<!-- Spring Batch core dependency for batch processing capabilities -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-batch</artifactId>
</dependency>

<!-- Database for storing batch job metadata (execution history, status, etc.) -->
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

For Gradle users, add these to your build.gradle:

```groovy
// Spring Batch starter includes everything needed for batch processing
implementation 'org.springframework.boot:spring-boot-starter-batch'

// H2 provides in-memory database for job repository during development
runtimeOnly 'com.h2database:h2'
```

## Building Your First Batch Job

Let us create a practical example - a job that processes customer records from a CSV file and writes them to a database.

First, define the domain model:

```java
// Simple POJO representing a customer record from our CSV file
public class Customer {
    private String id;
    private String name;
    private String email;
    private LocalDate registrationDate;
    
    // Constructors, getters, and setters omitted for brevity
}
```

Now, configure the batch job with all its components:

```java
@Configuration
@EnableBatchProcessing
public class CustomerBatchConfig {

    // JobRepository stores metadata about job executions
    // PlatformTransactionManager handles database transactions
    @Bean
    public Job customerImportJob(JobRepository jobRepository,
                                  PlatformTransactionManager transactionManager) {
        return new JobBuilder("customerImportJob", jobRepository)
                // Define the single step this job will execute
                .start(customerImportStep(jobRepository, transactionManager))
                .build();
    }

    @Bean
    public Step customerImportStep(JobRepository jobRepository,
                                    PlatformTransactionManager transactionManager) {
        return new StepBuilder("customerImportStep", jobRepository)
                // Process 100 records at a time before committing
                // Larger chunks improve performance but use more memory
                .<Customer, Customer>chunk(100, transactionManager)
                .reader(customerReader())
                .processor(customerProcessor())
                .writer(customerWriter())
                .build();
    }

    @Bean
    public FlatFileItemReader<Customer> customerReader() {
        return new FlatFileItemReaderBuilder<Customer>()
                .name("customerReader")
                // Source file location - use classpath for bundled files
                .resource(new ClassPathResource("customers.csv"))
                // Skip the header row containing column names
                .linesToSkip(1)
                .delimited()
                // Map CSV columns to Customer fields by position
                .names("id", "name", "email", "registrationDate")
                // Convert each line to a Customer object
                .fieldSetMapper(new BeanWrapperFieldSetMapper<>() {{
                    setTargetType(Customer.class);
                }})
                .build();
    }

    @Bean
    public ItemProcessor<Customer, Customer> customerProcessor() {
        // Lambda processor that validates and transforms each customer
        return customer -> {
            // Skip invalid records by returning null
            if (customer.getEmail() == null || !customer.getEmail().contains("@")) {
                return null;
            }
            // Normalize email to lowercase for consistency
            customer.setEmail(customer.getEmail().toLowerCase());
            return customer;
        };
    }

    @Bean
    public JdbcBatchItemWriter<Customer> customerWriter() {
        return new JdbcBatchItemWriterBuilder<Customer>()
                // DataSource is auto-configured by Spring Boot
                .dataSource(dataSource)
                // Insert statement with named parameters matching Customer fields
                .sql("INSERT INTO customers (id, name, email, registration_date) " +
                     "VALUES (:id, :name, :email, :registrationDate)")
                // Use bean properties as named parameters
                .beanMapped()
                .build();
    }
}
```

## Scheduling Jobs with @Scheduled

The simplest way to schedule batch jobs is using Spring's built-in `@Scheduled` annotation. This works well for straightforward scheduling needs within a single application instance.

First, enable scheduling in your application:

```java
@SpringBootApplication
@EnableScheduling
public class BatchApplication {
    public static void main(String[] args) {
        SpringApplication.run(BatchApplication.class, args);
    }
}
```

Then create a scheduler service to trigger your jobs:

```java
@Service
public class BatchJobScheduler {

    private final JobLauncher jobLauncher;
    private final Job customerImportJob;

    // Constructor injection ensures dependencies are available
    public BatchJobScheduler(JobLauncher jobLauncher, 
                             @Qualifier("customerImportJob") Job customerImportJob) {
        this.jobLauncher = jobLauncher;
        this.customerImportJob = customerImportJob;
    }

    // Run every day at 2 AM - chosen to avoid peak business hours
    // Cron format: second minute hour day-of-month month day-of-week
    @Scheduled(cron = "0 0 2 * * *")
    public void runCustomerImportJob() {
        try {
            // JobParameters must be unique for each execution
            // Using timestamp ensures we can run the same job multiple times
            JobParameters params = new JobParametersBuilder()
                    .addLong("time", System.currentTimeMillis())
                    .toJobParameters();
            
            JobExecution execution = jobLauncher.run(customerImportJob, params);
            System.out.println("Job completed with status: " + execution.getStatus());
            
        } catch (JobExecutionException e) {
            System.err.println("Job failed: " + e.getMessage());
        }
    }

    // Alternative: run every 30 minutes using fixed rate
    // Useful for polling scenarios or frequent sync jobs
    @Scheduled(fixedRate = 1800000)
    public void runPeriodicSync() {
        // Similar implementation
    }
}
```

The `@Scheduled` approach has limitations though. It does not handle distributed environments well - if you run multiple instances of your application, each instance will trigger the job independently. This can lead to duplicate processing and race conditions.

## Integrating Quartz for Advanced Scheduling

For production systems, Quartz Scheduler provides more robust scheduling capabilities including clustering support, persistent job storage, and misfire handling.

Add the Quartz dependency:

```xml
<!-- Quartz integration for enterprise-grade job scheduling -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-quartz</artifactId>
</dependency>
```

Configure Quartz for clustered execution:

```yaml
# application.yml
spring:
  quartz:
    job-store-type: jdbc
    jdbc:
      # Let Quartz create its tables on startup
      initialize-schema: always
    properties:
      org:
        quartz:
          scheduler:
            instanceId: AUTO
          jobStore:
            # Enable clustering so only one node runs each job
            isClustered: true
            clusterCheckinInterval: 10000
            class: org.springframework.scheduling.quartz.LocalDataSourceJobStore
          threadPool:
            threadCount: 5
```

Create a Quartz job that triggers your Spring Batch job:

```java
// Quartz Job that acts as a bridge to Spring Batch
// DisallowConcurrentExecution prevents overlapping runs of the same job
@DisallowConcurrentExecution
public class CustomerImportQuartzJob extends QuartzJobBean {

    // These get injected through the SchedulerFactoryBean configuration
    private JobLauncher jobLauncher;
    private Job customerImportJob;

    @Override
    protected void executeInternal(JobExecutionContext context) {
        try {
            // Extract parameters passed through Quartz JobDataMap
            JobDataMap dataMap = context.getMergedJobDataMap();
            
            JobParametersBuilder builder = new JobParametersBuilder()
                    .addLong("time", System.currentTimeMillis());
            
            // Pass any custom parameters from the trigger
            if (dataMap.containsKey("inputFile")) {
                builder.addString("inputFile", dataMap.getString("inputFile"));
            }
            
            JobExecution execution = jobLauncher.run(customerImportJob, builder.toJobParameters());
            
            // Store result in context for listeners or monitoring
            context.setResult(execution.getStatus());
            
        } catch (Exception e) {
            throw new JobExecutionException("Batch job failed", e);
        }
    }

    // Setters for Spring injection through JobDataMap
    public void setJobLauncher(JobLauncher jobLauncher) {
        this.jobLauncher = jobLauncher;
    }

    public void setCustomerImportJob(Job customerImportJob) {
        this.customerImportJob = customerImportJob;
    }
}
```

Register the Quartz job and trigger:

```java
@Configuration
public class QuartzConfig {

    @Bean
    public JobDetail customerImportJobDetail() {
        // JobDetail defines what job to run
        return JobBuilder.newJob(CustomerImportQuartzJob.class)
                .withIdentity("customerImportJob", "batch-jobs")
                // Store durably so the job persists even without triggers
                .storeDurably()
                .build();
    }

    @Bean
    public Trigger customerImportTrigger(JobDetail customerImportJobDetail) {
        // Trigger defines when to run the job
        return TriggerBuilder.newTrigger()
                .forJob(customerImportJobDetail)
                .withIdentity("customerImportTrigger", "batch-triggers")
                // Run at 2 AM daily with misfire handling
                .withSchedule(CronScheduleBuilder
                        .dailyAtHourAndMinute(2, 0)
                        // If server was down, run once immediately on recovery
                        .withMisfireHandlingInstructionFireAndProceed())
                .build();
    }

    // Wire Spring beans into Quartz jobs
    @Bean
    public SchedulerFactoryBeanCustomizer schedulerFactoryBeanCustomizer(
            ApplicationContext applicationContext) {
        return schedulerFactoryBean -> {
            AutowiringSpringBeanJobFactory jobFactory = new AutowiringSpringBeanJobFactory();
            jobFactory.setApplicationContext(applicationContext);
            schedulerFactoryBean.setJobFactory(jobFactory);
        };
    }
}
```

## Working with Job Parameters

Job parameters serve two purposes: they make each job execution unique, and they pass runtime configuration to your jobs.

```java
@Bean
public Step parameterizedStep(JobRepository jobRepository,
                               PlatformTransactionManager transactionManager) {
    return new StepBuilder("parameterizedStep", jobRepository)
            .<Customer, Customer>chunk(100, transactionManager)
            // Use late binding to inject parameters at runtime
            .reader(parameterizedReader(null))
            .processor(customerProcessor())
            .writer(customerWriter())
            .build();
}

// StepScope creates a new reader instance for each step execution
// This enables late binding of job parameters
@Bean
@StepScope
public FlatFileItemReader<Customer> parameterizedReader(
        @Value("#{jobParameters['inputFile']}") String inputFile) {
    
    return new FlatFileItemReaderBuilder<Customer>()
            .name("parameterizedReader")
            // Use parameter value to determine input file
            .resource(new FileSystemResource(inputFile))
            .linesToSkip(1)
            .delimited()
            .names("id", "name", "email", "registrationDate")
            .fieldSetMapper(new BeanWrapperFieldSetMapper<>() {{
                setTargetType(Customer.class);
            }})
            .build();
}
```

Launch the job with parameters:

```java
public void runJobWithParameters(String inputFilePath) {
    JobParameters params = new JobParametersBuilder()
            // Identifying parameter - different values create new job instances
            .addString("inputFile", inputFilePath, true)
            // Non-identifying parameter - does not affect job instance identity
            .addLong("time", System.currentTimeMillis(), false)
            .toJobParameters();
    
    jobLauncher.run(customerImportJob, params);
}
```

## Handling Restarts and Recovery

One of Spring Batch's strengths is its restart capability. If a job fails midway through processing, you can restart it from where it left off rather than starting over.

Configure restart behavior at the step level:

```java
@Bean
public Step restartableStep(JobRepository jobRepository,
                            PlatformTransactionManager transactionManager) {
    return new StepBuilder("restartableStep", jobRepository)
            .<Customer, Customer>chunk(100, transactionManager)
            .reader(customerReader())
            .processor(customerProcessor())
            .writer(customerWriter())
            // Retry transient failures up to 3 times
            .faultTolerant()
            .retryLimit(3)
            .retry(DeadlockLoserDataAccessException.class)
            // Skip bad records instead of failing the entire job
            .skipLimit(10)
            .skip(FlatFileParseException.class)
            // Allow restart from the last successful commit point
            .allowStartIfComplete(false)
            .build();
}
```

To restart a failed job, use the same identifying parameters:

```java
public void restartFailedJob(String inputFile) {
    // Using the same inputFile parameter restarts the existing job instance
    // Spring Batch tracks progress and resumes from the last checkpoint
    JobParameters params = new JobParametersBuilder()
            .addString("inputFile", inputFile, true)
            .toJobParameters();
    
    try {
        jobLauncher.run(customerImportJob, params);
    } catch (JobRestartException e) {
        System.err.println("Cannot restart job: " + e.getMessage());
    }
}
```

## Monitoring Job Execution

Spring Batch maintains detailed execution history in its job repository. Query this data to build dashboards or alerts:

```java
@Service
public class JobMonitoringService {

    private final JobExplorer jobExplorer;

    public void checkRecentExecutions(String jobName) {
        // Get the last 10 executions of this job
        List<JobInstance> instances = jobExplorer.findJobInstancesByJobName(jobName, 0, 10);
        
        for (JobInstance instance : instances) {
            List<JobExecution> executions = jobExplorer.getJobExecutions(instance);
            
            for (JobExecution execution : executions) {
                System.out.printf("Job: %s, Start: %s, Status: %s, Duration: %dms%n",
                        jobName,
                        execution.getStartTime(),
                        execution.getStatus(),
                        Duration.between(execution.getStartTime(), 
                                        execution.getEndTime()).toMillis());
                
                // Check step-level details for failures
                for (StepExecution step : execution.getStepExecutions()) {
                    if (step.getStatus() == BatchStatus.FAILED) {
                        System.out.printf("  Failed step: %s, Read: %d, Written: %d%n",
                                step.getStepName(),
                                step.getReadCount(),
                                step.getWriteCount());
                    }
                }
            }
        }
    }
}
```

## Best Practices for Production

A few lessons learned from running batch jobs in production:

**Use idempotent operations** - Your jobs should produce the same result whether run once or multiple times. This makes restarts safe and debugging easier.

**Set appropriate chunk sizes** - Smaller chunks commit more frequently, reducing the amount of work lost on failure. Larger chunks are more efficient but risk more data on rollback. Start with 100-500 and tune based on your data.

**Externalize configuration** - Keep file paths, schedule expressions, and batch sizes in configuration files. This allows operations teams to tune jobs without code changes.

**Implement job listeners** - Use JobExecutionListener and StepExecutionListener to log metrics, send notifications, and clean up resources.

**Plan for data growth** - That job running fine with 10,000 records will behave differently with 10 million. Test with production-sized data sets.

Batch processing might not be glamorous, but getting it right makes the difference between systems that run smoothly and ones that keep you up at night. Spring Batch provides the framework - now you have the tools to schedule and manage your jobs effectively.

---

*Monitor batch jobs with [OneUptime](https://oneuptime.com) - track job completion and failure rates.*
