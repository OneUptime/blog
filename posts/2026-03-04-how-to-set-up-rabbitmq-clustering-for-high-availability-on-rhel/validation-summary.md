# Validation Summary: How to Set Up RabbitMQ Clustering for High Availability on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- RabbitMQ clustering
- RabbitMQ quorum queues
- Erlang cookie authentication
- HAProxy TCP load balancing
- Python Pika client

## Sources Consulted
- RabbitMQ Clustering Guide: https://www.rabbitmq.com/docs/clustering
- RabbitMQ Quorum Queues Guide: https://www.rabbitmq.com/docs/4.1/quorum-queues
- RabbitMQ rabbitmqctl Manual: https://www.rabbitmq.com/docs/3.13/man/rabbitmqctl.8
- HAProxy Backend Configuration Documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/backends/
- Pika Connection Parameters Documentation: https://pika.readthedocs.io/en/stable/modules/parameters.html
- Pika Blocking Channel Documentation: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html

## Issues Found
- The post used `rabbitmqctl set_policy` with `{"queue-type": "quorum"}` to create quorum queues. RabbitMQ documentation states that `x-queue-type` must be supplied at queue declaration time and cannot be set or changed using a policy. I removed the invalid policy command and clarified that quorum queues must be declared with the queue type at creation time.
- The cluster join steps used the older `stop_app`, `reset`, `join_cluster`, `start_app` sequence. RabbitMQ 4.1 and later perform the necessary preparation in `rabbitmqctl join_cluster`, and `reset` is destructive. I updated the example to use the current `join_cluster` flow.
- The HAProxy example did not explicitly set TCP mode for AMQP traffic. I added `mode tcp` to both the frontend and backend so the configuration remains correct even if a default mode is configured elsewhere.

## Review Notes
- The Pika queue declaration with `arguments={'x-queue-type': 'quorum'}` is consistent with RabbitMQ quorum queue declaration requirements.
- Quorum queues require a majority of queue members to be available, and three-node clusters can tolerate one node failure.
- For older RabbitMQ versions before 4.1, operators may still need the pre-4.1 manual join sequence documented for those versions.
