# Validation Summary: How to Use MongoDB with RabbitMQ for Task Queues

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongo:7 Docker image, mongosh shell commands)
- RabbitMQ (rabbitmq:3-management Docker image, AMQP 0-9-1)
- Python with pika library (RabbitMQ client)
- Python with pymongo library (MongoDB driver)
- Docker Compose

## Sources Consulted
- pika documentation: https://pika.readthedocs.io/en/stable/
- pymongo documentation: https://pymongo.readthedocs.io/en/stable/
- RabbitMQ documentation on acknowledgements and `basic.nack`: https://www.rabbitmq.com/docs/confirms
- RabbitMQ documentation on message durability: https://www.rabbitmq.com/docs/queues#durability
- MongoDB documentation on `createIndex`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB documentation on update operators (`$set`, `$inc`): https://www.mongodb.com/docs/manual/reference/operator/update/
- Docker Hub pages for `rabbitmq` and `mongo` official images

## Issues Found
No technical issues found.

## Review Notes
- The `version: "3.8"` key in the Docker Compose file is obsolete in Docker Compose V2 (the `docker compose` CLI plugin). It is silently ignored and does not cause errors, but newer tutorials tend to omit it. Not a correctness issue.
- `delivery_mode=2` for persistent messages is correct and widely used. Newer pika versions (1.2.0+) also offer the more readable `pika.DeliveryMode.Persistent` enum, but the integer form remains fully supported.
- The worker correctly uses `basic_qos(prefetch_count=1)` to ensure fair dispatch across multiple workers, which is a best practice for task queues.
- The pattern of storing the task in MongoDB before publishing to RabbitMQ is the right order — if the publish fails, the task still exists in MongoDB and can be recovered, whereas the reverse order risks losing track of a queued message.
