# How to Implement Pod-to-Pod mTLS Without a Service Mesh Using cert-manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, mTLS

Description: Learn how to implement pod-to-pod mutual TLS authentication using cert-manager without deploying a full service mesh for lightweight secure communication in Kubernetes.

---

While service meshes like Istio provide comprehensive mTLS capabilities, they introduce operational complexity and resource overhead. For many use cases, you can achieve pod-to-pod mTLS using cert-manager to issue certificates and configure applications to use them directly, providing strong authentication and encryption without the service mesh footprint.

This guide demonstrates how to implement pod-to-pod mTLS using cert-manager in Kubernetes.

## Understanding mTLS Without a Service Mesh

Mutual TLS (mTLS) requires both client and server to present certificates for authentication. Without a service mesh, you need to:

1. Issue certificates to each pod
2. Configure applications to use TLS for connections
3. Implement certificate rotation
4. Verify peer certificates

cert-manager automates certificate issuance and renewal, making manual mTLS implementation practical.

## Prerequisites

Ensure you have:

- Kubernetes cluster (1.24+)
- kubectl with cluster admin access
- Basic understanding of TLS concepts

## Installing cert-manager

Deploy cert-manager using Helm:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

Verify installation:

```bash
kubectl get pods -n cert-manager
```

## Creating a Certificate Authority

Create a self-signed CA for internal mTLS:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mtls-demo
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mtls-ca
  namespace: mtls-demo
spec:
  isCA: true
  commonName: mtls-ca
  secretName: mtls-ca-secret
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
    group: cert-manager.io
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: mtls-ca-issuer
  namespace: mtls-demo
spec:
  ca:
    secretName: mtls-ca-secret
```

## Issuing Certificates for Pods

Create certificates for your application pods:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: server-cert
  namespace: mtls-demo
spec:
  secretName: server-cert-secret
  duration: 2160h  # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
  subject:
    organizations:
    - MyOrg
  commonName: server.mtls-demo.svc.cluster.local
  dnsNames:
  - server.mtls-demo.svc.cluster.local
  - server.mtls-demo.svc
  - server
  issuerRef:
    name: mtls-ca-issuer
    kind: Issuer
  usages:
  - digital signature
  - key encipherment
  - server auth
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: client-cert
  namespace: mtls-demo
spec:
  secretName: client-cert-secret
  duration: 2160h
  renewBefore: 360h
  subject:
    organizations:
    - MyOrg
  commonName: client.mtls-demo.svc.cluster.local
  issuerRef:
    name: mtls-ca-issuer
    kind: Issuer
  usages:
  - digital signature
  - key encipherment
  - client auth
```

Verify certificates are issued:

```bash
kubectl get certificates -n mtls-demo
kubectl get secrets -n mtls-demo | grep cert-secret
```

## Deploying Server with mTLS

Create a server pod that requires client certificates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: server-config
  namespace: mtls-demo
data:
  server.go: |
    package main

    import (
        "crypto/tls"
        "crypto/x509"
        "fmt"
        "io/ioutil"
        "log"
        "net/http"
    )

    func main() {
        // Load server certificate
        serverCert, err := tls.LoadX509KeyPair("/certs/tls.crt", "/certs/tls.key")
        if err != nil {
            log.Fatal(err)
        }

        // Load CA certificate for client verification
        caCert, err := ioutil.ReadFile("/certs/ca.crt")
        if err != nil {
            log.Fatal(err)
        }
        caCertPool := x509.NewCertPool()
        caCertPool.AppendCertsFromPEM(caCert)

        // Configure TLS
        tlsConfig := &tls.Config{
            Certificates: []tls.Certificate{serverCert},
            ClientAuth:   tls.RequireAndVerifyClientCert,
            ClientCAs:    caCertPool,
        }

        server := &http.Server{
            Addr:      ":8443",
            TLSConfig: tlsConfig,
        }

        http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
            fmt.Fprintf(w, "Secure connection established!")
        })

        log.Println("Server listening on :8443")
        log.Fatal(server.ListenAndServeTLS("", ""))
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: server
  namespace: mtls-demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: server
  template:
    metadata:
      labels:
        app: server
    spec:
      containers:
      - name: server
        image: golang:1.21
        command:
        - sh
        - -c
        - |
          cd /app && go run server.go
        volumeMounts:
        - name: server-certs
          mountPath: /certs
          readOnly: true
        - name: config
          mountPath: /app
        ports:
        - containerPort: 8443
          name: https
      volumes:
      - name: server-certs
        secret:
          secretName: server-cert-secret
      - name: config
        configMap:
          name: server-config
