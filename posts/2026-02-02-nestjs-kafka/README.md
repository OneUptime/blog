# NestJS Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NestJS, Kafka, Microservices, Event Streaming, TypeScript

Description: Integrate Apache Kafka with NestJS applications for reliable, high-throughput event streaming and messaging.

---

Apache Kafka is a distributed event streaming platform capable of handling trillions of events daily. Integrating Kafka with NestJS enables building scalable microservices architectures with reliable message delivery, event sourcing, and real-time data pipelines. NestJS provides first-class Kafka support through its microservices package.

Setting up Kafka in NestJS involves configuring the KafkaClient in your microservices module. You specify broker addresses, client and group IDs, and optional configuration for SSL, SASL authentication, and retry policies. The client can act as both a producer and consumer, enabling bidirectional communication.

Consuming messages uses the `@MessagePattern()` or `@EventPattern()` decorators on controller methods. MessagePattern expects a response (request-reply), while EventPattern handles fire-and-forget events. The handler receives the message payload and can optionally access Kafka-specific context like partition, offset, and headers.

Producing messages is done through the ClientKafka instance, sending messages to specific topics. For transactional scenarios, you can use Kafka transactions to ensure atomic writes across multiple topics. The producer handles serialization, partitioning, and delivery acknowledgments.

Production Kafka deployments require careful attention to consumer group management, partition assignment, offset handling, and error recovery. Dead letter queues handle poison messages, and proper monitoring of consumer lag ensures your services keep up with message volume. Schema evolution using tools like Schema Registry maintains compatibility as your message formats evolve.
