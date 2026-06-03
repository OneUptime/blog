# How to Set Up SPIFFE and SPIRE for Workload Identity in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, SPIFFE

Description: Learn how to implement SPIFFE and SPIRE for cryptographic workload identity in Kubernetes to enable zero-trust security and service-to-service authentication.

---

Traditional Kubernetes authentication relies on bearer service account tokens, and legacy secret-backed tokens can be long-lived and difficult to rotate. SPIFFE (Secure Production Identity Framework For Everyone) and SPIRE (the SPIFFE Runtime Environment) provide short-lived cryptographic identities for workloads, enabling zero-trust security architectures and automatic credential rotation.

This guide demonstrates how to deploy and configure SPIFFE and SPIRE in Kubernetes for workload identity management.

## Understanding SPIFFE and SPIRE

SPIFFE defines a standard for workload identity through SVIDs (SPIFFE Verifiable Identity Documents). SPIRE is the production-ready implementation that:

- Issues short-lived X.509 certificates to workloads
- Automatically rotates credentials
- Provides attestation-based identity verification
- Enables service-to-service authentication

Each workload receives a SPIFFE ID (e.g., `spiffe://trust-domain/ns/default/sa/myapp`) and corresponding certificates for mTLS.

## Prerequisites

Ensure you have:

- Kubernetes cluster (1.24+)
- kubectl with cluster admin access
- Helm 3.x installed if you use Helm charts instead of raw manifests
- Understanding of mTLS concepts

## Installing SPIRE Server

Deploy the SPIRE server as a StatefulSet:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: spire
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: spire-server
  namespace: spire
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: spire-bundle
  namespace: spire
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: spire-server-configmap-role
  namespace: spire
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: spire-server-configmap-role-binding
  namespace: spire
subjects:
- kind: ServiceAccount
  name: spire-server
  namespace: spire
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: spire-server-configmap-role
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: spire-server-cluster-role
rules:
- apiGroups: [""]
  resources: ["pods", "nodes"]
  verbs: ["get"]
- apiGroups: ["authentication.k8s.io"]
  resources: ["tokenreviews"]
  verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: spire-server-cluster-role-binding
subjects:
- kind: ServiceAccount
  name: spire-server
  namespace: spire
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: spire-server-cluster-role
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: spire-server
  namespace: spire
data:
  server.conf: |
    server {
      bind_address = "0.0.0.0"
      bind_port = "8081"
      trust_domain = "example.org"
      data_dir = "/run/spire/data"
      log_level = "INFO"
      ca_ttl = "24h"
      default_svid_ttl = "1h"
    }

    plugins {
      DataStore "sql" {
        plugin_data {
          database_type = "sqlite3"
          connection_string = "/run/spire/data/datastore.sqlite3"
        }
      }

      NodeAttestor "k8s_psat" {
        plugin_data {
          clusters = {
            "demo-cluster" = {
              service_account_allow_list = ["spire:spire-agent"]
            }
          }
        }
      }

      KeyManager "disk" {
        plugin_data {
          keys_path = "/run/spire/data/keys.json"
        }
      }

      Notifier "k8sbundle" {
        plugin_data {
          namespace = "spire"
        }
      }
    }

    health_checks {
      listener_enabled = true
      bind_address = "0.0.0.0"
      bind_port = "8080"
      live_path = "/live"
      ready_path = "/ready"
    }

    telemetry {
      Prometheus {
        port = 9988
      }
    }
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: spire-server
  namespace: spire