---
apiVersion: v1
kind: Service
metadata:
  name: server
  namespace: mtls-demo
spec:
  selector:
    app: server
  ports:
  - port: 8443
    targetPort: 8443
    name: https
```

## Deploying Client with mTLS

Create a client pod that presents certificates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: client-config
  namespace: mtls-demo
data:
  client.go: |
    package main

    import (
        "crypto/tls"
        "crypto/x509"
        "fmt"
        "io/ioutil"
        "log"
        "net/http"
    )

    func main() {
        // Load client certificate
        clientCert, err := tls.LoadX509KeyPair("/certs/tls.crt", "/certs/tls.key")
        if err != nil {
            log.Fatal(err)
        }

        // Load CA certificate for server verification
        caCert, err := ioutil.ReadFile("/certs/ca.crt")
        if err != nil {
            log.Fatal(err)
        }
        caCertPool := x509.NewCertPool()
        caCertPool.AppendCertsFromPEM(caCert)

        // Configure TLS client
        tlsConfig := &tls.Config{
            Certificates: []tls.Certificate{clientCert},
            RootCAs:      caCertPool,
        }

        client := &http.Client{
            Transport: &http.Transport{
                TLSClientConfig: tlsConfig,
            },
        }

        // Make request
        resp, err := client.Get("https://server.mtls-demo.svc.cluster.local:8443/")
        if err != nil {
            log.Fatal(err)
        }
        defer resp.Body.Close()

        body, _ := ioutil.ReadAll(resp.Body)
        fmt.Printf("Response: %s\n", body)
    }
---
apiVersion: batch/v1
kind: Job
metadata:
  name: client
  namespace: mtls-demo
spec:
  template:
    spec:
      containers:
      - name: client
        image: golang:1.21
        command:
        - sh
        - -c
        - |
          cd /app && go run client.go
        volumeMounts:
        - name: client-certs
          mountPath: /certs
          readOnly: true
        - name: config
          mountPath: /app
      volumes:
      - name: client-certs
        secret:
          secretName: client-cert-secret
      - name: config
        configMap:
          name: client-config
      restartPolicy: Never
```

Test the connection:

```bash
kubectl logs -n mtls-demo job/client
# Should show: Response: Secure connection established!
```

## Automatic Certificate Rotation

cert-manager automatically renews certificates before expiry. To ensure pods get updated certificates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: server
  namespace: mtls-demo
spec:
  template:
    metadata:
      annotations:
        # Force pod restart when cert changes
        cert-manager.io/certificate-hash: "{{ .Values.certHash }}"
    spec:
      containers:
      - name: server
        # ... configuration ...
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
```

Or use CSI driver for automatic certificate updates:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: server-csi
  namespace: mtls-demo
spec:
  containers:
  - name: server
    image: myserver:latest
    volumeMounts:
    - name: certs
      mountPath: /certs
      readOnly: true
  volumes:
  - name: certs
    csi:
      driver: csi.cert-manager.io
      readOnly: true
      volumeAttributes:
        csi.cert-manager.io/issuer-name: mtls-ca-issuer
        csi.cert-manager.io/dns-names: server.mtls-demo.svc.cluster.local
```

## Using cert-manager Trust for CA Distribution

Distribute CA certificates to pods automatically:

```yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: mtls-ca-bundle
spec:
  sources:
  - secret:
      name: mtls-ca-secret
      key: ca.crt
  target:
    configMap:
      key: ca.crt
    namespaceSelector:
      matchLabels:
        mtls-enabled: "true"
```

Label namespaces to receive the bundle:

```bash
kubectl label namespace mtls-demo mtls-enabled=true
```

## Conclusion

Implementing pod-to-pod mTLS with cert-manager provides strong security without the operational complexity of a service mesh. By automating certificate issuance and renewal, cert-manager makes manual mTLS practical for securing internal microservice communication.

Deploy cert-manager with an internal CA, configure applications to use issued certificates, implement automatic certificate rotation, and distribute CA trust bundles to all pods. Monitor certificate expiry and renewal with OneUptime to ensure continuous secure communication across your services.
