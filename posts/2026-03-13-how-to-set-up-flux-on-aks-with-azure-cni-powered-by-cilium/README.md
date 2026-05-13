# How to Set Up Flux on AKS with Azure CNI Powered by Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Azure CNI, Cilium, Networking, eBPF, Network Policy

Description: Learn how to set up Flux CD on an AKS cluster using Azure CNI powered by Cilium for advanced networking, eBPF-based network policies, and observability.

---

## Introduction

Azure CNI powered by Cilium combines the Azure CNI networking model with Cilium's eBPF data plane. This integration provides high-performance networking, advanced network policies with L7 filtering, and observability through Advanced Container Networking Services (ACNS). For GitOps workflows with Flux, Cilium's advanced network policy capabilities offer fine-grained control over traffic between Flux controllers and your workloads.

This guide walks through creating an AKS cluster with Cilium, bootstrapping Flux, and leveraging Cilium's features to secure and observe your GitOps pipeline.

## Prerequisites

- An Azure subscription
- Azure CLI version 2.79 or later
- Flux CLI version 2.0 or later
- kubectl and Hubble CLI installed

## Step 1: Verify Azure CLI

Cilium integration is available through the Azure CLI. Verify that you are signed in and running a current version:

```bash
az login
az version
```

## Step 2: Create an AKS Cluster with Cilium

```bash
az aks create \
  --resource-group my-resource-group \
  --name my-cilium-cluster \
  --location eastus \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --network-dataplane cilium \
  --pod-cidr 192.168.0.0/16 \
  --node-count 3 \
  --kubernetes-version 1.33 \
  --enable-acns \
  --acns-advanced-networkpolicies L7 \
  --enable-managed-identity \
  --generate-ssh-keys
```

Get cluster credentials and verify Cilium is running:

```bash
az aks get-credentials \
  --resource-group my-resource-group \
  --name my-cilium-cluster

kubectl get pods -n kube-system -l k8s-app=cilium
kubectl get pods -n kube-system -l k8s-app=hubble-relay
```

## Step 3: Bootstrap Flux

```bash
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-cilium-cluster \
  --token-auth \
  --personal
```

Verify Flux components:

```bash
flux check
kubectl get pods -n flux-system
```

## Step 4: Deploy Cilium Network Policies Through Flux

Cilium supports both standard Kubernetes NetworkPolicy and its own CiliumNetworkPolicy CRD, which offers L7 filtering and DNS-based rules. Deploy these through Flux:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: flux-system-policy
  namespace: flux-system
spec:
  endpointSelector: {}
  egress:
    - toEndpoints:
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": kube-system
            "k8s:k8s-app": kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: ANY
          rules:
            dns:
              - matchPattern: "*"
    - toFQDNs:
        - matchName: github.com
        - matchName: api.github.com
        - matchPattern: "*.githubusercontent.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
    - toFQDNs:
        - matchPattern: "*.azurecr.io"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
  ingress:
    - fromEndpoints:
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": flux-system
```

This starter policy restricts selected Flux traffic to DNS, GitHub, and ACR. Adjust the FQDN list for your exact Git provider, registry, Helm repository, and notification endpoints before treating it as a least-privilege network configuration.

## Step 5: Deploy Application-Level Network Policies

Define fine-grained policies for your applications:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-server-policy
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: GET
                path: "/api/v1/.*"
              - method: POST
                path: "/api/v1/.*"
  egress:
    - toEndpoints:
        - matchLabels:
            app: database
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
```

## Step 6: Enable Hubble Observability

Hubble provides real-time network flow visibility when ACNS is enabled. For stored flow logs, configure a `ContainerNetworkLog` through Flux:

```yaml
apiVersion: acn.azure.com/v1alpha1
kind: ContainerNetworkLog
metadata:
  name: flux-system-flows
spec:
  includefilters:
    - name: flux-system
      from:
        labelSelector:
          matchLabels:
            k8s.io/namespace: flux-system
      verdict:
        - forwarded
        - dropped
```

To view network flows on demand, port-forward Hubble Relay and configure the Hubble CLI with the client certificates from the cluster:

```bash
kubectl port-forward -n kube-system svc/hubble-relay --address 127.0.0.1 4245:443 &

mkdir -p .certs
kubectl get secret hubble-relay-client-certs -n kube-system -o jsonpath="{.data['tls\.crt']}" | base64 -d > .certs/tls.crt
kubectl get secret hubble-relay-client-certs -n kube-system -o jsonpath="{.data['tls\.key']}" | base64 -d > .certs/tls.key
kubectl get secret hubble-relay-client-certs -n kube-system -o jsonpath="{.data['ca\.crt']}" | base64 -d > .certs/ca.crt
hubble config set tls true
hubble config set tls-client-cert-file .certs/tls.crt
hubble config set tls-client-key-file .certs/tls.key
hubble config set tls-ca-cert-files .certs/ca.crt
hubble config set tls-server-name instance.hubble-relay.cilium.io

hubble observe --namespace flux-system
hubble observe --namespace default
```

## Step 7: Deploy a Hubble UI Through Flux

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hubble-ui
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: hubble-ui
rules:
  - apiGroups:
      - ""
    resources:
      - componentstatuses
      - endpoints
      - namespaces
      - nodes
      - pods
      - services
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - apiextensions.k8s.io
    resources:
      - customresourcedefinitions
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - cilium.io
    resources:
      - "*"
    verbs:
      - get
      - list
      - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: hubble-ui
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: hubble-ui
subjects:
  - kind: ServiceAccount
    name: hubble-ui
    namespace: kube-system
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: hubble-ui-nginx
  namespace: kube-system
