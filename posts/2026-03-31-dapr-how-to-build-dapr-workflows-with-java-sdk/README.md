# How to Build Dapr Workflows with Java SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Java, Workflow, Microservice, Orchestration

Description: Learn how to build durable Dapr workflows using the Java SDK, covering activity definitions, orchestration, and parallel execution patterns.

---

Dapr Workflows enable developers to write long-running, stateful business logic that survives failures, restarts, and infrastructure changes. The Dapr Java SDK provides first-class support for workflow development using a familiar class-based approach. This guide shows you how to build production-ready workflows with the Java SDK from scratch.

## Project Setup with Maven

Start by creating a Maven project and adding the Dapr Java SDK dependency.

```xml
<dependencies>
  <dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk-workflows</artifactId>
    <version>1.12.0</version>
  </dependency>
  <dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk</artifactId>
    <version>1.12.0</version>
  </dependency>
  <dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-simple</artifactId>
    <version>2.0.7</version>
  </dependency>
</dependencies>
```

Create the project structure:

```text
src/
  main/
    java/
      com/example/workflows/
        OrderWorkflow.java
        ProcessOrderActivity.java
        ChargePaymentActivity.java
        SendNotificationActivity.java
        WorkflowApp.java
    resources/
      dapr/
        components/
          statestore.yaml
```

## Defining Workflow Activities

Each activity in a Dapr workflow extends `WorkflowActivity` and implements the `run` method.

```java
package com.example.workflows;

import io.dapr.workflows.runtime.WorkflowActivity;
import io.dapr.workflows.runtime.WorkflowActivityContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.HashMap;
import java.util.Map;

public class ProcessOrderActivity implements WorkflowActivity {

    private static final Logger logger = LoggerFactory.getLogger(ProcessOrderActivity.class);

    @Override
    public Object run(WorkflowActivityContext ctx) {
        logger.info("ProcessOrderActivity started");

        // Deserialize the input
        Map<String, Object> input = ctx.getInput(Map.class);
        String orderId = (String) input.get("orderId");
        int quantity = (int) input.get("quantity");

        // Simulate processing logic
        double total = quantity * 10.0;
        logger.info("Processed order {} with total {}", orderId, total);

        Map<String, Object> result = new HashMap<>();
        result.put("orderId", orderId);
        result.put("total", total);
        result.put("status", "processed");
        return result;
    }
}
```

```java
package com.example.workflows;

import io.dapr.workflows.runtime.WorkflowActivity;
import io.dapr.workflows.runtime.WorkflowActivityContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.HashMap;
import java.util.Map;

public class ChargePaymentActivity implements WorkflowActivity {

    private static final Logger logger = LoggerFactory.getLogger(ChargePaymentActivity.class);

    @Override
    public Object run(WorkflowActivityContext ctx) {
        Map<String, Object> input = ctx.getInput(Map.class);
        String orderId = (String) input.get("orderId");
        double amount = (double) input.get("amount");

        logger.info("Charging {} for order {}", amount, orderId);

        Map<String, Object> result = new HashMap<>();
        result.put("orderId", orderId);
        result.put("charged", amount);
        result.put("success", true);
        return result;
    }
}
```

## Writing the Workflow Orchestrator

The orchestrator class extends `Workflow` and defines the sequence of activities. It must be deterministic.

```java
package com.example.workflows;

import io.dapr.workflows.Workflow;
import io.dapr.workflows.WorkflowStub;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.HashMap;
import java.util.Map;

public class OrderWorkflow extends Workflow {

    private static final Logger logger = LoggerFactory.getLogger(OrderWorkflow.class);

    @Override
    public WorkflowStub create() {
        return ctx -> {
            logger.info("OrderWorkflow started: {}", ctx.getInstanceId());

            // Get the workflow input
            Map<String, Object> orderInput = ctx.getInput(Map.class);

            // Step 1: Process the order
            Map<String, Object> processResult = ctx.callActivity(
                ProcessOrderActivity.class.getName(),
                orderInput,
                Map.class
            ).await();

            // Step 2: Charge payment
            Map<String, Object> paymentInput = new HashMap<>();
            paymentInput.put("orderId", processResult.get("orderId"));
            paymentInput.put("amount", processResult.get("total"));

            Map<String, Object> paymentResult = ctx.callActivity(
                ChargePaymentActivity.class.getName(),
                paymentInput,
                Map.class
            ).await();

            // Step 3: Return result
            Map<String, Object> finalResult = new HashMap<>();
            finalResult.put("orderId", processResult.get("orderId"));
            finalResult.put("status", "completed");
            finalResult.put("charged", paymentResult.get("charged"));
            ctx.complete(finalResult);
        };
    }
}
```

## Running the Workflow Application

Register the workflow and activities with the Dapr runtime, then start an instance.

