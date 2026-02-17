# How to Build Azure Service Bus Namespaces with Topics and Subscriptions in Bicep

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bicep, Service Bus, Messaging, Infrastructure as Code, Cloud Architecture, Event-Driven

Description: Build Azure Service Bus namespaces with topics, subscriptions, and rules using Bicep templates for reliable messaging infrastructure.

---

Azure Service Bus is the backbone of many event-driven architectures on Azure. It handles reliable message delivery between services, supports pub/sub patterns with topics and subscriptions, and gives you features like dead-lettering and message sessions out of the box. But setting it up through the portal gets tedious fast, especially when you need multiple topics with different subscription rules. Bicep makes this much cleaner.

This post walks through building a complete Service Bus setup in Bicep, from the namespace down to individual subscription filter rules.

## Creating the Namespace

Everything starts with the namespace. This is the container for all your messaging entities. The SKU you choose determines the features available.

```bicep
// main.bicep
// Creates a Service Bus namespace with Standard tier for topic support

@description('The location for all resources')
param location string = resourceGroup().location

@description('The name of the Service Bus namespace')
param namespaceName string = 'sb-orders-prod-001'

@description('The SKU tier - must be Standard or Premium for topics')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param skuName string = 'Standard'

// Service Bus namespace - Standard tier required for topics
resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: namespaceName
  location: location
  sku: {
    name: skuName
    tier: skuName
  }
  properties: {
    // Disable local auth to enforce Azure AD authentication
    disableLocalAuth: false
    // Enable zone redundancy for Premium tier
    zoneRedundant: skuName == 'Premium' ? true : false
  }
  tags: {
    environment: 'production'
    service: 'order-processing'
  }
}

// Output the connection string for applications to use
output namespaceId string = serviceBusNamespace.id
output namespaceName string = serviceBusNamespace.name
```

A key detail: the Basic tier does not support topics and subscriptions. You need Standard at minimum. Premium adds features like VNet integration, larger message sizes, and dedicated capacity, but it costs significantly more.

## Adding Topics

Topics are the publish side of pub/sub. Publishers send messages to a topic, and each subscription on that topic gets its own copy of the message.

```bicep
// topics.bicep
// Defines topics for different business domains within the namespace

@description('Reference to the parent namespace name')
param namespaceName string

// Order events topic - receives all order-related events
resource ordersTopic 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  name: '${namespaceName}/orders'
  properties: {
    // Maximum size of the topic in MB
    maxSizeInMegabytes: 5120
    // How long messages live if not consumed
    defaultMessageTimeToLive: 'P14D'
    // Enable duplicate detection with a 10-minute window
    requiresDuplicateDetection: true
    duplicateDetectionHistoryTimeWindow: 'PT10M'
    // Enable batched operations for better throughput
    enableBatchedOperations: true
    // Support ordering within sessions
    supportOrdering: true
  }
}

// Notification events topic - for email, SMS, push notifications
resource notificationsTopic 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  name: '${namespaceName}/notifications'
  properties: {
    maxSizeInMegabytes: 1024
    defaultMessageTimeToLive: 'P7D'
    requiresDuplicateDetection: false
    enableBatchedOperations: true
  }
}

// Audit events topic - for compliance and logging
resource auditTopic 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  name: '${namespaceName}/audit-events'
  properties: {
    maxSizeInMegabytes: 10240
    defaultMessageTimeToLive: 'P30D'
    requiresDuplicateDetection: true
    duplicateDetectionHistoryTimeWindow: 'PT30M'
    enableBatchedOperations: true
  }
}

output ordersTopicName string = ordersTopic.name
output notificationsTopicName string = notificationsTopic.name
```

The `defaultMessageTimeToLive` uses ISO 8601 duration format. `P14D` means 14 days, `PT10M` means 10 minutes. Messages that sit around longer than this TTL get automatically removed.

## Creating Subscriptions

Subscriptions are the consumer side. Each subscription on a topic receives a copy of every message published to that topic, unless you add filter rules.

```bicep
// subscriptions.bicep
// Creates subscriptions with dead-letter support for the orders topic

@description('The namespace name')
param namespaceName string

// Subscription for the fulfillment service
resource fulfillmentSubscription 'Microsoft.ServiceBus/namespaces/topics/subscriptions@2022-10-01-preview' = {
  name: '${namespaceName}/orders/fulfillment-service'
  properties: {
    // How long to keep messages in the subscription
    defaultMessageTimeToLive: 'P7D'
    // Lock duration for peek-lock receive mode
    lockDuration: 'PT1M'
    // Maximum number of delivery attempts before dead-lettering
    maxDeliveryCount: 10
    // Enable dead-letter queue for messages that expire
    deadLetteringOnMessageExpiration: true
    // Dead-letter messages that fail filter evaluation
    deadLetteringOnFilterEvaluationExceptions: true
    // Enable batched operations
    enableBatchedOperations: true
  }
}

// Subscription for the analytics service - needs all order events
resource analyticsSubscription 'Microsoft.ServiceBus/namespaces/topics/subscriptions@2022-10-01-preview' = {
  name: '${namespaceName}/orders/analytics-service'
  properties: {
    defaultMessageTimeToLive: 'P3D'
    lockDuration: 'PT30S'
    maxDeliveryCount: 5
    deadLetteringOnMessageExpiration: true
    enableBatchedOperations: true
  }
}

// Subscription for the email notification service
resource emailSubscription 'Microsoft.ServiceBus/namespaces/topics/subscriptions@2022-10-01-preview' = {
  name: '${namespaceName}/orders/email-notifications'
  properties: {
    defaultMessageTimeToLive: 'P1D'
    lockDuration: 'PT1M'
    maxDeliveryCount: 3
    deadLetteringOnMessageExpiration: true
    enableBatchedOperations: true
  }
}
```

