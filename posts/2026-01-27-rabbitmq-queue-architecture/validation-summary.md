# Validation Summary: How to Design RabbitMQ Queue Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1 messaging model
- RabbitMQ exchanges, bindings, queues, and virtual hosts
- Classic, quorum, stream, priority, and dead-letter queues
- RabbitMQ CLI tools and management HTTP API
- Python Pika client

## Sources Consulted
- RabbitMQ AMQP 0-9-1 concepts: https://www.rabbitmq.com/tutorials/amqp-concepts
- RabbitMQ exchanges guide: https://www.rabbitmq.com/docs/exchanges
- RabbitMQ classic queues guide: https://www.rabbitmq.com/docs/classic-queues
- RabbitMQ quorum queues guide: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ streams guide: https://www.rabbitmq.com/docs/streams
- RabbitMQ dead letter exchanges guide: https://www.rabbitmq.com/docs/dlx
- RabbitMQ priority queues guide: https://www.rabbitmq.com/docs/priority
- RabbitMQ virtual hosts guide: https://www.rabbitmq.com/docs/vhosts
- RabbitMQ access control guide: https://www.rabbitmq.com/docs/access-control
- RabbitMQ consumer prefetch guide: https://www.rabbitmq.com/docs/consumer-prefetch
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- Pika channel API documentation: https://pika.readthedocs.io/en/stable/modules/channel.html

## Issues Found
- The classic queue section described classic queues as having optional mirrors. RabbitMQ 4.0 removed classic queue mirroring, so the section now says classic queues are non-replicated in RabbitMQ 4.x and are best for cases where data safety is not the priority.
- The quorum queue section described quorum queues as the recommended production choice in general. RabbitMQ documents them as the default choice when a replicated, highly available queue is needed, so the wording was narrowed to that case.
- The headers exchange code used `pdf_content` without defining it. Added a minimal bytes placeholder so the snippet is syntactically complete.
- The high availability section called mirrored classic queues deprecated and showed the old policy without version context. Updated it to note that classic mirroring only applies to RabbitMQ 3.13 and earlier and has no effect in RabbitMQ 4.x.
- The high availability comparison claimed quorum queues consume less bandwidth during replication. RabbitMQ documentation emphasizes stronger data safety, predictable leader election, higher throughput, and more stable latency than mirrored classic queues, so the unsupported bandwidth claim was replaced.
- The dead-letter explanation omitted quorum queue delivery-limit dead-lettering. Added that condition.
- The priority queue guidance said to keep priority levels under 10. RabbitMQ recommends 2-4 priority levels, so the guidance was corrected.

## Review Notes
The examples intentionally use queue arguments for readability. RabbitMQ documentation generally recommends policies for configurable operational settings such as TTL, length limits, and dead-lettering because policies can be changed without redeploying applications.