data:
  nginx.conf: |
    server {
        listen       8081;
        server_name  localhost;
        root /app;
        index index.html;
        location / {
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, HEAD, DELETE, OPTIONS";
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Max-Age 1728000;
            add_header Access-Control-Expose-Headers content-length,grpc-status,grpc-message;
            add_header Access-Control-Allow-Headers range,keep-alive,user-agent,cache-control,content-type,content-transfer-encoding,x-accept-content-transfer-encoding,x-accept-response-streaming,x-user-agent,x-grpc-web,grpc-timeout;
            if ($request_method = OPTIONS) {
                return 204;
            }
            location /api {
                proxy_http_version 1.1;
                proxy_pass_request_headers on;
                proxy_hide_header Access-Control-Allow-Origin;
                proxy_pass http://127.0.0.1:8090;
            }
            location / {
                try_files $uri $uri/ /index.html /index.html;
            }
            location /healthz {
                access_log off;
                add_header Content-Type text/plain;
                return 200 'ok';
            }
        }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hubble-ui
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: hubble-ui
  template:
    metadata:
      labels:
        k8s-app: hubble-ui
    spec:
      serviceAccountName: hubble-ui
      automountServiceAccountToken: true
      containers:
        - name: frontend
          image: mcr.microsoft.com/oss/cilium/hubble-ui:v0.12.2
          ports:
            - name: http
              containerPort: 8081
          volumeMounts:
            - name: hubble-ui-nginx-conf
              mountPath: /etc/nginx/conf.d/default.conf
              subPath: nginx.conf
            - name: tmp-dir
              mountPath: /tmp
        - name: backend
          image: mcr.microsoft.com/oss/cilium/hubble-ui-backend:v0.12.2
          env:
            - name: EVENTS_SERVER_PORT
              value: "8090"
            - name: FLOWS_API_ADDR
              value: "hubble-relay:443"
            - name: TLS_TO_RELAY_ENABLED
              value: "true"
            - name: TLS_RELAY_SERVER_NAME
              value: ui.hubble-relay.cilium.io
            - name: TLS_RELAY_CA_CERT_FILES
              value: /var/lib/hubble-ui/certs/hubble-relay-ca.crt
            - name: TLS_RELAY_CLIENT_CERT_FILE
              value: /var/lib/hubble-ui/certs/client.crt
            - name: TLS_RELAY_CLIENT_KEY_FILE
              value: /var/lib/hubble-ui/certs/client.key
          ports:
            - name: grpc
              containerPort: 8090
          volumeMounts:
            - name: hubble-ui-client-certs
              mountPath: /var/lib/hubble-ui/certs
              readOnly: true
      nodeSelector:
        kubernetes.io/os: linux
      volumes:
        - configMap:
            name: hubble-ui-nginx
          name: hubble-ui-nginx-conf
        - emptyDir: {}
          name: tmp-dir
        - name: hubble-ui-client-certs
          projected:
            defaultMode: 0400
            sources:
              - secret:
                  name: hubble-relay-client-certs
                  items:
                    - key: tls.crt
                      path: client.crt
                    - key: tls.key
                      path: client.key
                    - key: ca.crt
                      path: hubble-relay-ca.crt
---
apiVersion: v1
kind: Service
metadata:
  name: hubble-ui
  namespace: kube-system
spec:
  type: ClusterIP
  selector:
    k8s-app: hubble-ui
  ports:
    - name: http
      port: 80
      targetPort: 8081
```

## Step 8: Organize with Flux Kustomizations

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cilium-policies
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/cilium-policies
  prune: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: cilium-policies
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
```

## Cilium Features Relevant to Flux Workflows

**DNS-based policies**: Restrict Flux controllers to specific external domains (Git providers, registries) without hardcoding IP addresses.

**L7 HTTP filtering**: Control which HTTP methods and paths are allowed between services, providing application-layer security for your GitOps-deployed workloads.

**Flow observability**: Use ACNS container network logs and on-demand Hubble access to debug connectivity issues between Flux controllers and source repositories, or between your deployed services.

**eBPF performance**: Cilium's eBPF data plane provides better networking performance compared to iptables-based solutions, which benefits clusters with many Flux-managed resources.

## Verifying the Setup

```bash
flux get all -A
kubectl get ciliumnetworkpolicies -A
kubectl get pods -n kube-system -l k8s-app=hubble-relay
hubble observe --namespace flux-system --last 10
```

## Troubleshooting

**Flux controllers cannot reach GitHub**: Check CiliumNetworkPolicy egress rules. Use `hubble observe --namespace flux-system --verdict DROPPED` to identify dropped flows.

**Cilium agent not running**: Verify the cluster was created with `--network-dataplane cilium`. Existing Azure CNI clusters can be updated to Azure CNI powered by Cilium if they meet AKS upgrade requirements, but the update reimages node pools.

**Hubble relay connection refused**: Ensure ACNS is enabled, the Hubble relay pod is running, the port-forward is active, and the Hubble CLI is configured with the cluster's client certificates.

## Conclusion

AKS with Azure CNI powered by Cilium provides advanced networking capabilities that complement Flux's GitOps model. Cilium's DNS-based network policies let you define least-privilege network rules for Flux controllers, while ACNS gives you visibility into network flows in your cluster. By managing Cilium policies through Flux, you maintain a fully declarative, version-controlled approach to both application deployment and network security.
