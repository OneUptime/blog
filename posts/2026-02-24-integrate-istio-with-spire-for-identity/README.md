# How to Integrate Istio with SPIRE for Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SPIRE, SPIFFE, Identity, Security, Kubernetes

Description: Step-by-step guide to integrating SPIRE with Istio for workload identity management using the SPIFFE standard.

---

Workload identity is one of those foundational pieces of security that tends to get overlooked until something goes wrong. Istio has its own built-in identity system based on Kubernetes service accounts, but if you need stronger identity guarantees, cross-cluster identity federation, or compliance with the SPIFFE standard, integrating SPIRE is the right move.

## What SPIRE Brings to the Table

SPIFFE (Secure Production Identity Framework for Everyone) is an open standard for workload identity. SPIRE is the reference implementation. It provides cryptographic identities to workloads in the form of SPIFFE Verifiable Identity Documents (SVIDs), which are basically X.509 certificates or JWT tokens with a SPIFFE ID embedded in them.

A SPIFFE ID looks like this:

```text
spiffe://trust-domain/path/to/workload
```

When you integrate SPIRE with Istio, SPIRE becomes the certificate authority for the mesh instead of istiod. Every sidecar proxy gets its identity from SPIRE, and mutual TLS between services uses SPIRE-issued certificates.

## Installing SPIRE

Start by deploying the SPIRE server and agent on your cluster. The SPIRE server manages identity registration and certificate signing. The agents run on each node and handle the actual attestation and SVID delivery.

```bash
kubectl create namespace spire

# Deploy SPIRE server
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: spire-server
  namespace: spire
spec:
  replicas: 1
  selector:
    matchLabels:
      app: spire-server
  serviceName: spire-server
  template:
    metadata:
      labels:
        app: spire-server
    spec:
      serviceAccountName: spire-server
      containers:
      - name: spire-server
        image: ghcr.io/spiffe/spire-server:1.9.0
        args:
        - -config
        - /run/spire/config/server.conf
        ports:
        - containerPort: 8081
        volumeMounts:
        - name: spire-config
          mountPath: /run/spire/config
          readOnly: true
        - name: spire-data
          mountPath: /run/spire/data
      volumes:
      - name: spire-config
        configMap:
          name: spire-server
  volumeClaimTemplates:
  - metadata:
      name: spire-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 1Gi
EOF
```

The SPIRE server configuration needs to know about Kubernetes as a node attestor:

```yaml
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
      log_level = "DEBUG"
      ca_key_type = "rsa-2048"
      default_x509_svid_ttl = "1h"
      ca_subject = {
        country = ["US"],
        organization = ["SPIFFE"],
      }
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
    }
```

## Deploying SPIRE Agents

SPIRE agents run as a DaemonSet so there is one on every node:

```yaml
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
      serviceAccountName: spire-agent
      hostPID: true
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: spire-agent
        image: ghcr.io/spiffe/spire-agent:1.9.0
        args:
        - -config
        - /run/spire/config/agent.conf
        volumeMounts:
        - name: spire-config
          mountPath: /run/spire/config
          readOnly: true
        - name: spire-agent-socket
          mountPath: /run/spire/sockets
        - name: spire-token
          mountPath: /var/run/secrets/tokens
      volumes:
      - name: spire-config
        configMap:
          name: spire-agent
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

## Configuring Istio to Use SPIRE

Now the interesting part. You need to tell Istio to use SPIRE for its identity instead of the built-in CA. This is done through the Istio installation configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_CERT_SIGNER: istio-system
  values:
    global:
      caAddress: ""
    pilot:
      env:
        ENABLE_CA_SERVER: "false"
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        overlays:
        - apiVersion: apps/v1
          kind: Deployment
          name: istio-ingressgateway
          patches:
          - path: spec.template.spec.volumes[+]
            value:
              name: spire-agent-socket
              hostPath:
                path: /run/spire/sockets
                type: Directory
          - path: spec.template.spec.containers[0].volumeMounts[+]
            value:
              name: spire-agent-socket
              mountPath: /run/spire/sockets
              readOnly: true
```

