# How to Configure mTLS for External Service Communication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, External Services, Security, Kubernetes

Description: Set up mutual TLS authentication when your Istio mesh services need to communicate with external APIs that require client certificate authentication.

---

Some external services require mutual TLS for authentication. Banks, government APIs, B2B partner integrations, and compliance-heavy systems often mandate that your service presents a client certificate when connecting. This is different from Istio's internal mTLS, which uses automatically provisioned certificates. For external mTLS, you need to provide specific certificates that the external service trusts.

This guide shows how to configure Istio to handle mTLS with external services, where you provide your own client certificates for authentication.

## Internal mTLS vs External mTLS

It is important to distinguish between these two:

**Internal mTLS (Istio mesh)**: Certificates are automatically provisioned by Istio's CA. You do not manage individual certificates. Sidecars handle everything.

**External mTLS (with outside services)**: You have a specific client certificate and key, usually provided by the external service or your organization's PKI. You need to configure Istio to present this certificate when connecting to the external endpoint.

## The Basic Setup

Suppose you need to connect to a partner API at `api.partner.com` that requires mTLS. The partner has given you:
- A client certificate (`client.crt`)
- A client private key (`client.key`)
- Their CA certificate (`partner-ca.crt`) that signed their server certificate

First, create a Kubernetes secret with these credentials:

```bash
kubectl create secret generic partner-mtls-certs -n default \
  --from-file=cert=client.crt \
  --from-file=key=client.key \
  --from-file=cacert=partner-ca.crt
```

Create a ServiceEntry for the external service:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: partner-api
  namespace: default
spec:
  hosts:
  - api.partner.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

Now configure a DestinationRule that tells the sidecar proxy to use your client certificate when connecting to this external service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: partner-api-mtls
  namespace: default
spec:
  host: api.partner.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/cert
      privateKey: /etc/certs/key
      caCertificates: /etc/certs/cacert
```

Wait, there is a catch. The file paths in the DestinationRule reference files inside the sidecar proxy container. You need to mount the secret into the sidecar. Use pod annotations to do this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/userVolume: '[{"name":"partner-certs","secret":{"secretName":"partner-mtls-certs"}}]'
        sidecar.istio.io/userVolumeMount: '[{"name":"partner-certs","mountPath":"/etc/partner-certs","readOnly":true}]'
    spec:
      containers:
      - name: my-app
        image: my-app:v1
```

Then update the DestinationRule to use the correct mount paths:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: partner-api-mtls
  namespace: default
spec:
  host: api.partner.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/partner-certs/cert
      privateKey: /etc/partner-certs/key
      caCertificates: /etc/partner-certs/cacert
```

## Using credentialName (Preferred Approach)

A cleaner approach that avoids mounting volumes into the sidecar is using the `credentialName` field. This works with Istio's SDS (Secret Discovery Service):

Create the secret in the same namespace as the workload, using specific key names:

```bash
kubectl create secret generic partner-mtls-credential -n default \
  --from-file=tls.crt=client.crt \
  --from-file=tls.key=client.key \
  --from-file=ca.crt=partner-ca.crt
```

Note the key names: `tls.crt`, `tls.key`, and `ca.crt`. These are the names Istio's SDS expects.

Then use `credentialName` in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: partner-api-mtls
  namespace: default
spec:
  host: api.partner.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      credentialName: partner-mtls-credential
```

This is simpler because Istio automatically loads the certificates from the secret without needing volume mounts.

## TLS Origination with Client Certificates

In some cases, your application sends plaintext HTTP to the external service, and you want the sidecar to handle the TLS connection including presenting the client certificate. This is called TLS origination with mTLS:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: partner-api
  namespace: default
spec:
  hosts:
  - api.partner.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  - number: 80
    name: http
    protocol: HTTP
    targetPort: 443
  location: MESH_EXTERNAL
  resolution: DNS
```

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: partner-api-tls-origination
  namespace: default
spec:
  host: api.partner.com
  trafficPolicy:
    portLevelSettings:
    - port:
        number: 443
      tls:
        mode: MUTUAL
        credentialName: partner-mtls-credential
```

Now your application can call `http://api.partner.com` and the sidecar upgrades it to HTTPS with client certificate authentication.

## Routing Through the Egress Gateway

For sensitive external mTLS connections, you might want to route through the egress gateway so the client certificates only need to be stored in one place:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: partner-egress
  namespace: default
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - api.partner.com
    tls:
      mode: ISTIO_MUTUAL
```

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: partner-api-from-egress
  namespace: default
spec:
  host: api.partner.com
  trafficPolicy:
    portLevelSettings:
    - port:
        number: 443
      tls:
        mode: MUTUAL
        credentialName: partner-mtls-credential
```

With this setup, the egress gateway handles the external mTLS connection. The client certificates only need to be accessible to the egress gateway, not to every application pod.

## Managing Certificate Rotation

External mTLS certificates have expiration dates, and unlike Istio's internal certificates, they are not rotated automatically. You need a process for rotating these certificates before they expire.

Options include:

**cert-manager**: Use cert-manager to automatically renew certificates from your PKI and store them as Kubernetes secrets:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: partner-mtls-cert
  namespace: default
spec:
  secretName: partner-mtls-credential
  issuerRef:
    name: my-pki-issuer
    kind: ClusterIssuer
  dnsNames:
  - my-service.mycompany.com
  usages:
  - client auth
  duration: 8760h
  renewBefore: 720h
```

**External secrets operator**: If your certificates are stored in a vault or secrets manager, use the external secrets operator to sync them to Kubernetes secrets.

**Manual rotation**: Update the secret and the sidecar will pick up the new certificate. With SDS (`credentialName`), changes are detected automatically without pod restarts.

## Verifying External mTLS

Test the connection from your pod:

```bash
kubectl exec deploy/my-app -- curl -v https://api.partner.com/health
```

Check the sidecar logs for TLS handshake details:

```bash
kubectl logs deploy/my-app -c istio-proxy | grep "api.partner.com"
```

You can also use istioctl to check the proxy configuration:

```bash
istioctl proxy-config clusters deploy/my-app --fqdn api.partner.com -o json
```

Look for the `transportSocket` configuration, which should show the client certificate paths.

## Common Issues

**Wrong certificate format**: Certificates must be PEM-encoded. DER or PKCS12 formats need to be converted first.

**Certificate chain incomplete**: If the partner's CA is not a well-known root, you must provide the full CA chain in `ca.crt`.

**Secret not found**: When using `credentialName`, the secret must be in the same namespace as the workload (for sidecar) or in `istio-system` (for gateways).

**Certificate not picking up after rotation**: If using file-based configuration (not SDS), you need to restart the sidecar for new certificates to be loaded. SDS-based configuration picks up changes automatically.

External mTLS with Istio requires more manual certificate management than internal mesh mTLS, but it enables secure integration with external services that mandate client certificate authentication.
