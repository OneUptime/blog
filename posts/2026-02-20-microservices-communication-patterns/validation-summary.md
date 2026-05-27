# Validation Summary: Understanding Microservices Communication Patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microservices communication patterns
- REST over HTTP
- FastAPI
- Python requests
- gRPC
- Protocol Buffers
- RabbitMQ
- Pika
- Event-driven messaging
- Pub/Sub and message queues
- OneUptime monitoring

## Sources Consulted
- FastAPI HTTPException reference: https://fastapi.tiangolo.com/reference/exceptions/
- FastAPI async/await and blocking I/O guidance: https://fastapi.tiangolo.com/async/
- Requests quickstart for timeouts and raise_for_status: https://requests.readthedocs.io/en/master/user/quickstart/
- gRPC Python basics: https://grpc.io/docs/languages/python/basics/
- gRPC core concepts: https://grpc.io/docs/what-is-grpc/core-concepts/
- gRPC deadlines guide: https://grpc.io/docs/guides/deadlines/
- Protocol Buffers proto3 guide: https://protobuf.dev/programming-guides/proto3/
- Protocol Buffers proto3 language specification: https://protobuf.dev/reference/protobuf/proto3-spec/
- RabbitMQ publish/subscribe tutorial for Python: https://www.rabbitmq.com/tutorials/tutorial-three-python
- RabbitMQ work queues tutorial for persistent messages and basic_qos: https://www.rabbitmq.com/tutorials/tutorial-two-python
- RabbitMQ consumer acknowledgements and publisher confirms: https://www.rabbitmq.com/docs/3.13/confirms
- Pika channel API reference: https://pika.readthedocs.io/en/stable/modules/channel.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- OneUptime website: https://oneuptime.com

## Issues Found
- The REST section stated that REST uses JSON payloads. REST APIs commonly use JSON, but REST is not limited to JSON. Changed the wording to "commonly uses JSON payloads."
- The FastAPI example used blocking `requests` calls inside an `async def` route handler. FastAPI recommends plain `def` for blocking I/O libraries that do not use `await`. Changed the route handler to `def create_order(...)`.
- The gRPC section said gRPC "is faster than REST" and the client comment said it is "significantly faster." This is an overbroad claim because performance depends on payloads, transport, implementation, and workload. Reworded to say gRPC can be more efficient than JSON-based REST APIs for internal service-to-service communication.
- The REST vs gRPC diagram implied REST is tied to HTTP/1.1 and request-response only. Updated it to say REST often uses HTTP/1.1 or HTTP/2 and is resource-oriented.
- The asynchronous communication explanation said the sender does not wait for a response. Clarified that it does not wait for a downstream consumer response, since broker publishing can still involve network I/O and acknowledgements depending on configuration.
- The RabbitMQ publisher used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)`.
- The RabbitMQ publisher used numeric `delivery_mode=2`. This is valid AMQP usage, but RabbitMQ's current Python tutorial uses Pika's named persistent delivery mode. Updated it to `pika.DeliveryMode.Persistent`.
- The RabbitMQ consumer bound a queue to `order_events` without declaring the exchange. If the consumer starts before the publisher, binding to a missing exchange fails. Added a matching durable `exchange_declare` before `queue_bind`.

## Review Notes
The Python code snippets were checked with `ast.parse` and are syntactically valid. The local environment did not have FastAPI, grpcio, Pika, or protoc installed, so runtime execution and protobuf compilation were verified against official documentation rather than local package execution.
