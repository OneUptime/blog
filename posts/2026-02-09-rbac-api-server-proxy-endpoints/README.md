# How to Use RBAC to Control Access to Kubernetes API Server Proxy Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, API Server, Security, Proxy

Description: Learn how to configure RBAC permissions for Kubernetes API server proxy endpoints, controlling access to pod exec, logs, and port-forward operations securely.

---

The Kubernetes API server acts as a proxy for various runtime operations on pods, nodes, and services. Through proxy endpoints, users can execute commands in containers, stream logs, forward ports, and access services directly. These capabilities are essential for debugging and development, but they also create security risks if not properly controlled through RBAC.

A user with unrestricted proxy access can execute arbitrary commands in any container, potentially escalating privileges or accessing sensitive data. They can bypass network policies by port-forwarding directly to restricted services. Proper RBAC configuration ensures users can perform necessary operations without exposing security vulnerabilities.

## Understanding API Server Proxy Subresources

Kubernetes exposes several proxy-related subresources:

**pods/exec**: Execute commands inside running containers. Requires the `create` verb.

**pods/log**: Stream container logs. Requires the `get` verb.

**pods/portforward**: Forward local ports to pod ports. Requires the `create` verb.

**pods/attach**: Attach to running processes. Requires the `create` verb.

**nodes/proxy**: Proxy HTTP requests to kubelet endpoints. Requires `get` and `create` verbs.

**services/proxy**: Proxy HTTP requests directly to services. Requires `get` and `create` verbs.

Each operation requires explicit RBAC permissions. The default `view` role grants log access but not exec or port-forward. The `edit` role grants most proxy operations. The `admin` role grants all of them.

## Creating a Log Reader Role

Start with the most common and least dangerous proxy operation: reading logs.

```yaml
# log-reader-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: log-reader
rules:
# Read pod objects to list available pods
- apiGroups: [""]
  resources:
    - pods
  verbs: ["get", "list"]

# Access pod logs
- apiGroups: [""]
  resources:
    - pods/log
  verbs: ["get"]
```

Apply and bind to developers:

```bash
kubectl apply -f log-reader-role.yaml

kubectl create rolebinding dev-logs \
  --clusterrole=log-reader \
  --group=developers \
  --namespace=development
```

Developers can now read logs in their namespace:

```bash
# View logs
kubectl logs my-pod -n development

# Stream logs
kubectl logs -f my-pod -n development

# View previous container logs
kubectl logs my-pod --previous -n development
```

They cannot exec into pods or forward ports.

## Granting Port-Forward Permissions

Port-forwarding lets users tunnel traffic from their local machine to a pod. This is useful for debugging but can bypass network policies.

```yaml
# port-forward-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: port-forwarder
rules:
# Need to read pod information
- apiGroups: [""]
  resources:
    - pods
  verbs: ["get", "list"]

# Port-forward capability
- apiGroups: [""]
  resources:
    - pods/portforward
  verbs: ["create"]
```

Bind it to specific namespaces where port-forwarding is acceptable:

```bash
kubectl apply -f port-forward-role.yaml

kubectl create rolebinding dev-port-forward \
  --clusterrole=port-forwarder \
  --group=developers \
  --namespace=development
```

Users can now forward ports:

```bash
# Forward local port 8080 to pod port 80
kubectl port-forward my-pod 8080:80 -n development
```

This connection bypasses any NetworkPolicies or service meshes. Consider whether your security model allows this.

## Controlling Exec Permissions

Exec permissions are powerful and should be granted carefully. They allow running arbitrary commands inside containers.

```yaml
# exec-debugger-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: exec-debugger
rules:
# Read pods
- apiGroups: [""]
  resources:
    - pods
  verbs: ["get", "list"]

# Exec into pods
- apiGroups: [""]
  resources:
    - pods/exec
  verbs: ["create"]

# Also include attach for completeness
- apiGroups: [""]
  resources:
    - pods/attach
  verbs: ["create"]
```

Grant exec permissions only to trusted users:

```bash
kubectl apply -f exec-debugger-role.yaml

kubectl create rolebinding sre-exec \
  --clusterrole=exec-debugger \
  --group=sre-team \
  --namespace=production
```

Users can now execute commands:

```bash
# Interactive shell
kubectl exec -it my-pod -n production -- /bin/sh

# Single command
kubectl exec my-pod -n production -- ls /app

# Attach to running process
kubectl attach my-pod -n production
```

Security implications of exec access:

- Users can read environment variables containing secrets
- Users can access mounted volumes including secrets and configmaps
- Users might escalate privileges if the container runs as root
- Users can modify running application state

Only grant exec permissions where necessary for debugging production issues.

## Restricting Service Proxy Access

The services/proxy subresource allows direct HTTP access to services, bypassing Ingress controllers and service meshes:

```yaml
# service-proxy-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: service-proxy
rules:
# Read services
- apiGroups: [""]
  resources:
    - services
  verbs: ["get", "list"]

# Proxy to services
- apiGroups: [""]
  resources:
    - services/proxy
  verbs: ["get", "create"]
```

