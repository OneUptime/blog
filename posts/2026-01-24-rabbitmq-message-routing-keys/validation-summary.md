# Validation Summary: How to Handle RabbitMQ Message Routing Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1 exchanges, bindings, routing keys, and alternate exchanges
- Direct exchanges
- Topic exchanges
- Headers exchanges
- Node.js with amqplib
- Python with Pika
- Mermaid diagrams

## Sources Consulted
- RabbitMQ AMQP 0-9-1 Model Explained: https://www.rabbitmq.com/tutorials/amqp-concepts
- RabbitMQ Topic Exchange tutorial: https://www.rabbitmq.com/tutorials/tutorial-five-swift
- RabbitMQ Alternate Exchanges: https://www.rabbitmq.com/docs/ae
- RabbitMQ Exchanges guide: https://www.rabbitmq.com/docs/exchanges
- amqplib Channel API reference: https://amqp-node.github.io/amqplib/channel_api.html
- Pika mandatory publishing example: https://pika.readthedocs.io/en/stable/examples/blocking_publish_mandatory.html
- Pika Channel API reference: https://pika.readthedocs.io/en/stable/modules/channel.html

## Issues Found
- The headers exchange example used a duplicate JavaScript object key for `priority`, so the `urgent` value would be overwritten by `high`. I changed the high-priority queue to use two bindings, one for `priority: urgent` and one for `priority: high`, because a single JavaScript object cannot represent two values for the same header key.
- The routing-key validator converted `#` to a simple regular expression fragment. That did not correctly model RabbitMQ topic semantics where `#` matches zero or more dot-delimited words, for example `order.#` should match `order`. I replaced it with a small topic-pattern matcher that handles `*` and `#` using RabbitMQ-style word matching.
- The unroutable-message section described alternate-exchange behavior as dead-letter routing. RabbitMQ dead-letter exchanges and alternate exchanges are different features. I renamed the section and example to alternate exchange routing and updated the diagram, code, and best-practice wording.
- The Pika mandatory-publish example used a return callback flow while also enabling publisher confirms. Pika's BlockingConnection documentation shows `mandatory=True` with `confirm_delivery()` raising `pika.exceptions.UnroutableError`. I updated the example to catch that exception and clarified that messages routed through an alternate exchange count as routed for the mandatory flag.

## Review Notes
- I verified the edited JavaScript routing-key matcher with local Node.js test cases for `*` and `#` behavior.
- I verified the edited Python alternate-exchange example with a local syntax compile check. I did not run the RabbitMQ examples end-to-end because no broker was started for this review.
