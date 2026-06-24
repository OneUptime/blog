# How to Stream Portainer Logs to Syslog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Logging, Syslog, Docker, Log Management, SIEM, Monitoring

Description: Learn how to stream Portainer application logs to a syslog server using Docker's log driver for centralized log management and SIEM integration.

---

Streaming Portainer container logs to a syslog server centralizes them with your other infrastructure logs and can feed operational alerting. For Portainer authentication and activity audit logs, use Portainer's `--syslog-*` options instead of Docker's container log driver.

## Using Docker's syslog Log Driver

The simplest approach is using Docker's built-in syslog log driver when running the Portainer container:

```bash
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  --log-driver syslog \
  --log-opt syslog-address=udp://syslog-server.example.com:514 \
  --log-opt syslog-facility=daemon \
  --log-opt tag="portainer" \
  portainer/portainer-ce:latest \
  --log-mode NOCOLOR
```

## Using TCP for Reliable Delivery

UDP syslog can lose messages under load. Use TCP for reliable delivery:

```bash
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  --log-driver syslog \
  --log-opt syslog-address=tcp://syslog-server.example.com:514 \
  --log-opt syslog-format=rfc5424 \
  --log-opt tag="portainer/{{.Name}}" \
  portainer/portainer-ce:latest \
  --log-mode NOCOLOR
```

## JSON Logs to Fluentd

For log aggregation pipelines (ELK, Loki), emit JSON from Portainer and forward it with Docker's Fluentd log driver:

```bash
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  --log-driver fluentd \
  --log-opt fluentd-address=tcp://fluentd.example.com:24224 \
  --log-opt tag="portainer" \
  --log-opt fluentd-async=true \
  portainer/portainer-ce:latest \
  --log-mode JSON
```

## Docker Compose with Logging

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    command:
      - --log-mode
      - JSON
    logging:
      driver: syslog
      options:
        syslog-address: "udp://syslog-server.example.com:514"
        tag: "portainer"
    ports:
      - "8000:8000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

## Sample Syslog Queries

After logs are in your SIEM, useful queries depend on the fields your syslog server extracts, but these tag-based filters are a good starting point:

```text
# All Portainer logs

tag:portainer

# Logs from the TCP example when using tag="portainer/{{.Name}}"
tag:"portainer/portainer"

# Plain-text Portainer logs that mention errors
tag:portainer AND "error"
```
