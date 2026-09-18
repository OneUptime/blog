# Validation Summary: Fix PgBouncer's Old Primary After Operator Failover: DNS, Pools, and Reconnects

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes commands and PostgreSQL/PgBouncer administration examples.

## Technologies Covered
- CloudNativePG 1.30 and its Pooler resource
- PostgreSQL recovery state and transaction settings
- PgBouncer administration, DNS caching, and connection pooling
- Kubernetes Services, EndpointSlices, DNS, and kubectl

## Sources Consulted
- [CloudNativePG 1.30 service management](https://cloudnative-pg.io/docs/1.30/service_management/)
- [CloudNativePG 1.30 connection pooling](https://cloudnative-pg.io/docs/1.30/connection_pooling/) — resource ownership, immutable cluster reference, local peer authentication, controlled configuration, and pausing.
- [CloudNativePG 1.30 automated failover](https://cloudnative-pg.io/docs/1.30/failover/)
- [CloudNativePG 1.30 labels and annotations](https://cloudnative-pg.io/docs/1.30/labels_annotations/)
- [CloudNativePG 1.30 kubectl plugin](https://cloudnative-pg.io/docs/1.30/kubectl-plugin/)
- [PgBouncer administration commands](https://www.pgbouncer.org/usage.html) — SHOW commands, RECONNECT, WAIT_CLOSE, PAUSE, RESUME, and RELOAD.
- [PgBouncer configuration](https://www.pgbouncer.org/config.html) — DNS cache lifetime, host resolution, and connection release behavior.
- [PostgreSQL system information functions](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL system administration functions](https://www.postgresql.org/docs/current/functions-admin.html)
- [PostgreSQL client connection defaults](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes virtual IPs and Service proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/)

## Issues Found
1. **Sessions surviving demotion:** The introduction suggested that pre-failover sessions could remain attached to the former primary after it becomes read-only. CloudNativePG normally restarts that instance to rejoin as a replica, terminating those sessions. Corrected the explanation to distinguish later connections to a standby from original sessions surviving demotion.
2. **Immutable Pooler cluster reference:** The generic instruction to change the Pooler resource omitted that `spec.cluster` is immutable in 1.30. Added the requirement to create a new Pooler when targeting another cluster.
3. **Admin connection routing:** The warning about successive commands reaching different processes was too broad. Clarified that separate connections through a Service can reach different instances, while commands on one established connection reach the same process.
4. **Backend identification through a ClusterIP:** Comparing `SHOW SERVERS` addresses alone can misidentify the actual PostgreSQL backend because the destination visible to PgBouncer can be the Service IP. Added the need to use the role query and `inet_server_addr()` to identify the backend. This is an inference from Kubernetes destination translation and PostgreSQL server-address semantics.
5. **Session-mode PAUSE drain:** The planned-change procedure omitted that session pooling requires clients to disconnect before PAUSE completes. Added coordination of client-side pool draining to prevent an indefinite wait.

## Review Notes
- Verified the shell command syntax, namespace and output flags, cluster and pooler labels, EndpointSlice selector, SQL function names, and PgBouncer admin commands against official references. No code-block changes were needed.
- The distinction between stable ClusterIP DNS, changing Service endpoints, and existing TCP connections is correct. DNS cache tuning does not by itself recycle an established backend connection.
- Confirmed that DNS or connection-string changes trigger backend retirement on release, while RECONNECT is appropriate when downstream routing changes without a connection-string change. WAIT_CLOSE does not migrate transactions.
- The documented Pooler ownership, local administration access, and declarative pause field match CloudNativePG 1.30. No deprecated API or command was identified in the examples.
- The post's documentation URLs and referenced sections were checked. The author profile is attribution, not technical evidence.
- This was a documentation-based review; no live Kubernetes cluster, PostgreSQL server, or PgBouncer process was used. Commands assume the cnpg plugin, required permissions, and the example resources exist. Failover timing and network behavior require verification in the deployed environment.