spec:
  serviceName: spire-server
  replicas: 1
  selector:
    matchLabels:
      app: spire-server
  template:
    metadata:
      labels:
        app: spire-server
    spec:
      serviceAccountName: spire-server
      containers:
      - name: spire-server
        image: ghcr.io/spiffe/spire-server:1.8.0
        args:
        - -config
        - /run/spire/config/server.conf
        ports:
        - containerPort: 8081
          name: grpc
        - containerPort: 8080
          name: health
        - containerPort: 9988
          name: metrics
        volumeMounts:
        - name: spire-config
          mountPath: /run/spire/config
          readOnly: true
        - name: spire-data
          mountPath: /run/spire/data
        livenessProbe:
          httpGet:
            path: /live
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: spire-config
        configMap:
          name: spire-server
  volumeClaimTemplates:
  - metadata:
      name: spire-data
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: spire-server
  namespace: spire
spec:
  type: ClusterIP
  ports:
  - port: 8081
    targetPort: 8081
    protocol: TCP
    name: grpc
  selector:
    app: spire-server
```

Wait for the server to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=spire-server -n spire --timeout=120s
```

## Installing SPIRE Agent

Deploy SPIRE agents as a DaemonSet:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: spire-agent
  namespace: spire
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: spire-agent-cluster-role
rules:
- apiGroups: [""]
  resources: ["pods", "nodes", "nodes/proxy"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: spire-agent-cluster-role-binding
subjects:
- kind: ServiceAccount
  name: spire-agent
  namespace: spire
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: spire-agent-cluster-role
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: spire-agent
  namespace: spire
data:
  agent.conf: |
    agent {
      data_dir = "/run/spire"
      log_level = "INFO"
      server_address = "spire-server"
      server_port = "8081"
      socket_path = "/run/spire/sockets/agent.sock"
      trust_bundle_path = "/run/spire/bundle/bundle.crt"
      trust_domain = "example.org"
    }

    plugins {
      NodeAttestor "k8s_psat" {
        plugin_data {
          cluster = "demo-cluster"
        }
      }

      KeyManager "memory" {
        plugin_data {}
      }

      WorkloadAttestor "k8s" {
        plugin_data {
          skip_kubelet_verification = true
          node_name_env = "MY_NODE_NAME"
        }
      }
    }

    health_checks {
      listener_enabled = true
      bind_address = "0.0.0.0"
      bind_port = "8080"
      live_path = "/live"
      ready_path = "/ready"
    }
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: spire-agent
  namespace: spire
spec:
  selector:
    matchLabels:
      app: spire-agent
  template:
    metadata:
      labels:
        app: spire-agent
    spec:
      hostPID: true
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      serviceAccountName: spire-agent
      initContainers:
      - name: init
        image: ghcr.io/spiffe/spire-agent:1.8.0
        command:
        - /bin/sh
        - -c
        - echo "Waiting for SPIRE server..." && sleep 5
      containers:
      - name: spire-agent
        image: ghcr.io/spiffe/spire-agent:1.8.0
        args:
        - -config
        - /run/spire/config/agent.conf
        env:
        - name: MY_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        ports:
        - containerPort: 8080
          name: health
        volumeMounts:
        - name: spire-config
          mountPath: /run/spire/config
          readOnly: true
        - name: spire-bundle
          mountPath: /run/spire/bundle
        - name: spire-agent-socket
          mountPath: /run/spire/sockets
        - name: spire-token
          mountPath: /var/run/secrets/tokens
        securityContext:
          privileged: true
        livenessProbe:
          httpGet:
            path: /live
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 60
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: spire-config
        configMap:
          name: spire-agent
      - name: spire-bundle
        configMap:
          name: spire-bundle
      - name: spire-agent-socket
        hostPath:
          path: /run/spire/sockets
          type: DirectoryOrCreate
      - name: spire-token
        projected:
          sources:
          - serviceAccountToken:
              path: spire-agent
              expirationSeconds: 7200
              audience: spire-server
```

## Creating Registration Entries

Register workloads to receive SPIFFE IDs:

```bash
# Exec into SPIRE server pod

SERVER_POD=$(kubectl get pod -n spire -l app=spire-server -o jsonpath='{.items[0].metadata.name}')

# Create node registration entry for SPIRE agents
kubectl exec -n spire $SERVER_POD -- \
  /opt/spire/bin/spire-server entry create \
  -spiffeID spiffe://example.org/ns/spire/sa/spire-agent \
  -selector k8s_psat:cluster:demo-cluster \
  -selector k8s_psat:agent_ns:spire \
  -selector k8s_psat:agent_sa:spire-agent \
  -node

# Create registration entry for a workload
kubectl exec -n spire $SERVER_POD -- \
  /opt/spire/bin/spire-server entry create \
  -spiffeID spiffe://example.org/ns/default/sa/myapp \
  -parentID spiffe://example.org/ns/spire/sa/spire-agent \
  -selector k8s:ns:default \
  -selector k8s:sa:myapp

# List all entries
kubectl exec -n spire $SERVER_POD -- \
  /opt/spire/bin/spire-server entry show
```

## Using SPIFFE IDs in Applications

Deploy an application that uses SPIFFE identities:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: default
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: myapp
      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        - name: spire-agent-socket
          mountPath: /run/spire/sockets
          readOnly: true
        env:
        - name: SPIFFE_ENDPOINT_SOCKET
          value: unix:///run/spire/sockets/agent.sock
      volumes:
      - name: spire-agent-socket
        hostPath:
          path: /run/spire/sockets
          type: Directory
```

## Implementing mTLS with SPIFFE

Use SPIFFE workload API to establish mTLS between services:

```go
package main

import (
    "context"
    "log"
    "net/http"

    "github.com/spiffe/go-spiffe/v2/spiffetls/tlsconfig"
    "github.com/spiffe/go-spiffe/v2/workloadapi"
)

func main() {
    ctx := context.Background()

    // Create X.509 source from SPIRE
    source, err := workloadapi.NewX509Source(ctx)
    if err != nil {
        log.Fatalf("Unable to create X.509 source: %v", err)
    }
    defer source.Close()

    // Configure server with SPIFFE mTLS
    tlsConfig := tlsconfig.MTLSServerConfig(source, source, tlsconfig.AuthorizeAny())
    server := &http.Server{
        Addr:      ":8443",
        TLSConfig: tlsConfig,
    }

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello from SPIFFE-secured service"))
    })

    log.Fatal(server.ListenAndServeTLS("", ""))
}
```

## Integrating with Service Mesh

Configure Istio with the same trust domain, then follow Istio's SPIRE SDS integration steps so Envoy fetches workload identities from SPIRE:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio
  namespace: istio-system
spec:
  meshConfig:
    trustDomain: example.org
```

## Monitoring SPIRE

Monitor SPIRE server and agent health:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: spire-server-metrics
  namespace: spire
  labels:
    app: spire-server
spec:
  selector:
    app: spire-server
  ports:
  - port: 9988
    name: metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: spire-server
  namespace: spire
spec:
  selector:
    matchLabels:
      app: spire-server
  endpoints:
  - port: metrics
    interval: 30s
```

## Troubleshooting

Common issues and solutions:

```bash
# Check SPIRE server logs
kubectl logs -n spire -l app=spire-server

# Check agent connectivity
kubectl logs -n spire -l app=spire-agent

# Verify workload can access socket
kubectl exec -it <pod-name> -- ls -l /run/spire/sockets/

# Test SPIFFE ID retrieval
kubectl exec -it <pod-name> -- \
  /opt/spire/bin/spire-agent api fetch -socketPath /run/spire/sockets/agent.sock
```

## Conclusion

SPIFFE and SPIRE provide production-ready workload identity for Kubernetes, enabling zero-trust security through short-lived cryptographic credentials. By implementing SPIRE for identity management, you eliminate the security risks of long-lived service account tokens and enable automatic credential rotation.

Deploy SPIRE server and agents, register workloads with appropriate SPIFFE IDs, and integrate with applications using the workload API. Monitor SPIRE infrastructure health with OneUptime to ensure continuous availability of identity services across your cluster.
