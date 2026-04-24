# Validation Summary: How to Use Portainer in Telecommunications Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Edge Agent and Edge Stacks
- Docker Engine, Docker Compose file format, and Docker Swarm
- Linux kernel networking sysctls
- Kamailio, RTPengine, and Asterisk
- PowerDNS Authoritative Server and PowerDNS Recursor
- MySQL
- pmacct
- Apache Kafka and ZooKeeper
- InfluxDB
- PagerDuty Events API v2

## Sources Consulted
- Docker `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker host networking documentation: https://docs.docker.com/engine/network/tutorials/host/
- Docker stack deployment documentation: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Swarm services and placement documentation: https://docs.docker.com/engine/swarm/services/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Portainer Edge Agent documentation: https://docs.portainer.io/advanced/edge-agent
- Portainer Docker Swarm Edge installation guide: https://docs.portainer.io/admin/environments/add/swarm/edge
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- PowerDNS Docker image README: https://github.com/PowerDNS/pdns/blob/master/Docker-README.md
- PowerDNS Recursor getting started guide: https://docs.powerdns.com/recursor/getting-started.html
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Kafka listeners documentation: https://docs.confluent.io/platform/current/kafka/listeners.html
- PagerDuty Dynamic Notifications and Events API v2 severity requirements: https://support.pagerduty.com/main/docs/dynamic-notifications
- PagerDuty rules/events guidance showing `routing_key` usage for Events API v2: https://support.pagerduty.com/main/docs/rulesets

## Issues Found
- The post set `net.ipv4.tcp_low_latency=1`, but current Linux kernel documentation marks `tcp_low_latency` as a legacy setting with no effect. I removed it.
- The Docker daemon configuration snippet wrote `/etc/docker/daemon.json` but did not restart Docker afterward, so the new daemon settings would not apply. I added `systemctl restart docker`.
- The VoIP stack used `network_mode: host` for Kamailio and RTPengine while also relying on Docker service discovery (`db`, `rtpengine`). That combination breaks container-to-container DNS/service networking. I removed host networking, published the required SIP/RTP/control ports explicitly, and changed RTPengine to listen on `0.0.0.0` instead of `127.0.0.1`.
- The VoIP stack exposed port `5060` on both Kamailio and Asterisk, which would cause a host port collision. I moved the Asterisk SIP exposure to host port `5160`.
- The DNS section was titled "with Anycast", but the snippet did not configure anycast or BGP-based announcement. I renamed the section to avoid making an incorrect networking claim.
- The PowerDNS authoritative example used `PDNS_*` environment variables for backend configuration, but the official PowerDNS Docker image documentation only documents API-key env handling plus config overrides via command-line flags or mounted config. I replaced the unsupported env-based backend config with supported command-line arguments.
- The PowerDNS Recursor example mounted `recursor.conf` to `/etc/pdns-recursor/recursor.conf`, which does not match the documented official image config location. I corrected the mount to `/etc/powerdns/recursor.conf`.
- The Kafka example omitted listener configuration details and the single-broker offsets topic replication setting needed in Docker examples from Confluent’s documentation. I added `KAFKA_LISTENERS` and `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1`.
- The monitoring stack referenced `http://influxdb:8086` but did not define an `influxdb` service. I added an InfluxDB service and persistent volume.
- The Portainer Edge deployment example used `docker run` with `EDGE_SERVER_HOST` as though it were the Portainer server URL. In the Portainer agent docs, `EDGE_SERVER_HOST` refers to the local Edge UI bind address, not the Portainer server address, and the documented Swarm Edge workflow uses a Portainer-generated stack deployment. I replaced the example with the documented Swarm Edge deployment approach.
- The SLA monitor queried a single endpoint, used non-stack-prefixed service names, and depended on a service-inspect path that would not match deployed stack service names. I updated it to iterate over PoP endpoint IDs, use stack-prefixed Swarm service names, and query the service list with `status=true`.

## Review Notes
- The post is now technically consistent as a Portainer-managed Docker Swarm/Edge deployment. The `deploy` sections and monitoring example both depend on Swarm semantics.
- Confluent Platform 7.4 still supports ZooKeeper, so the example is valid for that version, but new Kafka deployments often prefer KRaft. That is a future-improvement note, not a correctness issue for this post.
- The `telecom/*` images appear to be vendor-specific or private images. I validated the surrounding Docker, Portainer, and networking mechanics, but those image internals were not independently verifiable from public official documentation.
- If this post is later updated to PowerDNS Recursor 5.x, the recursor configuration format/version behavior should be reviewed again because YAML-based configuration is increasingly emphasized in newer Recursor releases.
