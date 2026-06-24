# How to Configure ArgoCD Server for gRPC-Web

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, gRPC, Networking

Description: Learn how to configure ArgoCD's API server for gRPC-Web to enable browser-based clients and work through load balancers that do not support HTTP/2.

---

ArgoCD uses gRPC as its primary communication protocol between the CLI, the web UI, and the API server. While gRPC offers excellent performance and strong typing through Protocol Buffers, it relies on HTTP/2 - which creates challenges when deploying behind load balancers, CDNs, or reverse proxies that only support HTTP/1.1. This is where gRPC-Web comes in.

gRPC-Web is a protocol that adapts gRPC calls to work over HTTP/1.1, making them compatible with standard web infrastructure. ArgoCD's API server has built-in support for gRPC-Web, and configuring it properly can solve a wide range of connectivity issues.

## Why You Need gRPC-Web with ArgoCD

Several common scenarios require gRPC-Web configuration on the client or proxy path:

- Your load balancer, CDN, or reverse proxy path is configured for HTTP/1.1 to backends
- You are deploying ArgoCD behind infrastructure where native gRPC routing is not enabled
- Corporate proxies strip HTTP/2 upgrade headers
- Browser-based tools need to communicate directly with the ArgoCD API
- You want a single port for both the web UI and API traffic

## Understanding ArgoCD's Dual-Port Architecture

By default, ArgoCD's API server listens on two ports:

- Port 8080: Serves both the web UI (HTTP) and the API (gRPC)
- Port 8083: Serves metrics

The server uses content-type negotiation to determine whether an incoming request is a gRPC call or a regular HTTP request. ArgoCD's API server includes gRPC-Web handling, so clients can use `application/grpc-web` or `application/grpc-web+proto` content types when the proxy path supports them.

```mermaid
graph LR
    A[ArgoCD CLI] -->|gRPC over HTTP/2| C[ArgoCD API Server]
    B[Web UI / Browser] -->|gRPC-Web over HTTP/1.1| C
    D[Load Balancer] -->|HTTP/1.1| C
    C -->|Internal gRPC| E[Repo Server]
    C -->|Internal gRPC| F[Application Controller]
```

## Confirming gRPC-Web Support on the ArgoCD Server

ArgoCD supports gRPC-Web out of the box. There is no `--grpc-web` flag for `argocd-server`; `--grpc-web` is an ArgoCD CLI option. In most deployments, the server-side work is to make sure your ingress or load balancer forwards gRPC-Web requests to the ArgoCD API server.

Here is a typical server deployment shape with TLS enabled by default:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          command:
            - argocd-server
```

If you are using Helm to deploy ArgoCD, you usually do not need a gRPC-Web-specific server value:

```yaml
# values.yaml for ArgoCD Helm chart
server:
  extraArgs: []
```

Apply the Helm upgrade:

```bash
# Upgrade ArgoCD with your server values
helm upgrade argocd argo/argo-cd \
  --namespace argocd \
  -f values.yaml
```

## Configuring gRPC-Web with a Root Path

If you are serving ArgoCD under a subpath (for example, `/argocd`), you need to set the server root path and use the matching gRPC-Web root path from the CLI:

```yaml
# Configure ArgoCD with a custom root path
server:
  extraArgs:
    - --rootpath=/argocd
```

This ensures that both the web UI and gRPC-Web endpoints are correctly routed under the specified path prefix.

## Configuring Ingress for gRPC-Web

When gRPC-Web is enabled, you can use a single ingress resource since all traffic flows over HTTP/1.1. This simplifies your ingress configuration significantly.

Here is an example using NGINX Ingress:

```yaml
# Ingress resource for ArgoCD with gRPC-Web
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # Use HTTPS backend protocol since ArgoCD terminates TLS by default
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    # Increase proxy buffer size for gRPC-Web responses
    nginx.ingress.kubernetes.io/proxy-buffer-size: "16k"
    # Set reasonable timeouts for long-running gRPC-Web streams
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-tls
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

For AWS ALB Ingress, gRPC-Web is particularly useful when you want the target group to use its default HTTP/1.1 protocol version instead of configuring separate HTTP/2 or gRPC target groups:

```yaml
# AWS ALB Ingress for ArgoCD with gRPC-Web
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/abc-123
    # Backend protocol is HTTPS because ArgoCD terminates TLS by default
    alb.ingress.kubernetes.io/backend-protocol: HTTPS
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
spec:
  ingressClassName: alb
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

## Configuring the ArgoCD CLI to Use gRPC-Web

The ArgoCD CLI also supports gRPC-Web. This is useful when your network only allows HTTP/1.1 traffic:

```bash
# Login using gRPC-Web transport
argocd login argocd.example.com --grpc-web

# You can also set this as a permanent option
argocd login argocd.example.com --grpc-web --grpc-web-root-path /argocd
```

To make gRPC-Web the default for all CLI operations, set the `ARGOCD_OPTS` environment variable:

```bash
# Set gRPC-Web as the default transport for all ArgoCD CLI commands
export ARGOCD_OPTS="--grpc-web"

# Now all commands automatically use gRPC-Web
argocd app list
argocd app get my-app
```

## Disabling TLS for gRPC-Web Behind a TLS-Terminating Proxy

If your load balancer handles TLS termination, you should disable TLS on the ArgoCD server to avoid double encryption:

```yaml
# Disable TLS on ArgoCD server when proxy handles termination
server:
  extraArgs:
    - --insecure
```

With this configuration, the traffic flow looks like:

```mermaid
graph LR
    A[Client] -->|HTTPS| B[Load Balancer / Proxy]
    B -->|HTTP with gRPC-Web| C[ArgoCD Server :8080]
```

## Troubleshooting gRPC-Web Issues

If you are having trouble with gRPC-Web, here are common issues and their solutions.

**Connection resets or timeouts**: Increase the proxy timeout values. gRPC-Web streams can be long-lived, especially for watch operations:

```bash
# Test connectivity to the ArgoCD server with gRPC-Web
curl -v -H "Content-Type: application/grpc-web+proto" \
  https://argocd.example.com/api/v1/session
```

**Mixed content errors in the browser**: Ensure your ArgoCD server URL uses HTTPS. The web UI will not make gRPC-Web calls over plain HTTP if the page was loaded over HTTPS.

**404 errors on gRPC-Web endpoints**: Verify that your ingress routes gRPC-Web requests to the ArgoCD server service and that any subpath configuration matches the server `--rootpath` and CLI `--grpc-web-root-path` values. Check the running server arguments:

```bash
# Check the running server arguments
kubectl get deploy argocd-server -n argocd -o jsonpath='{.spec.template.spec.containers[0].command}'
```

**Large response failures**: Some proxies have default body size limits that can interfere with large gRPC-Web responses. Increase buffer sizes in your proxy configuration.

## Performance Considerations

gRPC-Web adds some overhead compared to native gRPC. In `grpcwebtext` mode, payloads are base64-encoded, which adds roughly 33% to the payload size. In binary `grpcweb` mode, protobuf payloads are not base64-encoded, but browser streaming support is more limited. For most ArgoCD operations, this overhead is negligible.

However, streaming works differently with gRPC-Web. Browser gRPC-Web clients support unary calls and, in text mode, server-side streaming, but they do not support client-side or bidirectional streaming in the same way native gRPC over HTTP/2 does. This means watch operations may have slightly higher latency compared to native gRPC connections.

For environments where performance is critical and HTTP/2 is available end-to-end, consider using native gRPC instead of gRPC-Web. But for the vast majority of deployments, gRPC-Web provides the right balance of compatibility and performance.

## Summary

Configuring ArgoCD for gRPC-Web is straightforward and solves real-world networking challenges. ArgoCD's server supports gRPC-Web, so configure your ingress to pass the traffic correctly and configure the CLI with `--grpc-web` when needed. This approach works well with AWS ALB, CDN or proxy paths configured for HTTP/1.1, corporate proxies, and any infrastructure where native gRPC over HTTP/2 is not available end-to-end.

For more on ArgoCD networking topics, check out our guide on [configuring ArgoCD with HTTP/2](https://oneuptime.com/blog/post/2026-02-26-argocd-http2-configuration/view) and [setting up proxy configurations](https://oneuptime.com/blog/post/2026-02-26-argocd-proxy-settings/view).
