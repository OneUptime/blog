# How to Configure Istio for SMTP Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SMTP, Email, Kubernetes, TCP, Service Mesh

Description: Configure Istio to correctly handle SMTP traffic for email services including port naming for server-first protocols and outbound email routing through the mesh.

---

Running an email service or sending emails from applications in an Istio-enabled cluster requires some specific configuration. SMTP is a server-first protocol, which means the server speaks before the client, and this creates a known issue with Istio's protocol detection. If you have ever seen SMTP connections hang for several seconds before working, or fail entirely after deploying Istio, this post will explain why and how to fix it.

## The Server-First Protocol Problem with SMTP

When a client connects to an SMTP server, the server immediately sends a greeting banner like:

```text
220 mail.example.com ESMTP Postfix
```

The client then responds with `EHLO` or `HELO`. This is the opposite of HTTP, where the client always speaks first.

When Istio's sidecar intercepts this connection, it tries to sniff the protocol by reading the first bytes from the client. But the client is waiting for the server's greeting, and the server has already sent its greeting to the sidecar proxy. The sidecar is holding the greeting while waiting for client data to determine the protocol. This creates a deadlock that only resolves when the protocol detection timeout expires (usually a few seconds), at which point Istio falls back to treating it as TCP.

The result is either a multi-second delay on every SMTP connection or, in some cases, a complete failure.

## Correct Port Naming for SMTP

The fix is straightforward: name your SMTP ports with the `tcp-` prefix so Istio skips protocol sniffing entirely:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mail-server
  namespace: default
spec:
  selector:
    app: mail-server
  ports:
    - name: tcp-smtp
      port: 25
      targetPort: 25
      protocol: TCP
    - name: tcp-submission
      port: 587
      targetPort: 587
      protocol: TCP
    - name: tcp-smtps
      port: 465
      targetPort: 465
      protocol: TCP
```

Port 25 is used for server-to-server mail relay, port 587 is the submission port for authenticated clients, and port 465 is SMTP over implicit TLS. All three need the `tcp-` prefix because SMTP is server-first on all of them.

## Running an SMTP Server Inside the Mesh

If you are running an SMTP server like Postfix or Haraka inside your cluster, here is a complete deployment example:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mail-server
  namespace: mail
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mail-server
  template:
    metadata:
      labels:
        app: mail-server
    spec:
      containers:
        - name: postfix
          image: boky/postfix:latest
          ports:
            - containerPort: 25
            - containerPort: 587
          env:
            - name: ALLOWED_SENDER_DOMAINS
              value: "example.com"
---
apiVersion: v1
kind: Service
metadata:
  name: mail-server
  namespace: mail
spec:
  selector:
    app: mail-server
  ports:
    - name: tcp-smtp
      port: 25
      targetPort: 25
    - name: tcp-submission
      port: 587
      targetPort: 587
```

## Sending Emails from Application Pods

Many applications need to send emails through an SMTP relay. When your application pod has an Istio sidecar, outbound SMTP connections also go through the proxy. The same server-first issue applies for outbound connections.

If your application connects to an internal SMTP server (one that has its port named correctly with `tcp-` prefix), the sidecar on the client side will check the destination service's port name and use the right protocol. This should work without additional configuration.

For external SMTP services, you need a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-smtp
  namespace: default
spec:
  hosts:
    - smtp.gmail.com
  ports:
    - number: 587
      name: tcp-smtp
      protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

The `tcp-smtp` port name in the ServiceEntry tells Istio to treat this as TCP traffic, avoiding the protocol sniffing issue for outbound connections.

## SMTP with STARTTLS

Many SMTP connections start in plain text and upgrade to TLS using the STARTTLS command. This is tricky because the connection starts as plain TCP (with the SMTP protocol), then switches to TLS mid-stream.

Istio handles this correctly when the port is named `tcp-*` because it treats the entire connection as an opaque TCP stream and does not try to interpret the contents. The STARTTLS upgrade happens between your application and the remote server, passing through Envoy as raw bytes.

If you accidentally name the port `tls-smtp`, Istio might expect TLS from the start and reject the initial plain-text SMTP handshake. Stick with `tcp-smtp` for ports that use STARTTLS.