You also need to patch the sidecar injector to mount the SPIRE agent socket into every sidecar proxy. This is typically done through a MutatingWebhookConfiguration or through the Istio sidecar template:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-sidecar-injector
  namespace: istio-system
data:
  values: |-
    {
      "global": {
        "proxy": {
          "volumeMounts": [
            {
              "name": "spire-agent-socket",
              "mountPath": "/run/spire/sockets",
              "readOnly": true
            }
          ]
        }
      }
    }
```

## Registering Workload Identities

SPIRE requires explicit registration of workload identities. You need to create registration entries for each workload that needs an SVID:

```bash
# Register the Istio ingress gateway
kubectl exec -n spire spire-server-0 -- \
  /opt/spire/bin/spire-server entry create \
  -spiffeID spiffe://example.org/ns/istio-system/sa/istio-ingressgateway-service-account \
  -parentID spiffe://example.org/ns/spire/sa/spire-agent \
  -selector k8s:ns:istio-system \
  -selector k8s:sa:istio-ingressgateway-service-account

# Register a workload
kubectl exec -n spire spire-server-0 -- \
  /opt/spire/bin/spire-server entry create \
  -spiffeID spiffe://example.org/ns/default/sa/my-app \
  -parentID spiffe://example.org/ns/spire/sa/spire-agent \
  -selector k8s:ns:default \
  -selector k8s:sa:my-app
```

For large clusters, manually registering every workload is tedious. The SPIRE Controller Manager automates this by watching Kubernetes resources and creating entries automatically:

```bash
kubectl apply -f https://raw.githubusercontent.com/spiffe/spire-controller-manager/main/docs/install.yaml
```

With the controller manager, you can use a ClusterSPIFFEID resource:

```yaml
apiVersion: spire.spiffe.io/v1alpha1
kind: ClusterSPIFFEID
metadata:
  name: istio-workloads
spec:
  spiffeIDTemplate: "spiffe://example.org/ns/{{ .PodMeta.Namespace }}/sa/{{ .PodSpec.ServiceAccountName }}"
  podSelector:
    matchLabels:
      spiffe.io/spire-managed-identity: "true"
  namespaceSelector:
    matchLabels: {}
```

## Verifying the Integration

Check that workloads are receiving SPIRE-issued certificates:

```bash
# Check the SVID of a sidecar proxy
istioctl proxy-config secret <pod-name> -o json | jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain'

# Verify the SPIFFE ID in the certificate
kubectl exec <pod-name> -c istio-proxy -- \
  openssl x509 -in /etc/certs/cert-chain.pem -text -noout | grep URI
```

The URI SAN should show your SPIFFE ID format.

## Cross-Cluster Federation

One of the biggest advantages of SPIRE over Istio's built-in CA is federation. You can federate trust domains across clusters:

```bash
# On cluster A, create a federation relationship
kubectl exec -n spire spire-server-0 -- \
  /opt/spire/bin/spire-server federation create \
  -bundleEndpointURL https://spire-server-cluster-b.example.com:8443 \
  -bundleEndpointProfile https_spiffe \
  -trustDomain cluster-b.example.org \
  -trustDomainBundleEndpointProfile https_spiffe
```

This lets workloads in different clusters with different trust domains authenticate each other, which is something Istio's multi-cluster setup can leverage for cross-cluster mTLS.

## Troubleshooting

If sidecars are not getting certificates from SPIRE, check the agent logs first:

```bash
kubectl logs -n spire -l app=spire-agent
kubectl logs -n spire spire-server-0
```

Common issues include missing registration entries, incorrect selectors, and the SPIRE agent socket not being mounted in the sidecar container. Verify the socket is accessible:

```bash
kubectl exec <pod-name> -c istio-proxy -- ls -la /run/spire/sockets/
```

The integration between Istio and SPIRE gives you production-grade workload identity that goes well beyond what Kubernetes service accounts alone can provide. The setup requires more moving parts, but the security and federation capabilities make it worthwhile for organizations with strict identity requirements.
