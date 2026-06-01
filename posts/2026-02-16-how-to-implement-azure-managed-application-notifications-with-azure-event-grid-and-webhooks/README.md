# How to Use Azure Managed Application Notifications with Azure Event Grid

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Event Grid, Managed Applications, Webhook, Notification, Azure Marketplace, ISV, Event-Driven

Description: Implement real-time notifications for Azure Managed Application lifecycle events using Azure Event Grid subscriptions and webhook handlers.

---

When you publish a managed application on the Azure Marketplace, you need visibility into what is happening with your deployments. When does a customer deploy your application? When do they delete it? When do they change tags, access policy, or managed identity settings? Without notifications, you are flying blind - you only find out about issues when customers contact support.

Azure Managed Applications provide lifecycle notifications through a webhook endpoint, and Azure Event Grid provides a native eventing mechanism for Azure resource lifecycle events. In this guide, I will show you how to use the managed application notification endpoint, set up Event Grid subscriptions for resource-level events, build webhook handlers, and use these notifications to automate your operational workflows.

## Managed Application Lifecycle Events

Managed applications emit lifecycle notifications with `eventType` values and provisioning states:

- **PUT / Accepted** - The managed resource group was created and projected successfully
- **PUT / Succeeded** - A customer successfully deployed your managed application
- **PUT / Failed** - A deployment attempt failed
- **PATCH / Succeeded** - Tags, just-in-time access policy, or managed identity changed
- **DELETE / Deleting** - A customer started deleting the managed application
- **DELETE / Deleted** - The managed application was deleted
- **DELETE / Failed** - Deletion failed

Each of these events gives you an opportunity to take action: send a welcome email, alert your support team, clean up external resources, or update your customer database.

## Architecture

```mermaid
graph TD
    A[Managed App Deployment] --> B[Azure Resource Manager]
    B --> C[Managed App Notification Endpoint]
    B --> D[Event Grid System Topic]
    C --> E[Webhook Endpoint]
    D --> K[Event Grid Subscription]
    K --> F[Azure Function]
    K --> G[Logic App]
    E --> H[Your Backend]
    F --> I[Cosmos DB]
    G --> J[Email Notification]
```

## Setting Up the Event Grid System Topic

For granular resource events inside a managed resource group, create an Event Grid system topic on the managed resource group. This must be done in the subscription that contains the source resource group and requires permissions to create Event Grid system topics and event subscriptions:

```bash
# Create an Event Grid system topic for resource events in a managed resource group

az eventgrid system-topic create \
  --name topic-managed-app-events \
  --resource-group {event-grid-rg} \
  --location global \
  --topic-type "Microsoft.Resources.ResourceGroups" \
  --source "/subscriptions/{customer-sub-id}/resourceGroups/{managed-rg}"
```

For marketplace managed applications, you can also use the notification endpoint URL configured in Partner Center. This is a simpler approach that sends HTTP POST requests directly to your webhook endpoint whenever a lifecycle event occurs.

## Configuring Notification Endpoint in Partner Center

In the Partner Center technical configuration for your managed application plan, specify a notification endpoint URL:

```text
Notification Endpoint URL: https://api.yoursaas.com/webhooks/managed-app?sig={shared-secret}
```

Azure appends `/resource` to the notification endpoint URI. For the URL above, your webhook must handle POST requests at `https://api.yoursaas.com/webhooks/managed-app/resource?sig={shared-secret}` whenever lifecycle events occur for deployments of your managed application.

## Building the Webhook Handler

Create a webhook endpoint that processes managed application notifications:

```csharp
// Webhook controller that handles managed application lifecycle notifications
[ApiController]
[Route("webhooks/managed-app/resource")]
public class ManagedAppWebhookController : ControllerBase
{
    private readonly ICustomerService _customerService;
    private readonly INotificationService _notifications;
    private readonly IDeploymentTracker _deploymentTracker;
    private readonly ILogger<ManagedAppWebhookController> _logger;

    public ManagedAppWebhookController(
        ICustomerService customerService,
        INotificationService notifications,
        IDeploymentTracker deploymentTracker,
        ILogger<ManagedAppWebhookController> logger)
    {
        _customerService = customerService;
        _notifications = notifications;
        _deploymentTracker = deploymentTracker;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> HandleNotification(
        [FromBody] ManagedAppNotification notification,
        [FromQuery] string sig)
    {
        _logger.LogInformation(
            "Received notification: {EventType} for {ApplicationId}",
            notification.EventType, notification.ApplicationId);

        // Validate the shared secret and confirm state with Azure Resource Manager
        if (!ValidateSignature(sig))
        {
            _logger.LogWarning("Invalid notification signature");
            return Unauthorized();
        }

        switch (notification.EventType)
        {
            case "PUT":
                if (notification.ProvisioningState == "Succeeded")
                {
                    await HandleDeployment(notification);
                }
                else if (notification.ProvisioningState == "Failed")
                {
                    await HandleFailure(notification);
                }
                break;

            case "PATCH":
                await HandleUpdate(notification);
                break;

            case "DELETE":
                if (notification.ProvisioningState == "Deleting" ||
                    notification.ProvisioningState == "Deleted")
                {
                    await HandleDeletion(notification);
                }
                break;

            default:
                _logger.LogInformation(
                    "Unhandled event type: {EventType}", notification.EventType);
                break;
        }

        // Always return 200 to acknowledge receipt
        return Ok();
    }

    private async Task HandleDeployment(ManagedAppNotification notification)
    {
        // A customer deployed your managed application
        _logger.LogInformation(
            "New deployment: {AppId} on plan {Plan}",
            notification.ApplicationId, notification.Plan?.Name);

        // Track the deployment
        await _deploymentTracker.RecordDeploymentAsync(new Deployment
        {
            ApplicationId = notification.ApplicationId,
            PlanId = notification.Plan?.Name,
            DeployedAt = DateTime.UtcNow,
            Status = "Active"
        });

        // Send welcome notification to the customer
        await _notifications.SendWelcomeEmailAsync(
            notification.ApplicationId,
            notification.Plan?.Name);

        // Alert the sales team about the new deployment
        await _notifications.NotifySlackChannelAsync(
            "#new-customers",
            $"New managed app deployment {notification.ApplicationId} on plan {notification.Plan?.Name}");
    }

    private async Task HandleUpdate(ManagedAppNotification notification)
    {
        _logger.LogInformation(
            "Application updated: {AppId}", notification.ApplicationId);

        await _deploymentTracker.RecordUpdateAsync(
            notification.ApplicationId,
            notification.EventTime);
    }

    private async Task HandleFailure(ManagedAppNotification notification)
    {
        _logger.LogError(
            "Application provisioning failed: {AppId}. Error: {Error}",
            notification.ApplicationId,
            notification.Error?.Message);

        await _deploymentTracker.MarkAsFailedAsync(
            notification.ApplicationId,
            notification.Error?.Message);
    }

    private async Task HandleDeletion(ManagedAppNotification notification)
    {
        _logger.LogWarning(
            "Application deletion event: {AppId} state {State}",
            notification.ApplicationId, notification.ProvisioningState);

        // Update the deployment status
        await _deploymentTracker.MarkAsDeletedAsync(notification.ApplicationId);

        // Clean up any external resources
        await CleanUpExternalResourcesAsync(notification.ApplicationId);

        // Notify the customer success team
        await _notifications.NotifySlackChannelAsync(
            "#churn-alerts",
            $"Managed app deletion event for {notification.ApplicationId}. " +
            $"Investigate potential churn.");
    }

    private async Task CleanUpExternalResourcesAsync(string applicationId)
    {
        // Clean up any resources outside the managed resource group
        // e.g., DNS records, external API registrations, monitoring configs
        var deployment = await _deploymentTracker.GetAsync(applicationId);

        if (deployment != null)
        {
            // Remove DNS entries
            // Deregister from monitoring
            // Archive customer data
            _logger.LogInformation(
                "Cleaned up external resources for {AppId}", applicationId);
        }
    }

    private bool ValidateSignature(string sig)
    {
        // Compare the sig query parameter with the value configured in Partner Center.
        return sig == "{shared-secret}";
    }
}
```

## The Notification Payload

Here is the structure of a managed application notification:

```csharp
// Model representing a managed application lifecycle notification
public class ManagedAppNotification
{
    // The type of event: PUT, PATCH, DELETE
    public string EventType { get; set; }

    // The resource ID of the managed application
    public string ApplicationId { get; set; }

    // The time the event occurred
    public DateTimeOffset EventTime { get; set; }

    // The provisioning state of the application
    public string ProvisioningState { get; set; }

    // Service catalog applications include this value
    public string ApplicationDefinitionId { get; set; }

    // Marketplace applications include billing details and plan metadata
    public BillingDetails BillingDetails { get; set; }
    public Plan Plan { get; set; }

    // Error details if the operation failed
    public NotificationError Error { get; set; }
}

public class BillingDetails
{
    public string ResourceUsageId { get; set; }
}

public class Plan
{
    public string Publisher { get; set; }
    public string Product { get; set; }
    public string Name { get; set; }
    public string Version { get; set; }
}

public class NotificationError
{
    public string Code { get; set; }
    public string Message { get; set; }
    public List<NotificationError> Details { get; set; }
}
```

## Using Event Grid for More Granular Events

If you need events beyond the basic lifecycle notifications, set up Event Grid subscriptions on the managed resource group to capture events from individual resources:

