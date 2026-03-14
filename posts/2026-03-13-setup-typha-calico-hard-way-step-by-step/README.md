# How to Set Up Typha in a Calico Hard Way Installation Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Installation, Hard Way

Description: A step-by-step guide to deploying Typha in a manually installed Calico cluster without the Tigera Operator.

---

## Introduction

Setting up Typha in a hard way Calico installation involves deploying the Typha binary as a Kubernetes Deployment, creating the necessary RBAC resources, configuring TLS for Felix-to-Typha authentication, and pointing Felix at the Typha service. Unlike operator-based installations where Typha is deployed automatically, the hard way requires each of these steps to be performed manually.

## Prerequisites

- Calico installed manually (binaries, not operator)
- Felix running on all nodes
- `kubectl` access to the cluster
- `openssl` for TLS certificate generation

## Step 1: Create Typha RBAC Resources

Typha needs cluster-wide read access to Calico and Kubernetes resources.

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: calico-typha
  namespace: calico-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-typha
rules:
- apiGroups: [""]
  resources: [pods, namespaces, serviceaccounts, endpoints, services, nodes]
  verbs: [watch, list, get]
- apiGroups: [networking.k8s.io]
  resources: [networkpolicies]
  verbs: [watch, list, get]
- apiGroups: [crd.projectcalico.org]
  resources: ["*"]
  verbs: [watch, list, get]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: calico-typha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: calico-typha
subjects:
- kind: ServiceAccount
  name: calico-typha
  namespace: calico-system
EOF
```

## Step 2: Generate TLS Certificates

Typha uses mTLS to authenticate Felix connections.

```bash
# Generate CA
openssl req -x509 -newkey rsa:4096 -keyout typha-ca.key -out typha-ca.crt \
  -days 365 -nodes -subj "/CN=typha-ca"

# Generate Typha server certificate
openssl req -newkey rsa:4096 -keyout typha-server.key -out typha-server.csr \
  -nodes -subj "/CN=calico-typha"
openssl x509 -req -in typha-server.csr -CA typha-ca.crt -CAkey typha-ca.key \
  -CAcreateserial -out typha-server.crt -days 365

# Generate Felix client certificate
openssl req -newkey rsa:4096 -keyout felix-client.key -out felix-client.csr \
  -nodes -subj "/CN=calico-felix"
openssl x509 -req -in felix-client.csr -CA typha-ca.crt -CAkey typha-ca.key \
  -CAcreateserial -out felix-client.crt -days 365

# Store as Kubernetes secrets
kubectl create secret generic calico-typha-tls \
  --from-file=ca.crt=typha-ca.crt \
  --from-file=tls.crt=typha-server.crt \
  --from-file=tls.key=typha-server.key \
  -n calico-system

kubectl create secret generic calico-felix-typha-tls \
  --from-file=ca.crt=typha-ca.crt \
  --from-file=tls.crt=felix-client.crt \
  --from-file=tls.key=felix-client.key \
  -n calico-system
```

## Step 3: Deploy Typha

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: calico-typha
  namespace: calico-system
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: calico-typha
  template:
    metadata:
      labels:
        k8s-app: calico-typha
    spec:
      serviceAccountName: calico-typha
      containers:
      - name: calico-typha
        image: calico/typha:v3.27.0
        ports:
        - containerPort: 5473
          name: calico-typha
        env:
        - name: TYPHA_LOGSEVERITYSCREEN
          value: "info"
        - name: TYPHA_PROMETHEUSMETRICSENABLED
          value: "true"
        - name: TYPHA_PROMETHEUSMETRICSPORT
          value: "9093"
        - name: TYPHA_CAFILE
          value: /typha-tls/ca.crt
        - name: TYPHA_SERVERCERTFILE
          value: /typha-tls/tls.crt
        - name: TYPHA_SERVERKEYFILE
          value: /typha-tls/tls.key
        volumeMounts:
        - name: typha-tls
          mountPath: /typha-tls
          readOnly: true
      volumes:
      - name: typha-tls
        secret:
          secretName: calico-typha-tls
---
apiVersion: v1
kind: Service
metadata:
  name: calico-typha
  namespace: calico-system
spec:
  selector:
    app: calico-typha
  ports:
  - port: 5473
    targetPort: 5473
    name: calico-typha
EOF
```

## Step 4: Configure Felix to Use Typha

Update FelixConfiguration to point Felix at Typha.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "typhak8sServiceName": "calico-typha",
    "typhak8sNamespace": "calico-system",
    "typhaCAFile": "/felix-tls/ca.crt",
    "tymphaCertFile": "/felix-tls/tls.crt",
    "typhaKeyFile": "/felix-tls/tls.key"
  }}'
```

## Step 5: Verify Typha Is Receiving Felix Connections

```bash
kubectl logs -n calico-system deployment/calico-typha | grep "New connection from"
kubectl exec -n calico-system deployment/calico-typha -- \
  wget -qO- http://localhost:9093/metrics | grep typha_connections_active
```

## Conclusion

Setting up Typha in a hard way Calico installation requires creating RBAC resources, generating mTLS certificates, deploying the Typha Deployment and Service, and configuring Felix to connect through Typha. Each step is explicit in the hard way model - understanding each piece makes it straightforward to debug connection issues, rotate certificates, or scale Typha replicas as the cluster grows.