Access a service directly:

```bash
# Proxy GET request to service
kubectl get --raw /api/v1/namespaces/default/services/my-service/proxy/

# With path
kubectl get --raw /api/v1/namespaces/default/services/my-service:8080/proxy/health
```

Most applications should not need this capability. Reserve it for debugging or specific integration patterns.

## Controlling Node Proxy Access

Node proxy access exposes kubelet endpoints. Restrict it heavily:

```yaml
# node-proxy-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-proxy-reader
rules:
# Read nodes
- apiGroups: [""]
  resources:
    - nodes
  verbs: ["get", "list"]

# Proxy to nodes (read-only)
- apiGroups: [""]
  resources:
    - nodes/proxy
  verbs: ["get"]
```

This allows querying kubelet endpoints:

```bash
# Get kubelet health
kubectl get --raw /api/v1/nodes/worker-1/proxy/healthz

# Get metrics
kubectl get --raw /api/v1/nodes/worker-1/proxy/metrics
```

The `create` verb on nodes/proxy allows POST requests to kubelet, which is rarely needed and should be restricted to cluster administrators.

## Building Debug Roles for Different Environments

Create tiered access based on environment criticality:

```yaml
# development-debug-role.yaml - Full debug access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: development-debug
rules:
- apiGroups: [""]
  resources:
    - pods
    - pods/log
    - pods/exec
    - pods/portforward
    - pods/attach
  verbs: ["get", "list", "create"]
```

```yaml
# production-debug-role.yaml - Limited access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: production-debug
rules:
- apiGroups: [""]
  resources:
    - pods
    - pods/log
  verbs: ["get", "list"]
# No exec or port-forward in production
```

Apply environment-specific bindings:

```bash
# Development: Full debug access
kubectl create rolebinding dev-full-debug \
  --clusterrole=development-debug \
  --group=developers \
  --namespace=development

# Production: Logs only
kubectl create rolebinding prod-logs-only \
  --clusterrole=production-debug \
  --group=developers \
  --namespace=production
```

## Testing Proxy Permissions

Verify permissions work as expected:

```bash
# Test log access
kubectl auth can-i get pods/log --namespace=development --as=developer@company.com
# Should return: yes

# Test exec access
kubectl auth can-i create pods/exec --namespace=production --as=developer@company.com
# Should return: no (based on our production-debug role)

# Test port-forward
kubectl auth can-i create pods/portforward --namespace=development --as=developer@company.com
# Should return: yes or no depending on configuration
```

Attempt actual operations:

```bash
# As developer user
kubectl logs my-pod -n development
# Should work

kubectl exec -it my-pod -n production -- sh
# Should fail with forbidden error
```

## Auditing Proxy Usage

Track who is using proxy endpoints and for what:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all exec operations
- level: Metadata
  resources:
  - group: ""
    resources: ["pods/exec"]
  verbs: ["create"]

# Log port-forward operations
- level: Metadata
  resources:
  - group: ""
    resources: ["pods/portforward"]
  verbs: ["create"]

# Log service proxy access
- level: Metadata
  resources:
  - group: ""
    resources: ["services/proxy"]
  verbs: ["get", "create"]
```

Query audit logs for proxy usage:

```bash
# Find exec operations
jq 'select(.objectRef.subresource=="exec")' /var/log/kubernetes/audit.log

# Find users with most exec operations
jq 'select(.objectRef.subresource=="exec") | .user.username' \
  /var/log/kubernetes/audit.log | sort | uniq -c | sort -rn
```

Set up alerts for suspicious patterns:

```yaml
# Prometheus alert
- alert: ExcessiveExecOperations
  expr: |
    sum(rate(apiserver_audit_event_total{
      subresource="exec"
    }[5m])) by (user) > 10
  annotations:
    summary: "User {{ $labels.user }} is executing commands frequently"
```

## Implementing Break-Glass Access

For emergency production access, implement break-glass procedures with elevated permissions:

```yaml
# break-glass-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: break-glass-debug
rules:
- apiGroups: [""]
  resources:
    - pods
    - pods/log
    - pods/exec
    - pods/portforward
    - services/proxy
  verbs: ["*"]
```

Store the binding manifest but do not apply it:

```bash
# break-glass-binding.yaml
# DO NOT APPLY - Use only in emergencies
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: emergency-debug
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: break-glass-debug
subjects:
- kind: User
  name: oncall-engineer@company.com
  apiGroup: rbac.authorization.k8s.io
```

During an incident, apply temporarily:

```bash
# Grant emergency access
kubectl apply -f break-glass-binding.yaml

# Investigate issue...

# Revoke access immediately after
kubectl delete -f break-glass-binding.yaml
```

Log all break-glass activations for security review.

Controlling API server proxy endpoints through RBAC provides granular control over debugging capabilities. By separating log access from exec access and port-forwarding, you can give development teams the visibility they need while protecting production environments from accidental or malicious disruption. Regular audits ensure proxy permissions remain appropriate as team roles and security requirements evolve.
