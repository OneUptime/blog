# How to Configure TLS Termination at Sidecar Level in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, Sidecar, Security, Envoy

Description: How to configure TLS termination directly at the Envoy sidecar proxy in Istio for applications that receive TLS connections from non-mesh clients.

---

Usually in Istio, TLS termination happens at the ingress gateway for external traffic and through automatic mTLS between sidecars. But there are situations where you need the sidecar itself to terminate TLS - when non-mesh clients connect directly to a service, when you are migrating from an application-level TLS setup, or when specific compliance requirements demand TLS termination at the workload level.

Sidecar-level TLS termination means the Envoy sidecar accepts TLS connections on a specific port, terminates the encryption, and passes plaintext to the application container. The application does not need to handle TLS at all.

## When You Need Sidecar TLS Termination

A few common scenarios:

- External clients (not going through the ingress gateway) connect directly to a service via a NodePort or LoadBalancer
- Kubernetes Jobs or CronJobs without sidecars need to connect to mesh services using TLS
- You are migrating from application-managed TLS to Istio-managed TLS and need a transition period
- A service needs to present a specific certificate (not the Istio-provisioned one) to clients

## Basic Setup with Sidecar Resource

The Sidecar resource in Istio controls the behavior of the Envoy sidecar for a specific workload. To set up TLS termination, you combine a Sidecar resource with the appropriate TLS configuration. This is an experimental Istio feature, so the control plane must be installed with `ENABLE_TLS_ON_SIDECAR_INGRESS=true`.

First, create a Kubernetes secret with the TLS certificate:

```bash
kubectl create secret tls my-service-tls \
  --cert=server-cert.pem \
  --key=server-key.pem \
  -n production
```

Then mount the certificate into the Envoy sidecar. Istio does not currently support `credentialName` in sidecar ingress TLS settings, so the Sidecar resource references file paths inside the proxy container:

```yaml
metadata:
  annotations:
    sidecar.istio.io/userVolume: '{"tls-secret":{"secret":{"secretName":"my-service-tls","optional":true}}}'
    sidecar.istio.io/userVolumeMount: '{"tls-secret":{"mountPath":"/etc/istio/tls-certs/","readOnly":true}}'
```

Then configure the sidecar to use this certificate for inbound TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: my-service-sidecar
  namespace: production
spec:
  workloadSelector:
    labels:
      app: my-service
  ingress:
    - port:
        number: 8443
        protocol: HTTPS
        name: https-inbound
      defaultEndpoint: 127.0.0.1:8080
      tls:
        mode: SIMPLE
        privateKey: /etc/istio/tls-certs/tls.key
        serverCertificate: /etc/istio/tls-certs/tls.crt
```

This tells the sidecar to:
1. Listen on port 8443 for incoming TLS connections
2. Terminate TLS using the certificate from the `my-service-tls` secret
3. Forward decrypted traffic to the application on `127.0.0.1:8080`

## Using EnvoyFilter for Advanced TLS Termination

For more control over TLS termination settings, use an EnvoyFilter only when the Sidecar API cannot express the setting you need. EnvoyFilter patches are version-sensitive, so start by inspecting the generated inbound listener and patching that listener instead of adding a second listener on the same port:

```bash
istioctl proxy-config listeners <pod-name> -n production --port 8443 -o json
```

## Mutual TLS Termination at the Sidecar

If you need the sidecar to verify client certificates (mutual TLS), extend the configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: my-service-sidecar
  namespace: production
spec:
  workloadSelector:
    labels:
      app: my-service
  ingress:
    - port:
        number: 8443
        protocol: HTTPS
        name: https-mutual
      defaultEndpoint: 127.0.0.1:8080
      tls:
        mode: MUTUAL
        privateKey: /etc/istio/tls-certs/tls.key
        serverCertificate: /etc/istio/tls-certs/tls.crt
        caCertificates: /etc/istio/tls-ca-certs/ca.crt
```

For mutual TLS, create a separate secret for the CA certificate used to validate clients and mount it into the sidecar:

