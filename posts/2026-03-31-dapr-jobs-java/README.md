# How to Use Dapr Jobs with Java SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Java, Scheduler, Microservice

Description: Learn how to schedule and manage one-time and recurring jobs in Java using the Dapr Jobs API for reliable task execution in distributed systems.

---

## Introduction

Dapr Jobs provides a durable job scheduling API that lets you schedule work to run at a specific time or on a recurring schedule. The Java SDK makes it straightforward to create and manage jobs from your application code.

## Adding the Dependency

Add the Dapr Java SDK to your `pom.xml`. The Jobs API requires at least version 1.15.0:

```xml
<dependency>
  <groupId>io.dapr</groupId>
  <artifactId>dapr-sdk</artifactId>
  <version>1.15.0</version>
</dependency>
```

## Creating a DaprPreviewClient

The Jobs API is available on `DaprPreviewClient`:

```java
import io.dapr.client.DaprPreviewClient;
import io.dapr.client.DaprClientBuilder;

DaprPreviewClient client = new DaprClientBuilder().buildPreviewClient();
```

## Scheduling a One-Time Job

Schedule a job to run once at a specific time using a due time:

```java
import io.dapr.client.domain.ScheduleJobRequest;
import java.time.Instant;

ScheduleJobRequest request = new ScheduleJobRequest("send-report",
        Instant.parse("2026-04-01T10:00:00Z"))
    .setData("monthly-report".getBytes());

client.scheduleJob(request).block();
System.out.println("Job scheduled successfully");
```

## Scheduling a Recurring Job

Use cron expressions for recurring jobs. Dapr uses a six-field cron format that includes seconds:

```java
import io.dapr.client.domain.JobSchedule;

ScheduleJobRequest recurringRequest = new ScheduleJobRequest("cleanup-job",
        JobSchedule.fromString("0 0 2 * * *"))  // Daily at 2 AM
    .setData("cleanup-old-records".getBytes())
    .setRepeat(0);  // 0 means unlimited repeats

client.scheduleJob(recurringRequest).block();
```

## Implementing the Job Handler

Register an HTTP endpoint to handle job triggers:

```java
import org.springframework.web.bind.annotation.*;

@RestController
public class JobController {

    @PostMapping("/job/send-report")
    public ResponseEntity<Void> handleSendReport(@RequestBody byte[] data) {
        String jobData = new String(data);
        System.out.println("Executing job with data: " + jobData);
        // perform job work
        return ResponseEntity.ok().build();
    }

    @PostMapping("/job/cleanup-job")
    public ResponseEntity<Void> handleCleanup(@RequestBody byte[] data) {
        // cleanup logic
        return ResponseEntity.ok().build();
    }
}
```

## Getting Job Details

Retrieve information about a scheduled job:

```java
import io.dapr.client.domain.GetJobRequest;
import io.dapr.client.domain.GetJobResponse;

GetJobResponse job = client.getJob(new GetJobRequest("send-report")).block();
System.out.println("Job name: " + job.getName());
System.out.println("Job schedule: " + job.getSchedule());
```

## Deleting a Job

Cancel a job when it is no longer needed:

```java
import io.dapr.client.domain.DeleteJobRequest;

client.deleteJob(new DeleteJobRequest("send-report")).block();
System.out.println("Job deleted");
```

## Running with Dapr

The Jobs API uses the Dapr scheduler service, which runs automatically alongside the sidecar. No additional configuration or feature flags are required. Start your application with:

```bash
dapr run --app-id myapp --app-port 8080 -- java -jar target/myapp.jar
```

## Summary

Dapr Jobs in the Java SDK provides a simple API to schedule one-time and recurring tasks with durability and fault tolerance built in. The scheduler service handles persistence so jobs survive restarts, and the handler pattern keeps your job logic cleanly separated from scheduling concerns.
