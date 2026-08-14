# Validation Summary: Move Failed Work to a Delayed Retry Queue Instead of Sleeping

## Status
validated

## Post Type
Technical architecture guide

## Technologies Covered

- Durable message queues and delayed schedulers
- Worker pools, concurrency limits, backoff, and retry fairness
- Amazon SQS message timers, delay queues, visibility timeouts, and FIFO message groups
- Amazon EventBridge Scheduler
- Azure Service Bus scheduled messages
- RabbitMQ 4.3 quorum-queue delayed retry, message TTL, and dead-letter exchanges
- Transactional outbox and idempotent-consumer patterns
- Distributed trace-context propagation

## Sources Consulted

- [Amazon SQS message timers](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-timers.html)
- [Amazon SQS delay queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS ChangeMessageVisibility API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ChangeMessageVisibility.html)
- [Amazon SQS SendMessage API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS FIFO delivery logic](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html)
- [Amazon EventBridge Scheduler documentation](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html)
- [Azure Service Bus message sequencing and scheduled messages](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing)
- [Azure Service Bus ScheduleMessagesAsync API](https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussender.schedulemessagesasync?view=azure-dotnet)
- [Azure Service Bus CancelScheduledMessagesAsync API](https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussender.cancelscheduledmessagesasync?view=azure-dotnet)
- [Azure Architecture Center asynchronous messaging guidance](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/messaging)
- [Azure Architecture Center background-job guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs)
- [RabbitMQ quorum queues: delayed retry and dead-lettering](https://www.rabbitmq.com/docs/quorum-queues#delayed-retry)
- [RabbitMQ time-to-live and expiration](https://www.rabbitmq.com/docs/ttl)
- [RabbitMQ dead-letter exchanges](https://www.rabbitmq.com/docs/dlx)
- [AWS Prescriptive Guidance: transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [W3C Trace Context Recommendation](https://www.w3.org/TR/trace-context/)
- [The Open Group POSIX monotonic-clock specification](https://pubs.opengroup.org/onlinepubs/9799919799/functions/V2_chap02.html)

## Issues Found

- The SQS wording said that changing visibility delays redelivery. `ChangeMessageVisibility` can also shorten the timeout or set it to zero, so the post now specifically describes extending visibility and states the cumulative 12-hour limit from the original `ReceiveMessage` request.
- The FIFO wording said that one in-flight message blocks all later same-group messages. A receive call can return multiple messages from one group, so the post now uses AWS's more precise rule: while messages from a group are in flight, subsequent receive calls do not return more messages from that group.
- The RabbitMQ section omitted the native delayed-retry feature added for quorum queues in RabbitMQ 4.3 and left dead-letter safety implicit. It now distinguishes native linear-backoff retry from TTL/DLX retry queues, states that default dead-letter forwarding is at-most-once, notes the opt-in quorum-queue at-least-once mode and its duplicate possibility, and gives the documented dead-letter-cycle behavior. The current quorum-queue documentation was added to the post's official links.

## Review Notes

- The JSON retry envelope is syntactically valid and is clearly illustrative rather than a broker-specific wire schema.
- The Azure scheduled-message claims are accurate. Scheduled messages can be peeked before activation, and the scheduled enqueue time does not guarantee immediate processing; the post already avoids claiming exact execution.
- SQS standard queues can still deliver duplicates during a visibility timeout under their at-least-once model. The post's stable-operation-ID and idempotent-consumer guidance accounts for this.
- No executable language examples, terminal commands, or configuration snippets required runtime or CLI validation.
