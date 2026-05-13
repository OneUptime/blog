# Validation Summary: How to Configure RabbitMQ Queues with Topology Operator via Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ Messaging Topology Operator
- RabbitMQ Cluster Operator
- RabbitMQ queues, exchanges, bindings, virtual hosts, users, and permissions
- RabbitMQ quorum and classic queues
- Kubernetes custom resources
- Flux CD Kustomization
- kubectl and rabbitmqctl

## Sources Consulted
- RabbitMQ Messaging Topology Operator overview: https://www.rabbitmq.com/kubernetes/operator/operator-overview
- RabbitMQ Messaging Topology Operator installation guide: https://www.rabbitmq.com/kubernetes/operator/install-topology-operator
- RabbitMQ Messaging Topology Operator usage guide: https://www.rabbitmq.com/kubernetes/operator/using-topology-operator
- RabbitMQ Messaging Topology Operator API reference: https://github.com/rabbitmq/messaging-topology-operator/blob/main/docs/api/rabbitmq.com.ref.asciidoc
- RabbitMQ access control documentation: https://www.rabbitmq.com/docs/access-control
- RabbitMQ quorum queue documentation: https://www.rabbitmq.com/docs/4.0/quorum-queues
- RabbitMQ queue length limit documentation: https://www.rabbitmq.com/docs/next/maxlength
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/3.13/man/rabbitmqctl.8
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The introduction described the Messaging Topology Operator as extending the Cluster Operator. Updated this to say it works alongside the Cluster Operator, matching RabbitMQ's documentation that treats them as separate operators.
- The prerequisites stated that the Messaging Topology Operator comes with the cluster operator Helm chart. Updated this to simply require the Messaging Topology Operator to be installed, because RabbitMQ documents it as a separate operator installation.
- The Exchange, Queue, and Binding examples used `spec.vhostReference`, which is not present in the current `rabbitmq.com/v1beta1` API reference. Replaced those fields with `spec.vhost: orders`.
- The Permission example used `spec.userReference`, but the current `Permission` CRD expects `spec.user` with the RabbitMQ username. Replaced it with `user: orders-service-user`.
- The dead-letter routing key was `order.dead-letter`, which matched the main queue binding `order.#` and would route dead-lettered messages back to the processing queue. Changed the dead-letter routing key and binding to `dead-letter.order`.
- The permission regex examples used `^order\\..*`, which did not match the example exchanges named `orders.topic`, `orders.direct`, and `orders.fanout`. Updated the regexes to match both `order.*` queues and `orders.*` exchanges.
- The `rabbitmqctl` verification commands used `--vhost orders`. The documented `rabbitmqctl` flag is `-p orders`, so the commands were updated.

## Review Notes
- The queue arguments are technically valid, but the Topology Operator API reference notes that queue arguments cannot be updated once set and recommends policies for mutable queue configuration.
- The `User` example assumes the referenced Secret contains credentials for a RabbitMQ username matching `orders-service-user`; in a real deployment the Secret must exist before the User resource is reconciled.