```csharp
// Azure Function that creates Event Grid subscriptions when a managed app is deployed
public class EventGridSetupFunction
{
    private readonly EventGridManagementClient _eventGridClient;

    [FunctionName("SetupEventGridForDeployment")]
    public async Task Run(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequest req,
        ILogger log)
    {
        var notification = await JsonSerializer
            .DeserializeAsync<ManagedAppNotification>(req.Body);

        if (notification.EventType != "PUT" ||
            notification.ProvisioningState != "Succeeded")
        {
            return;
        }

        // Create an Event Grid subscription on the managed resource group
        var managedResourceGroupId = await ResolveManagedResourceGroupIdAsync(
            notification.ApplicationId);
        var subscriptionName = $"sub-{Guid.NewGuid():N}";

        var subscription = new EventSubscription
        {
            Destination = new WebHookEventSubscriptionDestination
            {
                EndpointUrl = "https://api.yoursaas.com/webhooks/resource-events"
            },
            Filter = new EventSubscriptionFilter
            {
                IncludedEventTypes = new List<string>
                {
                    "Microsoft.Resources.ResourceWriteSuccess",
                    "Microsoft.Resources.ResourceDeleteSuccess",
                    "Microsoft.Resources.ResourceActionSuccess"
                },
                SubjectBeginsWith = managedResourceGroupId
            }
        };

        await _eventGridClient.EventSubscriptions.CreateOrUpdateAsync(
            managedResourceGroupId,
            subscriptionName,
            subscription);

        log.LogInformation(
            "Created Event Grid subscription for {ManagedRg}",
            managedResourceGroupId);
    }

    private Task<string> ResolveManagedResourceGroupIdAsync(string applicationId)
    {
        // GET the managed application resource and read properties.managedResourceGroupId.
        return Task.FromResult("/subscriptions/{customer-sub-id}/resourceGroups/{managed-rg}");
    }
}
```

## Tracking Deployment Health

Use notifications to build a deployment health dashboard:

```csharp
// Service that tracks the health of all managed application deployments
public class DeploymentHealthService
{
    private readonly Container _deploymentsContainer;

    public async Task<DeploymentHealthReport> GetHealthReportAsync()
    {
        var query = new QueryDefinition(
            @"SELECT
                c.status,
                COUNT(1) as count
              FROM c
              GROUP BY c.status");

        var statusCounts = new Dictionary<string, int>();
        using var iterator = _deploymentsContainer.GetItemQueryIterator<dynamic>(query);

        while (iterator.HasMoreResults)
        {
            var response = await iterator.ReadNextAsync();
            foreach (var item in response)
            {
                statusCounts[(string)item.status] = (int)item.count;
            }
        }

        return new DeploymentHealthReport
        {
            TotalDeployments = statusCounts.Values.Sum(),
            ActiveDeployments = statusCounts.GetValueOrDefault("Active", 0),
            FailedDeployments = statusCounts.GetValueOrDefault("Failed", 0),
            DeletedDeployments = statusCounts.GetValueOrDefault("Deleted", 0),
            GeneratedAt = DateTime.UtcNow
        };
    }
}
```

## Retry and Reliability

Webhooks can fail. Azure retries managed application notifications for HTTP 429, HTTP 5xx, and temporarily unreachable endpoints for up to 10 hours, but you should also build your own retry mechanism for critical actions:

```csharp
// Durable function orchestration for reliable notification processing
[FunctionName("ProcessNotificationReliably")]
public async Task RunOrchestrator(
    [OrchestrationTrigger] IDurableOrchestrationContext context)
{
    var notification = context.GetInput<ManagedAppNotification>();

    // Retry up to 3 times with exponential backoff
    var retryOptions = new RetryOptions(
        firstRetryInterval: TimeSpan.FromSeconds(5),
        maxNumberOfAttempts: 3)
    {
        BackoffCoefficient = 2.0
    };

    // Track the deployment
    await context.CallActivityWithRetryAsync(
        "TrackDeployment", retryOptions, notification);

    // Send notifications
    await context.CallActivityWithRetryAsync(
        "SendNotifications", retryOptions, notification);

    // Set up monitoring
    await context.CallActivityWithRetryAsync(
        "ConfigureMonitoring", retryOptions, notification);
}
```

## Wrapping Up

Notifications are the operational backbone of a managed application business. Without them, you have no idea when customers deploy, update, or delete your application. Azure Event Grid and the Partner Center notification endpoint give you two complementary mechanisms for staying informed. The notification endpoint handles the high-level lifecycle events, while Event Grid subscriptions give you granular visibility into what is happening inside the managed resource group. Build your webhook handlers to be idempotent and reliable, track every deployment in a central store, and use the notification events to trigger automated workflows. This is what separates a managed application that just works from one that delivers a great operational experience for both you and your customers.
