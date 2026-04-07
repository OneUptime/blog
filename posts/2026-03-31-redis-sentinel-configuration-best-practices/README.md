# Redis Sentinel Configuration Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Configuration, High Availability, Best Practice

Description: Learn how to configure Redis Sentinel correctly - covering quorum sizing, timeout tuning, notification scripts, and client integration for production high availability.

---

Redis Sentinel provides automatic failover and monitoring for standalone Redis setups. However, a misconfigured Sentinel deployment can fail to detect real outages, trigger false failovers, or leave clients pointing at stale endpoints. This guide covers the key configuration choices.

## Always Deploy an Odd Number of Sentinels

Sentinel uses quorum voting to decide when a master is truly down. Deploy 3 or 5 Sentinels across different hosts:

```text
# 3 Sentinels: quorum = 2 (majority required)
# 5 Sentinels: quorum = 3

# sentinel.conf
sentinel monitor mymaster 10.0.0.1 6379 2
```

Never run fewer than 3 Sentinels, and never co-locate Sentinels with Redis masters - a failed host should not take out both.

## Tune down-after-milliseconds Carefully

This is how long a Sentinel waits before declaring a master subjectively down:

```text
sentinel down-after-milliseconds mymaster 30000
```

30 seconds is a reasonable default for most production systems. Too short (e.g., 5s) causes false positives during network hiccups. Too long (e.g., 120s) delays actual failover unacceptably.

Match this value to your application's tolerance for Redis unavailability.

## Configure failover-timeout

This controls the total time allowed for a failover to complete:

```text
sentinel failover-timeout mymaster 180000
```

180 seconds (3 minutes) is typically sufficient. It also controls how quickly Sentinel will retry a failed failover attempt.

## Set parallel-syncs for Controlled Failover

When a new master is elected, replicas must resync. Control how many resync in parallel:

```text
sentinel parallel-syncs mymaster 1
```

Setting this to 1 means only one replica resyncs at a time, keeping the others available for read traffic during the transition. Increase only if failover speed is more critical than replica availability.

## Use Notification Scripts for Alerting

Sentinel can call scripts on events like failover or instance down:

```text
sentinel notification-script mymaster /etc/redis/notify.sh
sentinel client-reconfig-script mymaster /etc/redis/reconfig.sh
```

```bash
#!/bin/bash
# /etc/redis/notify.sh
EVENT_TYPE=$1
EVENT_DESCRIPTION=$2

curl -X POST https://hooks.example.com/alert \
  -d "{\"event\": \"$EVENT_TYPE\", \"detail\": \"$EVENT_DESCRIPTION\"}"
```

Scripts must complete within 60 seconds and return exit code 0 on success.

## Configure Sentinel with TLS (Redis 6+)

For encrypted Sentinel communications:

```text
# sentinel.conf
tls-port 26380
tls-cert-file /etc/redis/sentinel.crt
tls-key-file /etc/redis/sentinel.key
tls-ca-cert-file /etc/redis/ca.crt
tls-auth-clients yes
tls-replication yes
```

## Connect Clients via Sentinel

Clients should resolve the master address through Sentinel rather than hardcoding it:

```python
from redis.sentinel import Sentinel

sentinel = Sentinel(
    [
        ('sentinel1.example.com', 26379),
        ('sentinel2.example.com', 26379),
        ('sentinel3.example.com', 26379),
    ],
    socket_timeout=0.5
)

master = sentinel.master_for('mymaster', socket_timeout=0.5)
slave = sentinel.slave_for('mymaster', socket_timeout=0.5)
```

Sentinel-aware clients automatically discover the new master after failover.

## Monitor Sentinel Health

Check Sentinel status regularly:

```bash
redis-cli -p 26379 SENTINEL masters
redis-cli -p 26379 SENTINEL slaves mymaster
redis-cli -p 26379 SENTINEL sentinels mymaster
```

Alert if the number of sentinels drops below quorum or if any sentinel reports the master as `s_down` or `o_down`.

## Summary

Redis Sentinel requires careful configuration of quorum size, timeout values, and parallel sync settings. Deploy an odd number of Sentinels on separate hosts, tune down-after-milliseconds to balance false positives against failover speed, and always connect clients through Sentinel rather than hardcoded master addresses. Notification scripts ensure your team is alerted immediately when failover occurs.