```bash
kubectl create secret generic my-service-tls-cacert -n production \
  --from-file=ca.crt=client-ca-cert.pem
```

```yaml
metadata:
  annotations:
    sidecar.istio.io/userVolume: '{"tls-secret":{"secret":{"secretName":"my-service-tls","optional":true}},"tls-ca-secret":{"secret":{"secretName":"my-service-tls-cacert"}}}'
    sidecar.istio.io/userVolumeMount: '{"tls-secret":{"mountPath":"/etc/istio/tls-certs/","readOnly":true},"tls-ca-secret":{"mountPath":"/etc/istio/tls-ca-certs/","readOnly":true}}'
```

## Combining with Istio mTLS

An important detail: sidecar TLS termination for custom certificates is separate from Istio's automatic mTLS. The sidecar can handle both simultaneously on different ports.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-service-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8443:
      mode: DISABLE
```

This configuration:
- Requires Istio mTLS on the default service port (for mesh-internal traffic)
- Disables Istio mTLS on port 8443 (where custom TLS termination handles it)

The application's Kubernetes Service should expose both ports:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: production
spec:
  selector:
    app: my-service
  ports:
    - name: http
      port: 8080
      targetPort: 8080
    - name: https
      port: 8443
      targetPort: 8443
```

## Verifying Sidecar TLS Termination

Check that the sidecar has the right listener configuration:

```bash
istioctl proxy-config listener <pod-name> -n production
```

You should see a listener on port 8443. Check its details:

```bash
istioctl proxy-config listener <pod-name> -n production --port 8443 -o json
```

Look for the `transportSocket` section confirming TLS is configured.

Test the TLS connection:

```bash
# From another pod in the cluster

kubectl exec <test-pod> -- \
  openssl s_client -connect my-service.production:8443 -servername my-service.production
```

Verify the certificate presented is your custom certificate, not the Istio-provisioned one:

```bash
kubectl exec <test-pod> -- \
  openssl s_client -connect my-service.production:8443 2>/dev/null | \
  openssl x509 -text -noout | grep "Subject:"
```

## Migration from Application TLS to Sidecar TLS

If your application currently handles TLS internally and you want to move TLS termination to the sidecar, follow this migration path:

1. Configure the sidecar to terminate TLS on a new port (e.g., 8443) using the same certificate
2. Update the Kubernetes Service to expose the new port
3. Gradually shift traffic to the new port
4. Once all traffic uses the sidecar-terminated port, remove TLS from the application
5. Update the application to listen on plaintext HTTP

```mermaid
graph LR
    subgraph Before
        C1[Client] -->|TLS| A1[App:8443 handles TLS]
    end
    subgraph During Migration
        C2[Client] -->|TLS| S1[Sidecar:8443]
        S1 -->|plaintext| A2[App:8080]
        C3[Legacy Client] -->|TLS| A3[App:8443]
    end
    subgraph After
        C4[Client] -->|TLS| S2[Sidecar:8443]
        S2 -->|plaintext| A4[App:8080 plaintext only]
    end
```

## Troubleshooting

**Secret not found**: Verify the secret is in the same namespace as the workload:

```bash
kubectl get secrets -n production | grep my-service-tls
```

**Wrong certificate presented**: Check that the sidecar annotations mount the expected secret and that the `privateKey`, `serverCertificate`, and `caCertificates` paths match the mounted file paths. Also verify the TLS secret has the correct key names (`tls.crt` and `tls.key`).

**Connection refused on the TLS port**: The sidecar listener might not be configured. Check with `istioctl proxy-config listener` and look at istiod logs for configuration push errors:

```bash
kubectl logs deployment/istiod -n istio-system | grep "my-service"
```

**Application receiving encrypted traffic**: If the application is still getting encrypted data instead of plaintext, the sidecar is not terminating TLS. Double-check that the `defaultEndpoint` points to the application's plaintext port.

Sidecar-level TLS termination is a useful tool for specific scenarios. It is not the default way Istio handles TLS, but when you need it, having the option to configure it directly on the sidecar keeps things clean and avoids the need for application-level TLS code.