For port 465 (implicit TLS/SMTPS), the connection is TLS from the start. You can name it `tcp-smtps` or `tls-smtps`:

```yaml
ports:
  - name: tls-smtps
    port: 465
    targetPort: 465
```

Using `tls-` tells Istio the traffic is TLS-encrypted, so it will not try to parse it as HTTP.

## Authorization Policies for SMTP

Control which services can send email through your SMTP server:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: smtp-access
  namespace: mail
spec:
  selector:
    matchLabels:
      app: mail-server
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - default
              - notifications
      to:
        - operation:
            ports:
              - "587"
    - from:
        - source:
            principals:
              - cluster.local/ns/mail/sa/mail-relay
      to:
        - operation:
            ports:
              - "25"
```

This allows pods in the `default` and `notifications` namespaces to send mail via the submission port (587) and restricts relay access on port 25 to only the mail-relay service account.

## Connection Pooling for SMTP

SMTP connections are relatively expensive to establish (DNS lookup, TCP handshake, TLS negotiation, authentication). Many applications maintain a pool of SMTP connections. Configure Istio to support this:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: mail-server
  namespace: mail
spec:
  host: mail-server.mail.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 10s
        tcpKeepalive:
          time: 300s
          interval: 60s
          probes: 5
```

The keepalive settings are important because SMTP connections might sit idle between email sends. Without keepalives, intermediate network devices can silently drop idle connections, causing your next email send to fail with a broken pipe error.

## Exposing SMTP Through the Gateway

If your SMTP server needs to receive email from the internet, you need to expose it through the ingress gateway. Since SMTP is TCP, you cannot use the standard HTTP gateway configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: smtp-gateway
  namespace: mail
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 25
        name: tcp-smtp
        protocol: TCP
      hosts:
        - "*"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: smtp-external
  namespace: mail
spec:
  hosts:
    - "*"
  gateways:
    - smtp-gateway
  tcp:
    - match:
        - port: 25
      route:
        - destination:
            host: mail-server.mail.svc.cluster.local
            port:
              number: 25
```

You also need to add port 25 to the ingress gateway Service:

```bash
kubectl patch svc istio-ingressgateway -n istio-system --type='json' \
  -p='[{"op":"add","path":"/spec/ports/-","value":{"name":"tcp-smtp","port":25,"targetPort":25,"protocol":"TCP"}}]'
```

Be aware that many cloud providers block outbound port 25 to prevent spam. You may need to request an exception or use alternative ports.

## Bypassing the Sidecar for SMTP

If you run into persistent issues with SMTP through the sidecar and need a quick workaround, you can exclude SMTP ports from sidecar interception:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeOutboundPorts: "25,587,465"
    spec:
      containers:
        - name: app
          image: my-app:v1
```

This tells the sidecar to not intercept outbound traffic on SMTP ports. The traffic goes directly from your application to the destination, bypassing Envoy entirely. You lose Istio features (mTLS, telemetry, authorization) for SMTP traffic, but it removes any possibility of protocol detection issues.

## Monitoring SMTP Traffic

Since SMTP is treated as TCP by Istio, you get TCP-level metrics:

```promql
# Bytes sent to the mail server
rate(istio_tcp_sent_bytes_total{destination_service="mail-server.mail.svc.cluster.local"}[5m])

# Active connections to the mail server
istio_tcp_connections_opened_total{destination_service="mail-server.mail.svc.cluster.local"}
- istio_tcp_connections_closed_total{destination_service="mail-server.mail.svc.cluster.local"}
```

For SMTP-specific metrics (delivery rates, bounce rates, queue sizes), you need to instrument your mail server directly.

## Summary

SMTP in Istio requires explicit `tcp-` port naming because SMTP is a server-first protocol that breaks Istio's protocol sniffing. Name your ports `tcp-smtp`, `tcp-submission`, or `tcp-smtps`. Use ServiceEntry with `tcp-` port names for external SMTP services. Apply authorization policies to control which services can send email, configure connection keepalives for pooled connections, and if all else fails, use the `excludeOutboundPorts` annotation to bypass the sidecar for SMTP traffic.
