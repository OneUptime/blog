# Validation Summary: How to Deploy Memcached for Database Query Caching on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Memcached
- pymemcache
- PostgreSQL/psycopg2
- Prometheus Memcached exporter
- Python
- YAML

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Service and headless Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Memcached server configuration documentation: https://docs.memcached.org/serverguide/configuring/
- Memcached architecture and protocol documentation: https://docs.memcached.org/
- pymemcache getting started and HashClient documentation: https://pymemcache.readthedocs.io/en/latest/getting_started.html
- pymemcache HashClient API reference: https://pymemcache.readthedocs.io/en/latest/apidoc/pymemcache.client.hash.html
- Prometheus Memcached exporter README: https://github.com/prometheus/memcached_exporter
- Prometheus Memcached exporter metrics documentation: https://github.com/prometheus/memcached_exporter/blob/master/metrics.md

## Issues Found
- The service discovery section said to deploy a headless Service, but the post had already defined the headless Service and the snippet was actually a ConfigMap containing a DNS discovery helper. Changed the sentence to say it uses the headless Service DNS name.
- The Memcached exporter example passed `--memcached.address` three times, implying one exporter instance can directly scrape three Memcached pods through repeated flags. The official exporter documents `--memcached.address` as a single target and supports multi-target scraping through the `/scrape` endpoint. Updated the text to clarify this and changed the example to target one Memcached pod.
- The exporter image was changed from `prom/memcached-exporter:v0.14.0` to the official Quay image path used by the exporter project documentation.

## Review Notes
- The StatefulSet, headless Service, StatefulSet DNS names, CronJob manifest, pymemcache HashClient usage, Memcached command flags, and listed exporter metric names are technically valid.
- The Memcached `-m 512` setting controls item storage memory, not total process memory, so production deployments should leave memory headroom above the configured cache size.
