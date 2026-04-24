# Validation Summary: How to Set Up a RabbitMQ Cluster on IPv4 Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ clustering
- RabbitMQ peer discovery and Erlang distribution
- RabbitMQ queue types and quorum queues
- Linux host networking and firewall rules

## Sources Consulted
- RabbitMQ Clustering Guide — https://www.rabbitmq.com/docs/clustering
- RabbitMQ Cluster Formation and Peer Discovery — https://www.rabbitmq.com/docs/4.1/cluster-formation
- RabbitMQ Networking Guide — https://www.rabbitmq.com/docs/networking
- RabbitMQ Configuration Guide — https://www.rabbitmq.com/docs/configure
- RabbitMQ Quorum Queues Guide — https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Reliability Guide — https://www.rabbitmq.com/docs/reliability

## Issues Found

1. **The introduction overstated what clustering replicates.** The original wording implied queues are generally distributed across nodes by clustering itself. Updated it to distinguish cluster-wide metadata from queue contents, which are only replicated when using a replicated queue type such as quorum queues.

2. **The node discovery explanation was imprecise.** RabbitMQ nodes identify each other by node name, and the hostname part of that node name must resolve correctly. Updated the wording to reflect RabbitMQ clustering requirements instead of implying generic IP-based discovery.

3. **The listener configuration example was incorrect for “all nodes.”** The original snippet bound `listeners.tcp.1` to `10.0.0.1` while labeling the file as a shared configuration for every node, which would fail on nodes 2 and 3. Replaced it with `listeners.tcp.default = 5672`, which is valid on every node.

4. **The firewall section mixed cluster ports with client/admin ports.** RabbitMQ clustering requires `4369/tcp` and `25672/tcp` between cluster members; `5672` and `15672` are client/admin-facing ports, not inter-node clustering ports. The section was corrected and annotated accordingly.

5. **The mirrored queue policy section was outdated and incorrect for current RabbitMQ versions.** Classic mirrored queues were deprecated and removed in RabbitMQ 4.x, so `ha-mode` policy examples are no longer valid current guidance. Replaced them with current quorum-queue guidance and a supported quorum-queue policy example.

6. **The conclusion repeated the outdated mirroring guidance.** Updated it to explain that clustering alone does not replicate queue contents and that quorum queues are the current HA mechanism.

## Review Notes
- The manual `join_cluster` sequence shown in the post still works, but current RabbitMQ documentation notes that starting with RabbitMQ 4.1, `rabbitmqctl join_cluster` performs the necessary preparation steps automatically.
- If remote `rabbitmqctl` or `rabbitmq-diagnostics` commands are used from hosts outside the node itself, the Erlang distribution client port range `35672-35682/tcp` also needs to be reachable.
- The post uses short node names such as `rabbit@node1`. If long names or IP-based node names are used instead, additional node-name configuration is required.
