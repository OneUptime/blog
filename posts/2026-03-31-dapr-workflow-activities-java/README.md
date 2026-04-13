# How to Implement Workflow Activities in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Java, Activity, Microservice

Description: Learn how to implement Dapr workflow activities in Java using the Java SDK to build reliable, composable units of work in distributed applications.

---

## What Are Workflow Activities?

In Dapr workflows, an activity is a single unit of work that executes within a larger workflow orchestration. Activities are reliable by design - Dapr guarantees at-least-once execution and automatically retries failed activities. In Java, activities are implemented using the `WorkflowActivity` interface from the Dapr Java SDK.

Activities are ideal for operations like calling external APIs, writing to a database, sending notifications, or processing files. Unlike the workflow orchestrator itself, activities can perform non-deterministic operations and interact with external systems freely.

## Setting Up the Java SDK

Add the Dapr SDK to your `pom.xml`:

```xml
<dependency>
  <groupId>io.dapr</groupId>
  <artifactId>dapr-sdk-workflows</artifactId>
  <version>0.12.0</version>
</dependency>
```

## Defining a Workflow Activity

Implement the `WorkflowActivity` interface to define the activity's logic:

```java
import io.dapr.workflows.runtime.WorkflowActivity;
import io.dapr.workflows.runtime.WorkflowActivityContext;

public class SendEmailActivity implements WorkflowActivity {

    @Override
    public Object run(WorkflowActivityContext ctx) {
        EmailRequest request = ctx.getInput(EmailRequest.class);

        // Perform the actual work - calling an external service
        EmailService emailService = new EmailService();
        boolean sent = emailService.send(
            request.getTo(),
            request.getSubject(),
            request.getBody()
        );

        return new EmailResult(sent, System.currentTimeMillis());
    }
}
```

## Calling Activities from a Workflow

Activities are scheduled from within a workflow using `ctx.callActivity()`. The workflow orchestrator will hand off execution to the activity and resume once it completes:

```java
import io.dapr.workflows.Workflow;
import io.dapr.workflows.WorkflowStub;

public class OrderWorkflow implements Workflow {

    @Override
    public WorkflowStub create() {
        return ctx -> {
            OrderRequest order = ctx.getInput(OrderRequest.class);

            // Call activity to process payment
            PaymentResult payment = ctx.callActivity(
                ProcessPaymentActivity.class.getName(),
                order.getPayment(),
                PaymentResult.class
            ).await();

            if (!payment.isSuccess()) {
                ctx.complete("Payment failed");
                return;
            }

            // Call activity to send confirmation
            ctx.callActivity(
                SendEmailActivity.class.getName(),
                new EmailRequest(order.getEmail(), "Order Confirmed", "Your order is confirmed."),
                EmailResult.class
            ).await();

            ctx.complete("Order processed");
        };
    }
}
```

## Registering Activities with the Dapr Runtime

All activities and workflows must be registered before starting the runtime:

```java
import io.dapr.workflows.runtime.WorkflowRuntime;
import io.dapr.workflows.runtime.WorkflowRuntimeBuilder;

public class App {
    public static void main(String[] args) throws Exception {
        WorkflowRuntimeBuilder builder = new WorkflowRuntimeBuilder();
        builder.registerWorkflow(OrderWorkflow.class);
        builder.registerActivity(ProcessPaymentActivity.class);
        builder.registerActivity(SendEmailActivity.class);

        try (WorkflowRuntime runtime = builder.build()) {
            runtime.start(false);
        }
    }
}
```

## Passing Input and Output

Activities receive typed input via `ctx.getInput()` and return any serializable object. Use POJOs with a default constructor to ensure proper JSON serialization:

```java
public class PaymentResult {
    private boolean success;
    private String transactionId;

    public PaymentResult() {}

    public PaymentResult(boolean success, String transactionId) {
        this.success = success;
        this.transactionId = transactionId;
    }

    // getters and setters
}
```

## Summary

Dapr workflow activities in Java are straightforward to implement using the `WorkflowActivity` interface. Activities handle all side effects in a workflow - external calls, database writes, and notifications - while the orchestrator handles sequencing and retry logic. Register all activities at startup and pass strongly-typed POJOs for clean, maintainable workflow code.
