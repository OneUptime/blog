# Validation Summary: How to Run Zookeeper in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Apache ZooKeeper 3.9
- Docker Official ZooKeeper container image
- ZooKeeper configuration
- ZooKeeper CLI
- ZooKeeper four-letter commands and AdminServer

## Sources Consulted
- Apache ZooKeeper Administrator's Guide: https://zookeeper.apache.org/doc/current/zookeeperAdmin.html
- Apache ZooKeeper Getting Started Guide: https://zookeeper.apache.org/doc/current/zookeeperStarted.html
- Docker Official Image documentation for ZooKeeper: https://github.com/docker-library/docs/blob/master/zookeeper/content.md
- Docker Official Image packaging for ZooKeeper: https://github.com/31z4/zookeeper-docker
- Podman pull documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The pull command used the `3.9` tag while the comment called it the latest image. Changed the comment to identify it as the ZooKeeper 3.9 image.
- The `podman run` examples used the short image name `zookeeper:3.9`. Changed them to the fully qualified `docker.io/library/zookeeper:3.9` reference to avoid Podman's short-name resolution ambiguity.
- The basic container checked `ruok` and `stat`, but ZooKeeper's default four-letter-command whitelist only enables `srvr`. Added `ZOO_4LW_COMMANDS_WHITELIST=ruok,stat,conf,isro,mntr,srvr` to the basic container so the monitoring commands work as shown.
- The custom configuration example reused the same ZooKeeper data and transaction-log volumes as the persistent example. Changed it to use separate `zk-custom-data` and `zk-custom-datalog` volumes to avoid sharing a live ZooKeeper data directory between example containers.
- The ZooKeeper CLI heredoc used `podman exec -it` and included shell-style comments inside the input sent to `zkCli.sh`. Changed it to `podman exec -i` and removed the comment lines from the heredoc so only valid ZooKeeper CLI commands are sent.
- The post described Podman containers as rootless unconditionally. Adjusted the wording to say Podman can run containers rootlessly, since Podman may be run rootless or rootful.

## Review Notes
The examples are appropriate for development and single-node experimentation. For production, ZooKeeper should be deployed as a replicated ensemble with separate data directories and hosts, as described in the Apache ZooKeeper documentation.