The `maxDeliveryCount` setting is crucial. When a consumer fails to process a message this many times, Service Bus moves it to the dead-letter queue. Set this thoughtfully based on your error handling strategy.

## Adding Subscription Filter Rules

Filters let subscriptions receive only the messages they care about. This is where things get really powerful.

```bicep
// rules.bicep
// Filter rules that route specific message types to specific subscriptions

@description('The namespace name')
param namespaceName string

// Fulfillment only cares about new orders and cancellations
resource fulfillmentRule 'Microsoft.ServiceBus/namespaces/topics/subscriptions/rules@2022-10-01-preview' = {
  name: '${namespaceName}/orders/fulfillment-service/order-events-filter'
  properties: {
    filterType: 'SqlFilter'
    sqlFilter: {
      // Only receive messages where eventType is OrderCreated or OrderCancelled
      sqlExpression: 'eventType IN (\'OrderCreated\', \'OrderCancelled\') AND region = \'us-east\''
    }
    action: {
      // Add a custom property to messages passing through this rule
      sqlExpression: 'SET processedBy = \'fulfillment-filter\''
    }
  }
}

// Email notifications only for completed orders above a certain value
resource emailRule 'Microsoft.ServiceBus/namespaces/topics/subscriptions/rules@2022-10-01-preview' = {
  name: '${namespaceName}/orders/email-notifications/high-value-completed'
  properties: {
    filterType: 'SqlFilter'
    sqlFilter: {
      sqlExpression: 'eventType = \'OrderCompleted\' AND orderTotal > 100'
    }
  }
}

// Correlation filter - matches on message properties directly
resource correlationRule 'Microsoft.ServiceBus/namespaces/topics/subscriptions/rules@2022-10-01-preview' = {
  name: '${namespaceName}/orders/analytics-service/all-events'
  properties: {
    filterType: 'CorrelationFilter'
    correlationFilter: {
      // Match on the content type property
      contentType: 'application/json'
      properties: {
        source: 'order-api'
      }
    }
  }
}
```

SQL filters evaluate a SQL-like expression against message properties. Correlation filters match exact values and are more performant. Use correlation filters when you can, SQL filters when you need operators like `IN`, `>`, or `LIKE`.

## Using Modules for Reusability

For larger setups, break the Bicep into modules. Here is how the main file can orchestrate everything.

```bicep
// main.bicep - orchestrates all modules
param location string = resourceGroup().location
param namespaceName string = 'sb-orders-prod-001'
param environment string = 'production'

// Create the namespace
module namespace 'modules/namespace.bicep' = {
  name: 'deploy-namespace'
  params: {
    location: location
    namespaceName: namespaceName
    skuName: environment == 'production' ? 'Premium' : 'Standard'
  }
}

// Create topics after namespace is ready
module topics 'modules/topics.bicep' = {
  name: 'deploy-topics'
  params: {
    namespaceName: namespace.outputs.namespaceName
  }
  dependsOn: [
    namespace
  ]
}

// Create subscriptions after topics are ready
module subscriptions 'modules/subscriptions.bicep' = {
  name: 'deploy-subscriptions'
  params: {
    namespaceName: namespace.outputs.namespaceName
  }
  dependsOn: [
    topics
  ]
}
```

## Deployment

Deploy the whole stack with a single Azure CLI command.

```bash
# Deploy the complete Service Bus infrastructure
az deployment group create \
  --resource-group rg-messaging-prod \
  --template-file main.bicep \
  --parameters namespaceName='sb-orders-prod-001' environment='production'
```

## Monitoring Considerations

After deploying, set up monitoring for dead-letter queue depth and active message counts. A growing dead-letter queue means something is wrong with your consumers. Bicep does not cover the monitoring side directly, but you can add diagnostic settings to ship Service Bus metrics to Log Analytics.

```bicep
// Enable diagnostic settings for the namespace
resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'sb-diagnostics'
  scope: serviceBusNamespace
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
    logs: [
      {
        category: 'OperationalLogs'
        enabled: true
      }
    ]
  }
}
```

## Summary

Bicep gives you a clean, readable way to define your Service Bus infrastructure. The hierarchical nature of Bicep resources maps naturally to the Service Bus resource model: namespaces contain topics, topics contain subscriptions, and subscriptions contain rules. By codifying this in Bicep templates, you get consistent deployments across environments, version-controlled infrastructure, and the ability to review messaging topology changes through pull requests just like any other code change.
