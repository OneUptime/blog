# How to Run Background Tasks with WebJobs in Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, WebJobs, Background Tasks, Cloud Computing, DevOps, Azure Functions

Description: Learn how to create, deploy, and manage background tasks using WebJobs in Azure App Service for reliable asynchronous processing.

---

If you have ever built a web application that needs to process things in the background - sending emails, resizing images, cleaning up old records - you know that trying to do it all inside the request/response cycle is a bad idea. Azure App Service has a feature called WebJobs that lets you run background tasks alongside your web app without spinning up separate infrastructure.

In this post, I will walk through how to set up WebJobs, the different types available, and how to get them running reliably in production.

## What Are WebJobs?

WebJobs are a feature of Azure App Service that lets you run scripts or programs as background processes in the same context as your web app. They share the same sandbox and file system as your App Service, which makes them convenient for tasks that need access to the same resources.

There are two types of WebJobs:

- **Continuous WebJobs** - These run in a loop and stay alive as long as your App Service is running. Good for message queue processors and similar always-on workloads.
- **Triggered WebJobs** - These run on demand or on a schedule (using CRON expressions). Good for periodic cleanup tasks, report generation, or anything that does not need to run constantly.

## Creating a Simple Triggered WebJob

Let us start with a triggered WebJob. The simplest version is just a script. Here is a C# console application that processes items from a queue.

The following code sets up a basic WebJob host that listens for Azure Storage Queue messages:

```csharp
// Program.cs - Entry point for the WebJob
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MyWebJob
{
    class Program
    {
        static async Task Main(string[] args)
        {
            // Create the host builder with WebJobs SDK
            var builder = new HostBuilder();

            builder.ConfigureWebJobs(b =>
            {
                // Add Azure Storage bindings for queue triggers
                b.AddAzureStorageCoreServices();
                b.AddAzureStorageQueues();
            });

            // Configure logging so we can see what is happening
            builder.ConfigureLogging((context, b) =>
            {
                b.AddConsole();
                b.SetMinimumLevel(LogLevel.Information);
            });

            var host = builder.Build();

            using (host)
            {
                await host.RunAsync();
            }
        }
    }
}
```

Now you need a function that handles the actual work. Create a separate class for your job functions:

```csharp
// Functions.cs - Contains the actual job logic
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;

namespace MyWebJob
{
    public class Functions
    {
        // This method triggers whenever a message lands in the "orders" queue
        public static void ProcessOrder(
            [QueueTrigger("orders")] string orderMessage,
            ILogger logger)
        {
            logger.LogInformation($"Processing order: {orderMessage}");

            // Parse the order and do whatever work is needed
            var order = JsonSerializer.Deserialize<Order>(orderMessage);

            // Simulate some processing work
            ProcessOrderInternal(order);

            logger.LogInformation($"Order {order.Id} processed successfully");
        }

        private static void ProcessOrderInternal(Order order)
        {
            // Your business logic goes here
            // Send confirmation email, update inventory, etc.
        }
    }
}
```

## Deploying a WebJob

There are a few ways to deploy a WebJob to Azure App Service.

### Manual Upload via Azure Portal

The quickest way to test is through the portal. Go to your App Service, find the WebJobs blade in the left menu, and click Add. You will need to upload a ZIP file containing your compiled application or script.

The ZIP should contain everything needed to run: your executable, dependencies, and a settings file if you want a scheduled trigger.

### Deploying via Azure CLI

For a more automated approach, you can use the Azure CLI. First, package your application into a ZIP file, then deploy it:

```bash
# Build and publish the project
dotnet publish -c Release -o ./publish

# Create a ZIP of the published output
cd publish && zip -r ../webjob.zip . && cd ..

# Deploy the WebJob to your App Service
# Replace the placeholders with your actual resource names
az webapp webjob triggered upload \
    --resource-group my-resource-group \
    --name my-app-service \
    --webjob-name process-orders \
    --src webjob.zip
```

### Deploying as Part of Your Web App

If you are using Visual Studio or a CI/CD pipeline, you can include WebJobs directly in your web app deployment. Place your WebJob files in a specific folder structure:

```
app_data/
  jobs/
    triggered/
      my-webjob/
        run.cmd (or your executable)
        settings.job
    continuous/
      my-continuous-job/
        run.cmd
```

The `settings.job` file controls the schedule for triggered WebJobs using CRON expressions:

```json
{
    "schedule": "0 */5 * * * *"
}
```

That CRON expression runs the job every 5 minutes. The format is: second, minute, hour, day, month, day-of-week.

## Setting Up a Continuous WebJob

Continuous WebJobs are great for processing messages from a queue or running a long-lived daemon. The key difference is that Azure keeps them running, restarting them if they crash.

For a continuous WebJob to work properly, you need to enable the "Always On" setting on your App Service plan. Without it, the app (and your WebJob) will go to sleep after a period of inactivity.

To enable Always On:

1. Go to your App Service in the Azure Portal
2. Navigate to Configuration > General Settings
3. Set "Always On" to On
4. Save and restart

Note that Always On requires a Basic tier or higher App Service plan. The Free and Shared tiers do not support it.

## Monitoring WebJobs

You can check the status and logs of your WebJobs from the Azure Portal. Each WebJob run generates logs that you can access through the WebJobs dashboard.

For triggered WebJobs, you will see a history of runs with their status (success, failure, running). For continuous WebJobs, you can view the live output log.

You can also access WebJob logs programmatically through the Kudu API:

```bash
# Get the list of triggered WebJob runs
# The credentials come from your publish profile
curl -u '$username:password' \
    https://my-app-service.scm.azurewebsites.net/api/triggeredwebjobs/process-orders/history
```

## Scaling Considerations

WebJobs run on the same instances as your App Service. If you scale out to multiple instances, continuous WebJobs will run on all instances by default. This is fine for queue processors (they will compete for messages), but it can be a problem for jobs that should only run once.

To make a continuous WebJob run on a single instance only, add a `settings.job` file:

```json
{
    "is_singleton": true
}
```

This ensures only one instance picks up the job, even when you have multiple App Service instances.

## WebJobs vs Azure Functions

A common question is when to use WebJobs versus Azure Functions. Here is a rough guide:

- Use **WebJobs** when you need long-running processes, when your job needs access to the App Service file system, or when you want to keep everything in a single deployment.
- Use **Azure Functions** when you want independent scaling, pay-per-execution pricing, or you are building event-driven microservices.

WebJobs are simpler to set up if you already have an App Service, but Azure Functions are more flexible for new projects.

## Error Handling and Retries

The WebJobs SDK has built-in retry support for queue-triggered functions. If your function throws an exception, the message goes back to the queue and gets retried. After 5 failed attempts (by default), the message moves to a poison queue.

You can customize this behavior:

```csharp
// Configure retry behavior on the queue trigger
public static void ProcessOrder(
    [QueueTrigger("orders", MaxDequeueCount = 3)] string orderMessage,
    ILogger logger)
{
    // MaxDequeueCount = 3 means the message will be retried 3 times
    // before being moved to the poison queue
    logger.LogInformation($"Processing: {orderMessage}");
}
```

## Wrapping Up

WebJobs are a solid choice for running background tasks when you already have an Azure App Service. They are easy to deploy, share resources with your web app, and support both scheduled and continuous workloads. For most teams, they are the simplest path to getting background processing up and running without adding new infrastructure.

Start with a triggered WebJob for your periodic tasks, and consider continuous WebJobs when you need always-on processing. And make sure to set up proper logging and monitoring so you can catch issues before they become problems.
