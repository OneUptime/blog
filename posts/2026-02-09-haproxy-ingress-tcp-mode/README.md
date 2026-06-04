# How to Use HAProxy Ingress Controller with TCP Mode for Non-HTTP Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HAProxy, TCP, Ingresses, Load Balancing

Description: Learn how to configure and implement advanced ingress controller features on Kubernetes for production-grade traffic management, security, and performance optimization.

---

This guide covers advanced ingress controller configuration for Kubernetes environments. Ingress controllers provide powerful traffic management capabilities that enable sophisticated routing, security policies, and deployment strategies without modifying application code.

## Understanding the Architecture

Modern ingress controllers act as the entry point for external traffic into Kubernetes clusters. For HTTP traffic, they provide Layer 7 load balancing, SSL termination, and advanced routing based on hostnames, paths, headers, and other request attributes. For non-HTTP TCP traffic, HAProxy Ingress exposes dedicated ports and maps them to backend services.

The ingress controller watches Kubernetes resources such as Ingress objects, TCP custom resources, or TCP service ConfigMaps and translates them into native configuration for the underlying proxy. This abstraction allows teams to use Kubernetes-native resources while leveraging battle-tested load balancing technologies.

## Basic Configuration

Configure HAProxy Ingress TCP routing with a TCP services ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tcp-configmap
  namespace: haproxy-controller
data:
  5432: production/postgres-service:5432
  6379: production/redis-service:6379
```

Start the HAProxy Kubernetes Ingress Controller with `--configmap-tcp-services=haproxy-controller/tcp-configmap` and expose the listening ports on the controller's Kubernetes Service so external clients can reach them.

## Advanced Features

The ingress controller supports sophisticated traffic management patterns including weighted routing, header-based routing for HTTP traffic, rate limiting, authentication, and custom HAProxy configuration.

Configure these features using annotations or custom resource definitions depending on your ingress controller choice. Each controller provides unique capabilities tailored to specific use cases.

## Security Considerations

Always enable TLS encryption for production traffic. Use cert-manager to automate certificate management. Implement rate limiting and authentication to protect backend services from abuse.

For HTTP applications, configure security headers, enable CORS policies, and implement Web Application Firewall rules to protect against common attacks. Regular security audits ensure configurations remain secure as threats evolve.

## Performance Optimization

Tune connection pooling, keepalive settings, and buffer sizes based on your traffic patterns. For HTTP traffic, enable HTTP/2 and compression to improve client performance. Monitor metrics to identify bottlenecks and optimize resource allocation.

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
