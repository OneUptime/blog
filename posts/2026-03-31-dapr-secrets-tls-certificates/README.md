# How to Use Dapr Secrets Management for TLS Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, TLS, Certificate, Security

Description: Learn how to store and retrieve TLS certificates and private keys using Dapr Secrets Management for secure service-to-service communication.

---

TLS certificates and private keys are among the most sensitive assets in any production environment. Hardcoding them in config maps or mounting them as plain files creates unnecessary exposure. Dapr Secrets Management lets you fetch TLS material at runtime from a hardened backend, keeping certificate lifecycle management separate from your application.

## Storing TLS Certificates in a Secret Store

Place your certificate chain and private key in a Kubernetes secret:

```bash
kubectl create secret generic tls-certs \
  --from-file=tls.crt=./server.crt \
  --from-file=tls.key=./server.key \
  --from-file=ca.crt=./ca.crt \
  -n production
```

Define the Dapr secret store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: k8s-secret-store
  namespace: production
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
```

## Retrieving Certificates at Application Startup

A Go service can fetch and load TLS credentials before starting the server:

```go
package main

import (
    "crypto/tls"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

type TLSSecrets struct {
    TLSCert string `json:"tls.crt"`
    TLSKey  string `json:"tls.key"`
    CACert  string `json:"ca.crt"`
}

func loadTLSFromDapr() (*tls.Certificate, error) {
    resp, err := http.Get("http://localhost:3500/v1.0/secrets/k8s-secret-store/tls-certs")
    if err != nil {
        return nil, fmt.Errorf("failed to fetch TLS secrets: %w", err)
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    var secrets TLSSecrets
    json.Unmarshal(body, &secrets)

    cert, err := tls.X509KeyPair([]byte(secrets.TLSCert), []byte(secrets.TLSKey))
    if err != nil {
        return nil, fmt.Errorf("failed to parse certificate: %w", err)
    }
    return &cert, nil
}

func main() {
    cert, err := loadTLSFromDapr()
    if err != nil {
        panic(err)
    }

    tlsConfig := &tls.Config{
        Certificates: []tls.Certificate{*cert},
    }

    server := &http.Server{
        Addr:      ":8443",
        TLSConfig: tlsConfig,
    }
    server.ListenAndServeTLS("", "")
}
```

## Using Certificates in Dapr Component Definitions

Reference a TLS certificate directly in a Dapr component without exposing it in YAML:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9093"
    - name: authType
      value: "mtls"
    - name: caCert
      secretKeyRef:
        name: tls-certs
        key: ca.crt
    - name: clientCert
      secretKeyRef:
        name: tls-certs
        key: tls.crt
    - name: clientKey
      secretKeyRef:
        name: tls-certs
        key: tls.key
  auth:
    secretStore: k8s-secret-store
```

## Rotating Certificates Without Restarts

When you update the secret in Kubernetes, pods reading secrets through Dapr can pick up the new values on their next secret API call. For long-lived processes, implement a periodic refresh:

```go
func startCertRefresher(interval time.Duration, reloadFunc func()) {
    ticker := time.NewTicker(interval)
    go func() {
        for range ticker.C {
            reloadFunc()
        }
    }()
}
```

## Summary

Dapr Secrets Management centralizes TLS certificate storage and retrieval, removing the need to mount sensitive files directly into containers. By fetching certificates at runtime and referencing them in component definitions, you gain the ability to rotate certificates independently of your application deployment lifecycle.
