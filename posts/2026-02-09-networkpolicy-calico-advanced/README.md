# How to implement NetworkPolicy with Calico for advanced rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Calico, NetworkPolicy, Security, Network

Description: Learn how to implement advanced NetworkPolicy rules with Calico including egress filtering, CIDR-based policies, named ports, and global network policies for comprehensive cluster security.

---

Network policies are critical for securing Kubernetes workloads, but the standard NetworkPolicy resource has limitations. Calico extends Kubernetes NetworkPolicy with advanced features that give you fine-grained control over network traffic. In this guide, we'll explore how to implement sophisticated network policies using Calico's enhanced capabilities.

## Understanding Calico NetworkPolicy Extensions

Calico provides two types of network policies. The first is standard Kubernetes NetworkPolicy, which Calico fully supports. The second is Calico NetworkPolicy, which offers additional features like action types beyond allow/deny, ICMP protocol support, and more flexible rule ordering.

Standard Kubernetes NetworkPolicy operates on a whitelist model. Everything is denied by default, and you explicitly allow traffic. Calico extends this with explicit deny rules, rule ordering based on priority, and the ability to log matched traffic.

## Setting Up Advanced Egress Rules

Egress filtering is crucial for preventing data exfiltration and limiting outbound connections. Here's how to create a policy that restricts which external services a pod can access:

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: restrict-egress
  namespace: production
spec:
  selector: app == "web-app"
  types:
  - Egress
  egress:
  # Allow DNS resolution
  - action: Allow
    protocol: UDP
    destination:
      ports:
      - 53
      selector: k8s-app == "kube-dns"
  # Allow HTTPS to specific external IPs
  - action: Allow
    protocol: TCP
    destination:
      ports:
      - 443
      nets:
      - 203.0.113.0/24  # External API server range
      - 198.51.100.50/32  # Specific payment gateway
  # Log and deny everything else
  - action: Log
  - action: Deny
```

This policy demonstrates several advanced features. The selector uses Calico's label matching syntax, which is more flexible than standard Kubernetes selectors. The explicit Log action creates audit trails for blocked traffic. The ordered rules process from top to bottom, with the final Deny rule catching anything not explicitly allowed.

## Implementing CIDR-Based Access Control

When integrating with external systems, you often need to allow traffic to specific IP ranges. Calico makes this straightforward:

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: database-egress
  namespace: backend
spec:
  selector: tier == "database-client"
  types:
  - Egress
  egress:
  # Allow access to internal database subnet
  - action: Allow
    protocol: TCP
    destination:
      ports:
      - 5432
      nets:
      - 10.100.50.0/24
  # Allow access to cloud provider metadata service
  - action: Allow
    protocol: TCP
    destination:
      ports:
      - 80
      nets:
      - 169.254.169.254/32
  # Deny all other egress
  - action: Deny
```

The nets field accepts both IPv4 and IPv6 CIDR notation. This is particularly useful for legacy systems that don't support service discovery or when you need to integrate with services outside your cluster.

## Using Named Ports for Service Abstractions

Named ports let you create policies that reference ports by name rather than number, making your policies more maintainable:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
spec:
  selector:
    app: api
  ports:
  - name: https
    port: 443
    targetPort: 8443
  - name: metrics
    port: 9090
    targetPort: 9090
---
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-api-ingress
  namespace: production
spec:
  selector: app == "api"
  types:
  - Ingress
  ingress:
  # Allow HTTPS from frontend
  - action: Allow
    protocol: TCP
    source:
      selector: tier == "frontend"
    destination:
      ports:
      - https  # Reference by name
  # Allow metrics scraping from monitoring
  - action: Allow
    protocol: TCP
    source:
      namespaceSelector: name == "monitoring"
    destination:
      ports:
      - metrics
