# Validation Summary: How to Integrate Power Automate with Azure Service Bus Queues

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Microsoft Power Automate
- Azure Service Bus queues
- Power Platform Service Bus connector
- Dead-letter queues
- Service Bus sessions
- Duplicate detection
- Scheduled messages

## Sources Consulted
- Microsoft Learn: Service Bus connector for Power Automate, Power Apps, and Azure Logic Apps - https://learn.microsoft.com/en-us/connectors/servicebus/
- Microsoft Learn: Overview of Service Bus dead-letter queues - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Microsoft Learn: Azure Service Bus duplicate message detection - https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection
- Microsoft Learn: Azure Service Bus message sessions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions
- Microsoft Learn: Power Automate limits and configuration - https://learn.microsoft.com/en-us/power-automate/limits-and-config
- Microsoft Learn: Azure Service Bus quotas and limits - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-quotas

## Issues Found
- The post said messages should be processed in order as a general reason to use the pattern. Azure Service Bus requires sessions when processing order must be preserved, so the wording was changed to specify using Service Bus sessions for messages for the same entity.
- The post suggested multiple consumers process different message types from the same queue. A Service Bus queue delivers each message to one consumer; message-type filtering is a topic/subscription pattern or flow-level branching concern. The wording was changed to describe competing consumers processing work from the same source without duplicate handling.
- The post described custom properties as useful for queue filtering and said consumer flows can filter on them. The Power Automate queue trigger does not expose broker-side filtering on queue custom properties, so this was changed to routing decisions and branching in the consumer flow.
- The dead-letter processing instructions said to append `/$deadletterqueue` to the queue name in Power Automate. The Service Bus connector exposes Queue type as `Main` or `DeadLetter`, so this was corrected to select the queue and set Queue type to `DeadLetter`.
- The post said trigger concurrency could be increased up to 50. Microsoft documents cloud flow trigger concurrency as 1 to 100 when Concurrency Control is enabled; 50 is the limit for `Apply to each` concurrency. The post was changed to say up to 100.

## Review Notes
The remaining examples and claims are consistent with Microsoft documentation: peek-lock receive requires explicit completion or abandonment, abandoned or expired locks increment delivery count, the default maximum delivery count is 10, Service Bus duplicate detection uses `MessageId`, and scheduled messages use a scheduled enqueue time in UTC.
