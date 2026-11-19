# How to Plan TLS Certificate Rotation for Fulcio HTTP and gRPC Listeners

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, TLS, Kubernetes, Troubleshooting

Description: Plan Fulcio transport certificate rotation around listener-specific reload behavior, Kubernetes Secret delivery, fresh TLS handshakes, and a tested rollback.

Rotating Fulcio's network serving certificate is a different operation from rotating the CA that signs workload certificates. A successful signing-key reload says nothing about which TLS certificate an ingress or gRPC client sees. Start by identifying the process and listener that actually terminate each connection.

For current upstream Fulcio, the [setup documentation](https://github.com/sigstore/fulcio/blob/main/docs/setup.md#serving-over-tls) makes an important distinction: the separate gRPC listener reloads its serving certificate from disk, while HTTP and shared duplex serving certificates require a restart. Confirm that behavior against the release you run before planning a rollout.

## Build a listener inventory

Include the ingress certificate even if another team owns it. A deployment may have a public ingress certificate, an internal Fulcio HTTP certificate, and a separate gRPC certificate with different issuers and names.

| Connection | Certificate consumer | Rotation action to confirm |
|---|---|---|
| Client to ingress | Ingress controller | Controller-specific reload |
| Ingress to HTTP listener | Fulcio HTTP server | Restart for current documented implementation |
| Client to separate gRPC listener | Fulcio gRPC server | On-disk reload for current documented implementation |
| Client to duplex listener | Shared Fulcio server | Restart for current documented implementation |

Record the certificate path, key path, DNS names, trust bundle, and expiration for each row. If the deployed release lacks a listener feature shown in current documentation, record the proxy or sidecar that supplies it instead.

The [serve implementation](https://github.com/sigstore/fulcio/blob/main/cmd/app/serve.go) explicitly loads the shared duplex certificate at startup. A mounted file changing later does not make that in-memory certificate change.

## Check delivery before reload behavior

Kubernetes Secret volumes update eventually. A container mounting a Secret through `subPath` does not receive automatic Secret updates, as described in the [Kubernetes Secret documentation](https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets-as-files-from-a-pod). A perfectly functioning application reload mechanism cannot load a certificate that never reaches its filesystem.

Inspect your volume and volumeMount declarations. Prefer a mounted directory when relying on updates, and confirm that the running process can read the new certificate and key. Avoid editing individual files in place in a way that exposes a mismatched pair. Use the deployment platform's supported certificate publication mechanism.

Before rollout, inspect the replacement serving certificate:

```bash
openssl x509 -in new-serving.crt -noout \
  -subject -issuer -serial -dates -ext subjectAltName
openssl x509 -in new-serving.crt -pubkey -noout > cert-public.pem
openssl pkey -in new-serving.key -pubout > key-public.pem
cmp cert-public.pem key-public.pem
```

These commands inspect public material and compare public keys. Keep the private key file out of incident attachments. A matching key pair still needs the correct names, chain, usage, and validity period for your clients.

## Rotate with an overlap window

If the serving CA changes, distribute the new trust chain to clients before presenting the new leaf certificate. Retain the old trust chain during an intentional overlap while old endpoints and connections are still possible. A leaf renewal under the same trusted CA usually has a smaller coordination scope.

For HTTP or duplex listeners, roll the deployment after the new files are available. Ensure readiness probes exercise the configured protocol and that remaining replicas can serve traffic while one restarts. For the separate gRPC listener, test the documented reload behavior in staging rather than assuming it also applies to every sidecar and ingress in the path.

```bash
kubectl -n sigstore rollout restart deployment/fulcio
kubectl -n sigstore rollout status deployment/fulcio
```

This is a contextual rollout example for a deployment that needs restarting. It is not required for every listener and should follow your normal change controls and capacity checks.

## Observe a new handshake

An established TLS connection may continue using its existing session. Confirm rotation with a new connection that verifies both the trust chain and the expected hostname:

```bash
openssl s_client \
  -connect fulcio.sigstore.svc.cluster.local:5555 \
  -servername fulcio.sigstore.svc.cluster.local \
  -verify_hostname fulcio.sigstore.svc.cluster.local \
  -verify_return_error -CAfile serving-ca.pem </dev/null
```

Use the actual listener address and port. Compare the presented serial and expiry with the replacement certificate, then perform a staging signing request through the normal client path. A healthy pod alone does not prove that the ingress accepts its upstream certificate.

Keep the previous valid certificate and deployment configuration available for rollback throughout the overlap. When all replicas and front doors present the expected material and normal requests pass, retire the superseded trust only after its consumers have moved. Record the observed reload behavior so the next renewal does not repeat the same uncertainty.