```java
package com.example.workflows;

import io.dapr.workflows.client.DaprWorkflowClient;
import io.dapr.workflows.client.WorkflowInstanceStatus;
import io.dapr.workflows.runtime.WorkflowRuntime;
import io.dapr.workflows.runtime.WorkflowRuntimeBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeoutException;

public class WorkflowApp {

    private static final Logger logger = LoggerFactory.getLogger(WorkflowApp.class);

    public static void main(String[] args) throws InterruptedException, TimeoutException {
        // Build and start the workflow runtime
        WorkflowRuntimeBuilder builder = new WorkflowRuntimeBuilder();
        builder.registerWorkflow(OrderWorkflow.class);
        builder.registerActivity(ProcessOrderActivity.class);
        builder.registerActivity(ChargePaymentActivity.class);

        try (WorkflowRuntime runtime = builder.build()) {
            runtime.start(false);

            // Start a new workflow instance using the client
            try (DaprWorkflowClient client = new DaprWorkflowClient()) {
                Map<String, Object> orderInput = new HashMap<>();
                orderInput.put("orderId", "ORD-12345");
                orderInput.put("quantity", 5);
                orderInput.put("email", "customer@example.com");

                String instanceId = client.scheduleNewWorkflow(
                    OrderWorkflow.class,
                    orderInput
                );
                logger.info("Started workflow with ID: {}", instanceId);

                // Wait for completion
                WorkflowInstanceStatus result = client.waitForInstanceCompletion(
                    instanceId,
                    null,
                    true
                );
                logger.info("Workflow completed with status: {}", result.getRuntimeStatus());
                logger.info("Result: {}", result.readOutputAs(Map.class));
            }
        }
    }
}
```

Run the application with Dapr:

```bash
dapr run --app-id order-workflow --dapr-grpc-port 50001 -- java -jar target/workflow-app.jar
```

## Implementing Fan-Out and Parallel Activities

Use `Task.whenAll` to run multiple activities in parallel and collect their results.

```java
import com.microsoft.durabletask.Task;
import java.util.ArrayList;
import java.util.List;

public class BatchOrderWorkflow extends Workflow {

    @Override
    public WorkflowStub create() {
        return ctx -> {
            Map<String, Object> input = ctx.getInput(Map.class);
            List<String> orderIds = (List<String>) input.get("orderIds");

            // Fan-out: schedule all activities in parallel
            List<Task<Map>> tasks = new ArrayList<>();
            for (String orderId : orderIds) {
                Map<String, Object> activityInput = new HashMap<>();
                activityInput.put("orderId", orderId);
                activityInput.put("quantity", 1);

                Task<Map> task = ctx.callActivity(
                    ProcessOrderActivity.class.getName(),
                    activityInput,
                    Map.class
                );
                tasks.add(task);
            }

            // Fan-in: wait for all to complete
            List<Map> results = ctx.allOf(tasks).await();

            Map<String, Object> summary = new HashMap<>();
            summary.put("processed", results.size());
            summary.put("results", results);
            ctx.complete(summary);
        };
    }
}
```

## Handling Timeouts and Compensations

Add retry policies and compensation logic to handle failures gracefully.

```java
import io.dapr.workflows.WorkflowTaskOptions;
import io.dapr.workflows.WorkflowTaskRetryPolicy;
import java.time.Duration;

public class ResilientOrderWorkflow extends Workflow {

    @Override
    public WorkflowStub create() {
        return ctx -> {
            Map<String, Object> input = ctx.getInput(Map.class);

            // Configure retry policy for the activity
            WorkflowTaskRetryPolicy retryPolicy = new WorkflowTaskRetryPolicy(
                3,                         // max retries
                Duration.ofSeconds(5),     // first retry interval
                1.5,                       // backoff coefficient
                Duration.ofSeconds(30),    // max retry interval
                null                       // no total timeout
            );

            WorkflowTaskOptions options = new WorkflowTaskOptions(retryPolicy);

            try {
                Map<String, Object> processResult = ctx.callActivity(
                    ProcessOrderActivity.class.getName(),
                    input,
                    options,
                    Map.class
                ).await();

                Map<String, Object> paymentInput = new HashMap<>();
                paymentInput.put("orderId", processResult.get("orderId"));
                paymentInput.put("amount", processResult.get("total"));

                Map<String, Object> paymentResult = ctx.callActivity(
                    ChargePaymentActivity.class.getName(),
                    paymentInput,
                    options,
                    Map.class
                ).await();

                ctx.complete(paymentResult);
            } catch (Exception e) {
                // Compensation: log and mark failed
                logger.error("Workflow failed: {}", e.getMessage());
                Map<String, Object> failResult = new HashMap<>();
                failResult.put("status", "failed");
                failResult.put("reason", e.getMessage());
                ctx.complete(failResult);
            }
        };
    }
}
```

## Summary

Building Dapr Workflows with the Java SDK follows a clean class-based model where activities encapsulate units of work and workflow orchestrators coordinate them deterministically. You learned how to set up a Maven project, define activities by implementing `WorkflowActivity`, write orchestrators with `Workflow`, run workflows using `DaprWorkflowClient`, parallelize tasks with fan-out patterns, and add resilience with retry policies. This foundation lets you build complex, durable business processes that survive failures in distributed Java applications.
