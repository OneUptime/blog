# How to Use Dapr Workflow with Java SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Java, Microservice, Orchestration

Description: Learn how to build durable, stateful workflows in Java using the Dapr Workflow API with the Java SDK for reliable microservice orchestration.

---

## Introduction

Dapr Workflow enables you to write durable, long-running business processes as code. With the Java SDK, you can define workflows and activities that survive failures and restarts without complex infrastructure setup.

## Setting Up Dependencies

Add the Dapr Java SDK to your `pom.xml`:

```xml
<dependency>
  <groupId>io.dapr</groupId>
  <artifactId>dapr-sdk-workflows</artifactId>
  <version>0.13.0</version>
</dependency>
```

## Defining a Workflow

Create a workflow class by extending `Workflow`:

```java
import io.dapr.workflows.Workflow;
import io.dapr.workflows.WorkflowStub;

public class OrderProcessingWorkflow implements Workflow {
    @Override
    public WorkflowStub create() {
        return ctx -> {
            String orderId = ctx.getInput(String.class);

            // Call activity to validate order
            Boolean isValid = ctx.callActivity(
                ValidateOrderActivity.class.getName(),
                orderId,
                Boolean.class
            ).await();

            if (!isValid) {
                ctx.complete("Order invalid");
                return;
            }

            // Call activity to process payment
            ctx.callActivity(
                ProcessPaymentActivity.class.getName(),
                orderId,
                String.class
            ).await();

            ctx.complete("Order processed: " + orderId);
        };
    }
}
```

## Defining Activities

Activities are the individual steps in a workflow:

```java
import io.dapr.workflows.WorkflowActivity;
import io.dapr.workflows.WorkflowActivityContext;

public class ValidateOrderActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String orderId = ctx.getInput(String.class);
        // validation logic
        return !orderId.isEmpty();
    }
}
```

## Registering and Starting the Runtime

```java
import io.dapr.workflows.runtime.WorkflowRuntime;
import io.dapr.workflows.runtime.WorkflowRuntimeBuilder;

public class Application {
    public static void main(String[] args) throws Exception {
        WorkflowRuntimeBuilder builder = new WorkflowRuntimeBuilder();
        builder.registerWorkflow(OrderProcessingWorkflow.class);
        builder.registerActivity(ValidateOrderActivity.class);
        builder.registerActivity(ProcessPaymentActivity.class);

        try (WorkflowRuntime runtime = builder.build()) {
            runtime.start(false);
        }
    }
}
```

## Starting a Workflow Instance

Use the `DaprWorkflowClient` to start and monitor workflows:

```java
import io.dapr.workflows.client.DaprWorkflowClient;
import io.dapr.workflows.client.WorkflowInstanceStatus;

try (DaprWorkflowClient client = new DaprWorkflowClient()) {
    String instanceId = client.scheduleNewWorkflow(
        OrderProcessingWorkflow.class,
        "order-123"
    );

    WorkflowInstanceStatus status = client.waitForInstanceCompletion(
        instanceId, Duration.ofSeconds(30), true
    );

    System.out.println("Result: " + status.readOutputAs(String.class));
}
```

## Summary

Dapr Workflow with the Java SDK lets you build fault-tolerant, stateful business processes using plain Java classes. By separating workflow logic from activity implementations, you get clear separation of concerns and built-in retry and durability guarantees without extra infrastructure.
