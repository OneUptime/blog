# How to Configure HAProxy Ingress SSL Passthrough for End-to-End Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HAProxy, SSL, Passthrough, Security

Description: Learn how to configure and implement advanced ingress controller features on Kubernetes for production-grade traffic management, security, and performance optimization.

---

This guide covers advanced ingress controller configuration for Kubernetes environments. Ingress controllers provide powerful traffic management capabilities that enable sophisticated routing, security policies, and deployment strategies without modifying application code.

## Understanding the Architecture

Modern ingress controllers act as the entry point for external traffic into Kubernetes clusters. They provide Layer 7 load balancing, SSL termination, and advanced routing based on hostnames, paths, headers, and other request attributes. When SSL passthrough is enabled, HAProxy proxies encrypted traffic in TCP mode, so HTTP-layer annotations and request inspection are not available for that route.

The ingress controller watches Ingress resources and translates them into native configuration for the underlying proxy. This abstraction allows teams to use Kubernetes-native resources while leveraging battle-tested load balancing technologies.

## Basic Configuration

Deploy the HAProxy ingress controller and create a basic SSL passthrough route:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  namespace: production
  annotations:
    haproxy.org/ssl-passthrough: "true"
spec:
  ingressClassName: haproxy
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 443
```

## Advanced Features

The ingress controller supports sophisticated traffic management patterns including weighted routing, header-based routing, rate limiting, authentication, and custom middleware chains for HTTP-mode routes. SSL passthrough routes are handled in TCP mode, so use only features that work without decrypting the request.

Configure these features using annotations or custom resource definitions depending on your ingress controller choice. Each controller provides unique capabilities tailored to specific use cases.

## Security Considerations

Always enable TLS encryption for production traffic. With SSL passthrough, terminate TLS in the backend service and manage that service's certificate lifecycle directly, for example with cert-manager. Implement rate limiting and authentication where your ingress mode and application architecture support them.

For HTTP-mode routes, configure security headers, enable CORS policies, and implement Web Application Firewall rules to protect against common attacks. For SSL passthrough routes, enforce those HTTP-layer controls in the backend service because the ingress controller does not decrypt the traffic. Regular security audits ensure configurations remain secure as threats evolve.

## Performance Optimization

Tune connection pooling, keepalive settings, and buffer sizes based on your traffic patterns. Enable HTTP/2 and compression where TLS is terminated and HTTP traffic is visible. Monitor metrics to identify bottlenecks and optimize resource allocation.

Scale ingress controller replicas horizontally to handle increased load. Use pod affinity rules to distribute replicas across nodes for high availability.

## Monitoring and Troubleshooting

Enable metrics export and integrate with Prometheus for comprehensive monitoring. Track request rates, latency percentiles, error rates, and resource utilization.

Review ingress controller logs when troubleshooting routing issues. Use debug logging temporarily to capture detailed request flow information. Test configuration changes in non-production environments first.

## Production Best Practices

Deploy ingress controllers in dedicated namespaces with appropriate RBAC policies. Use network policies to control traffic flow. Implement health checks and readiness probes to ensure reliable operation.

Document your ingress configuration and maintain version control. Use GitOps practices to track changes and enable rollback when needed. Test disaster recovery procedures regularly.

## Conclusion

Advanced ingress controller features enable sophisticated traffic management on Kubernetes. Proper configuration balances security, performance, and operational complexity while providing the flexibility needed for modern application architectures.

Start with basic configurations and incrementally add advanced features as requirements evolve. Monitor metrics continuously and tune based on observed behavior to achieve optimal results.
