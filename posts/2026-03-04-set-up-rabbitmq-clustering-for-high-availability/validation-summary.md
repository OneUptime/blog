# Validation Summary: How to Set Up RabbitMQ Clustering for High Availability on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- RabbitMQ clustering
- RabbitMQ quorum queues
- Erlang cookie authentication
- rabbitmqctl
- rabbitmqadmin
- Nginx stream load balancing

## Sources Consulted
- RabbitMQ Clustering Guide: https://www.rabbitmq.com/docs/clustering
- RabbitMQ Quorum Queues Guide: https://www.rabbitmq.com/docs/3.13/quorum-queues
- RabbitMQ rabbitmqadmin v2 Guide: https://www.rabbitmq.com/docs/management-cli
- NGINX TCP and UDP Load Balancing Documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/tcp-udp-load-balancer/
- HAProxy TCP Mode Documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/tcp/

## Issues Found
- The cluster join commands used the older `stop_app`, `reset`, `join_cluster`, and `start_app` sequence. RabbitMQ 4.1 and later no longer require stopping and resetting nodes before `join_cluster`; current documentation shows `rabbitmqctl join_cluster rabbit@rabbit1` performing the necessary preparations. Updated the commands to the current form.
- The quorum queue command used the older `rabbitmqadmin` v1 syntax with an `arguments` JSON value. The current `rabbitmqadmin` v2 documentation uses `rabbitmqadmin queues declare --name ... --type quorum --durable true`. Updated the command accordingly.
- The load balancer snippet was labeled as "HAProxy or Nginx configuration" but used an incomplete Nginx-style `upstream` block without the required `stream` context and TCP `server` proxy. Updated it to a valid Nginx stream configuration for AMQP TCP traffic on port 5672.

## Review Notes
- The post correctly identifies that RabbitMQ nodes need resolvable hostnames and matching Erlang cookies, and that quorum queues replicate queue contents for fault tolerance.
- RabbitMQ's documentation recommends odd cluster sizes for quorum-based features, so the three-node example is appropriate.
- For production use, the article could later mention required inter-node firewall ports, client reconnection behavior, and that quorum queue safety depends on publisher confirms for published messages.
