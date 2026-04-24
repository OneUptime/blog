# How to Forward Container Logs to Syslog via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Syslog, Log Forwarding, Docker, Rsyslog, Centralized Logging

Description: Learn how to configure Docker containers managed by Portainer to forward their logs to a syslog server using the Docker syslog log driver.

---

The Docker syslog log driver sends container output directly to a syslog server over UDP, TCP, or TLS. This integrates Docker containers with existing enterprise log infrastructure such as rsyslog, syslog-ng, or Graylog.

## Configuring the Syslog Driver in a Stack

Set the syslog driver in your Portainer stack's logging section:

```yaml
services:
  api:
    image: my-api:latest
    logging:
      driver: syslog
      options:
        syslog-address: "tcp://syslog-server.example.com:514"
        tag: "my-app/api/{{.Name}}"
        syslog-facility: "daemon"
        syslog-format: "rfc5424"

  worker:
    image: my-worker:latest
    logging:
      driver: syslog
      options:
        syslog-address: "tcp://syslog-server.example.com:514"
        tag: "my-app/worker/{{.Name}}"
        syslog-facility: "daemon"
        syslog-format: "rfc5424"
```

## Syslog Driver Options

| Option | Description | Example |
|--------|-------------|---------|
| `syslog-address` | Destination syslog server | `tcp://host:514`, `udp://host:514` |
| `tag` | Tag appended to the syslog `APP-NAME` field | `"myapp/{{.Name}}"` |
| `syslog-facility` | Syslog facility | `daemon`, `local0`–`local7` |
| `syslog-format` | Log format | `local` (default), `rfc3164`, `rfc5424`, `rfc5424micro` |
| `syslog-tls-ca-cert` | CA certificate for TLS | `/path/to/ca.pem` |
| `syslog-tls-cert` | Client certificate for mTLS | `/path/to/cert.pem` |

## Setting as Default Log Driver

Apply the syslog driver to all containers on a Docker host by editing `/etc/docker/daemon.json`:

```json
{
  "log-driver": "syslog",
  "log-opts": {
    "syslog-address": "tcp://syslog-server.example.com:514",
    "syslog-facility": "daemon",
    "tag": "docker/{{.Name}}",
    "syslog-format": "rfc5424"
  }
}
```

Restart Docker: `sudo systemctl restart docker`. All new containers use this driver unless they specify otherwise.

## Deploying an rsyslog Server

Deploy rsyslog as a Portainer stack to receive and store Docker logs:

```yaml
services:
  rsyslog:
    image: rsyslog/rsyslog-collector:latest
    ports:
      - "514:514"
      - "514:514/udp"
    volumes:
      - /opt/rsyslog/rsyslog.conf:/etc/rsyslog.conf:ro
      - rsyslog_logs:/logs

volumes:
  rsyslog_logs:
```

A minimal `rsyslog.conf`:

```conf
# Receive logs over TCP and UDP

module(load="imtcp")
module(load="imudp")

input(type="imtcp" port="514")
input(type="imudp" port="514")

# Write Docker logs to separate files by tag
template(name="DockerLogs" type="string"
  string="/logs/%programname:::secpath-replace%.log")

if $programname startswith "my-app" then {
  action(type="omfile" dynaFile="DockerLogs")
  stop
}

# Default log file
*.* /logs/syslog.log
```

## TLS-Encrypted Syslog

For production, encrypt log transmission with TLS:

```bash
# Generate certificates
openssl req -x509 -nodes -newkey rsa:4096 \
  -keyout syslog.key -out syslog.crt \
  -days 365 -subj "/CN=syslog-server.example.com"
```

Configure the syslog driver with TLS:

```yaml
logging:
  driver: syslog
  options:
    syslog-address: "tcp+tls://syslog-server.example.com:6514"
    syslog-tls-ca-cert: "/etc/docker/certs/syslog.crt"
    syslog-format: "rfc5424"
```

## Fallback Behavior

If the syslog server is unavailable and Docker uses the default blocking delivery mode, log writes can block the application. Use `mode: "non-blocking"` to buffer log messages in memory instead:

```yaml
logging:
  driver: syslog
  options:
    syslog-address: "tcp://syslog-server.example.com:514"
    tag: "my-app/{{.Name}}"
    mode: "non-blocking"
    max-buffer-size: "4m"
    # Note: if the buffer fills up, new log messages are dropped.
```
