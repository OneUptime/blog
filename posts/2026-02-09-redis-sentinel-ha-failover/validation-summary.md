# Validation Summary: How to Configure Redis Sentinel for High Availability Failover on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Open Source
- Redis Sentinel
- Kubernetes StatefulSets, Deployments, Services, ConfigMaps, Secrets, and CronJobs
- kubectl
- ioredis
- redis-py
- Node.js
- Python

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel client specification: https://redis.io/docs/latest/develop/reference/sentinel-clients/
- redis-py Sentinel client documentation: https://redis.readthedocs.io/en/stable/connections.html
- ioredis Sentinel documentation: https://github.com/redis/ioredis
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Docker Redis official image tags: https://hub.docker.com/_/redis

## Issues Found
- The Redis replica ConfigMap used `masterauth ${REDIS_PASSWORD}`, but Kubernetes does not expand environment variables inside mounted ConfigMap files. I changed Redis startup to pass `--requirepass` and `--masterauth` from container environment variables via an init script.
- The setup created a Secret in the `redis` namespace before ensuring that namespace existed. I added a Namespace manifest and a `kubectl create namespace redis --dry-run=client -o yaml | kubectl apply -f -` command before creating the Secret.
- The generated base64 password could contain characters that break the Sentinel `sed` substitution. I changed password generation to `openssl rand -hex 32`.
- The Sentinel configuration used Kubernetes DNS hostnames but did not enable Sentinel hostname resolution in the basic Sentinel snippet. I added `sentinel resolve-hostnames yes` and `sentinel announce-hostnames yes`.
- Redis replicas did not announce stable Kubernetes DNS names, which could make Sentinel return pod IPs and break the failover verification command. I added `--replica-announce-ip` and `--replica-announce-port` based on the StatefulSet pod name and governing Service.
- The Node.js ioredis example set `sentinelPassword` even though the Sentinel instances were not configured with Sentinel authentication. I removed that option and kept the Redis data-node password.
- The failover verification command claimed to check the new master but hard-coded `redis-replica-0`. I changed it to derive the pod name from Sentinel's reported master address.
- The monitoring CronJob referenced an undeclared `redis-monitor` ServiceAccount even though the shown `redis-cli` command does not need Kubernetes API access. I removed the ServiceAccount reference.
- The examples used `redis:7.0-alpine`, while current official Redis Docker tags include newer Redis 7.4 Alpine tags. I updated the examples to `redis:7.4-alpine`.

## Review Notes
YAML snippets were parsed successfully after edits. The JavaScript and Python client snippets were syntax-checked locally. A full Kubernetes deployment test was not run in this workspace.
