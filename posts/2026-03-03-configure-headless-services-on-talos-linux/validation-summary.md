# Validation Summary: How to Configure Headless Services on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Services (headless / ClusterIP)
- Kubernetes StatefulSets
- CoreDNS (kubernetes plugin)
- PostgreSQL (StatefulSet example)
- Redis Cluster (StatefulSet example)
- DNS (A and SRV records)
- kubectl / Endpoints API
- Java DNS caching (`networkaddress.cache.ttl`)

## Sources Consulted
- Kubernetes Services documentation — headless services: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes StatefulSet documentation — stable network IDs: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- Redis Cluster tutorial / redis-cli `--cluster create` reference: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Oracle Java networking properties (`networkaddress.cache.ttl`): https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/net/doc-files/net-properties.html
- Talos Linux Kubernetes networking docs: https://www.talos.dev/

## Issues Found
- **CoreDNS default TTL was incorrect.** The post claimed "the default TTL for Kubernetes records is 30 seconds." According to the official CoreDNS kubernetes plugin documentation, the default TTL is 5 seconds. The accompanying example set `ttl 5` with a comment about "reducing" the TTL, which made no sense at the actual default. Fixed by updating the stated default to 5 seconds, changing the inline comment to describe the option as an explicit override (with a note that `ttl 0` disables caching), and reframing the surrounding paragraph so the advice is consistent (the default of 5 is already reasonable; drop to 0 for very aggressive churn).

## Review Notes
- The headless-service-without-selectors example uses the legacy `v1 Endpoints` API. This is still fully supported and remains the most common way to define manual endpoints for a headless service, but `discovery.k8s.io/v1 EndpointSlice` is the modern preferred API. Not a correctness issue — left as is.
- The claim that "Java caches DNS indefinitely by default" is an oversimplification. With a security manager installed, the default is indeed cache-forever; without one, modern JDKs default to ~30 seconds (`networkaddress.cache.ttl`). The practical recommendation (set an explicit short TTL via `java.security.Security.setProperty`) and the example code are correct, so this was left unchanged.
- The `kubectl run ... --rm -it --restart=Never --image=busybox` invocations are valid in current kubectl; `kubectl run` only creates pods now and `--restart=Never` is the right setting.
- The Redis cluster example correctly uses port 6379 (client) and 16379 (cluster bus/gossip), and the `redis-cli --cluster create ... --cluster-replicas 1 --cluster-yes` syntax is correct.
- SRV record format shown (`priority weight port target`) matches what nslookup/dig produce for Kubernetes named-port services. Weight value `33` is plausible (Kubernetes distributes weights across SRV records).