```

Named ports decouple your policy from specific port numbers. If you need to change the port your application listens on, you only update the Service definition, not every NetworkPolicy that references it.

## Creating Global Network Policies

Calico's GlobalNetworkPolicy applies across all namespaces, perfect for organization-wide security requirements:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-private-ip-egress
spec:
  order: 100
  selector: apply-egress-filter == "true"
  types:
  - Egress
  egress:
  # Deny RFC 1918 private ranges (except cluster networks)
  - action: Deny
    protocol: TCP
    destination:
      nets:
      - 192.168.0.0/16
      - 172.16.0.0/12
      notNets:
      - 10.0.0.0/8  # Cluster network
  # Allow everything else
  - action: Allow
```

The order field controls rule priority. Lower numbers are processed first. This lets you create a hierarchy of policies where global defaults can be overridden by namespace-specific policies with lower order values.

## Implementing Service Account-Based Policies

You can create policies based on service accounts, which is useful for zero-trust security models:

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: database-access-control
  namespace: backend
spec:
  selector: app == "postgres"
  types:
  - Ingress
  ingress:
  # Only allow specific service accounts to access database
  - action: Allow
    protocol: TCP
    source:
      serviceAccounts:
        names:
        - "api-server"
        - "batch-processor"
    destination:
      ports:
      - 5432
```

Service account-based policies integrate naturally with Kubernetes RBAC. You can grant both API access and network access using the same identity primitive.

## Logging and Monitoring Policy Decisions

Enable logging to track which policies are blocking traffic:

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: logged-deny-policy
  namespace: production
spec:
  selector: security-zone == "dmz"
  types:
  - Ingress
  - Egress
  ingress:
  - action: Log
    source:
      notNets:
      - 10.0.0.0/8
  - action: Deny
    source:
      notNets:
      - 10.0.0.0/8
  egress:
  - action: Allow
```

Logged packets appear in your node's syslog. You can forward these to a centralized logging system for security analysis. Look for patterns like repeated blocked connections, which might indicate misconfigured applications or attempted attacks.

## Testing Network Policies

Before deploying policies to production, test them in a staging environment:

```bash
# Check which policies apply to a specific pod
kubectl get pods -n production -o wide
calicoctl get networkpolicy -n production -o yaml

# Test connectivity from a pod
kubectl exec -n production web-app-pod -- curl -m 5 https://external-api.example.com

# View policy evaluation for specific endpoints
calicoctl get workloadendpoint -n production -o yaml
```

Use `calicoctl` to query Calico-specific resources. The tool provides detailed information about how policies apply to individual pods and which rules match specific traffic flows.

## Combining Multiple Policy Types

You can layer Kubernetes NetworkPolicy with Calico NetworkPolicy. Calico processes both types and combines them:

```yaml
# Standard Kubernetes NetworkPolicy (namespace-scoped)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
# Calico NetworkPolicy with advanced features
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: production
spec:
  order: 10
  selector: all()
  types:
  - Ingress
  ingress:
  - action: Allow
    protocol: TCP
    source:
      namespaceSelector: name == "monitoring"
    destination:
      ports:
      - 9090
      - 9091
```

This layered approach lets you use standard Kubernetes resources for basic policies while leveraging Calico's advanced features where needed. It also improves portability if you need to switch CNI providers in the future.

## Troubleshooting Policy Issues

When traffic isn't flowing as expected, start by checking policy application:

```bash
# List all policies affecting a pod
calicoctl get networkpolicy --namespace=production

# Get detailed policy information
calicoctl get networkpolicy restrict-egress -n production -o yaml

# Check if policies are enforced on a node
calicoctl node status

# View policy counters
calicoctl get felixconfiguration default -o yaml
```

Enable Felix debug logging to see detailed policy evaluation. Set the `FELIX_LOGSEVERITYSCREEN` environment variable to `Debug` in the calico-node DaemonSet. This generates verbose output showing which policies match which packets.

Calico's advanced NetworkPolicy features give you the control needed to implement comprehensive zero-trust networking in Kubernetes. By combining CIDR-based rules, service account policies, and global policies, you can create a defense-in-depth strategy that protects your workloads without sacrificing operational flexibility.
