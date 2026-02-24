# How to Configure Istio for LDAP Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, LDAP, Kubernetes, TCP, Authentication, Service Mesh

Description: Configure Istio to handle LDAP and LDAPS traffic for directory services including proper port naming, connection management, and access control policies.

---

LDAP (Lightweight Directory Access Protocol) is used heavily in enterprise environments for authentication, user lookups, and directory services. If you are running an LDAP server inside your Kubernetes cluster or connecting to an external LDAP service from meshed pods, there are some Istio configuration details you need to get right. LDAP is a binary protocol that runs over TCP, and like several other protocols, it has specific characteristics that require attention when running through a service mesh.

## LDAP Protocol Basics for Istio

LDAP runs on port 389 (plain text or STARTTLS) and port 636 (LDAPS, implicit TLS). The protocol is a binary format based on ASN.1 BER encoding, which means Istio cannot inspect or understand the content of LDAP messages. From Istio's perspective, LDAP is opaque TCP traffic.

One important detail: LDAP is a client-first protocol. The client sends a bind request before the server responds. This means protocol sniffing would not cause the server-first deadlock issue that SMTP or MySQL have. However, the initial LDAP bytes do not look like HTTP, so protocol sniffing would correctly identify it as non-HTTP and fall back to TCP treatment. Despite this, you should still use explicit port naming to avoid the sniffing delay.

## Port Naming for LDAP Services

Name your LDAP ports with the `tcp-` prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: openldap
  namespace: directory
spec:
  selector:
    app: openldap
  ports:
    - name: tcp-ldap
      port: 389
      targetPort: 389
      protocol: TCP
    - name: tcp-ldaps
      port: 636
      targetPort: 636
      protocol: TCP
```

The `tcp-` prefix tells Istio to use the TCP filter chain immediately without attempting protocol sniffing.

## Running OpenLDAP in the Mesh

Here is a deployment example for OpenLDAP inside an Istio-enabled cluster:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openldap
  namespace: directory
spec:
  replicas: 1
  selector:
    matchLabels:
      app: openldap
  template:
    metadata:
      labels:
        app: openldap
    spec:
      containers:
        - name: openldap
          image: osixia/openldap:1.5.0
          ports:
            - containerPort: 389
            - containerPort: 636
          env:
            - name: LDAP_ORGANISATION
              value: "My Company"
            - name: LDAP_DOMAIN
              value: "example.com"
            - name: LDAP_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: ldap-credentials
                  key: admin-password
          volumeMounts:
            - name: ldap-data
              mountPath: /var/lib/ldap
            - name: ldap-config
              mountPath: /etc/ldap/slapd.d
      volumes:
        - name: ldap-data
          persistentVolumeClaim:
            claimName: ldap-data-pvc
        - name: ldap-config
          persistentVolumeClaim:
            claimName: ldap-config-pvc
```

## Connecting to External LDAP from the Mesh

If your applications connect to an external LDAP server (like Active Directory), you need a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-ldap
  namespace: default
spec:
  hosts:
    - ldap.corp.example.com
  ports:
    - number: 389
      name: tcp-ldap
      protocol: TCP
    - number: 636
      name: tcp-ldaps
      protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

This tells Istio about the external LDAP server and ensures that outbound LDAP connections from meshed pods are handled correctly as TCP traffic.

## LDAP with STARTTLS

Many LDAP deployments use STARTTLS on port 389 to upgrade a plain-text connection to TLS mid-stream. This works fine through Istio when the port is named `tcp-ldap` because Istio treats the entire connection as an opaque TCP stream. The STARTTLS negotiation happens between your application and the LDAP server, and Envoy just passes the bytes through.

Do not name the port `tls-ldap` for a STARTTLS connection. The `tls-` prefix would tell Istio to expect TLS from the very beginning of the connection, which would conflict with the initial plain-text LDAP handshake that happens before STARTTLS.

For LDAPS (port 636), where TLS is established from the start, you can use either `tcp-ldaps` or `tls-ldaps`:

```yaml
ports:
  - name: tls-ldaps
    port: 636
    targetPort: 636
    protocol: TCP
```

## Connection Pool Configuration

LDAP connections are often long-lived. Applications typically maintain a connection pool to the LDAP server and reuse connections for multiple queries. Configure Istio to support this pattern:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: openldap
  namespace: directory
spec:
  host: openldap.directory.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 10s
        tcpKeepalive:
          time: 600s
          interval: 75s
          probes: 9
```

The `maxConnections` value should be high enough to accommodate all your application connection pools. If you have 10 application pods each maintaining a pool of 10 LDAP connections, you need at least 100 max connections.

TCP keepalives are critical for LDAP. Many LDAP servers have their own idle timeout (OpenLDAP defaults to `idletimeout 0`, which means no timeout, but Active Directory closes idle connections after about 15 minutes). The keepalive probes prevent intermediate network devices from dropping idle connections before the LDAP server's own timeout kicks in.

## Authorization Policies

LDAP servers contain sensitive directory information, so restricting access is important:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ldap-access
  namespace: directory
spec:
  selector:
    matchLabels:
      app: openldap
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/auth-service
              - cluster.local/ns/default/sa/user-service
              - cluster.local/ns/hr/sa/hr-app
      to:
        - operation:
            ports:
              - "389"
              - "636"
```

This policy allows only specific service accounts to connect to the LDAP server. All other services in the mesh are denied access. Since LDAP is treated as TCP, you can only match on source identity, namespace, and destination port. You cannot match on LDAP-specific attributes like the base DN or search filter.

## Handling LDAP Failover

If you have multiple LDAP servers for high availability, you can set up failover using Istio's outlier detection:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: openldap-ha
  namespace: directory
spec:
  host: openldap.directory.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 5s
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
```

When a backend LDAP server fails to accept connections three times in a row, it gets ejected from the load balancing pool for 60 seconds. This gives the server time to recover before Istio tries sending traffic to it again.

## LDAP Traffic and mTLS

Within the mesh, Istio's automatic mTLS encrypts traffic between sidecars. This means LDAP traffic between meshed pods is encrypted by mTLS even on port 389 (the plain-text port). The encryption happens at the sidecar level, not the LDAP protocol level.

If you have LDAP servers without sidecars (maybe running outside the cluster), you should use LDAPS (port 636) or STARTTLS to encrypt the traffic, since mTLS is not available without the sidecar.

Check the mTLS status:

```bash
istioctl authn tls-check deploy/auth-service -n default
```

Look for your LDAP service in the output to confirm mTLS is active.

## Monitoring LDAP Traffic

Istio provides TCP-level metrics for LDAP traffic:

```promql
# Connection rate to LDAP
rate(istio_tcp_connections_opened_total{destination_service="openldap.directory.svc.cluster.local"}[5m])

# Bytes transferred
rate(istio_tcp_sent_bytes_total{destination_service="openldap.directory.svc.cluster.local"}[5m])

# Failed connections
rate(istio_tcp_connections_closed_total{destination_service="openldap.directory.svc.cluster.local",response_flags!=""}[5m])
```

For LDAP-specific metrics (bind latency, search response times, result codes), you need to monitor at the LDAP server level or instrument your application.

## Troubleshooting LDAP Through Istio

If LDAP is not working through the mesh, check these things:

1. Verify port naming is correct:

```bash
kubectl get svc openldap -n directory -o jsonpath='{.spec.ports[*].name}'
```

2. Check the sidecar is not blocking the connection:

```bash
kubectl exec -it deploy/auth-service -c istio-proxy -- \
  pilot-agent request GET stats | grep -i ldap
```

3. Verify the LDAP server is reachable from the sidecar:

```bash
kubectl exec -it deploy/auth-service -c istio-proxy -- \
  curl -v telnet://openldap.directory:389
```

4. Check for connection timeout issues:

```bash
kubectl logs deploy/auth-service -c istio-proxy | grep "389"
```

5. If all else fails, temporarily bypass the sidecar for LDAP traffic:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "389,636"
```

This is a last resort. It removes LDAP traffic from the mesh entirely, but it can help you confirm whether the issue is with Istio or with the LDAP configuration itself.

## Summary

LDAP traffic in Istio is handled as opaque TCP. Name your ports with `tcp-ldap` and `tcp-ldaps` prefixes. Configure generous connection limits and TCP keepalives to support connection pooling patterns. Use authorization policies to restrict LDAP access to only the services that need it. For STARTTLS connections, always use the `tcp-` prefix, not `tls-`. Istio's mTLS automatically encrypts LDAP traffic between meshed services, but for connections to non-meshed LDAP servers, rely on LDAPS or STARTTLS for encryption.
