# Validation Summary: How to Plan TLS Certificate Rotation for Fulcio HTTP and gRPC Listeners

## Status

validated

## Post Type

Technical operations guide with certificate inspection, Kubernetes rollout, and TLS verification commands.

## Technologies Covered

- Sigstore Fulcio HTTP, separate gRPC, and shared duplex listeners
- TLS, X.509 certificates, certificate chains, and client trust
- Kubernetes Secret volumes, ingress, and Deployment rollouts
- OpenSSL command-line tools and shell public-key comparison

## Sources Consulted

- [Fulcio setup documentation, Serving over TLS](https://github.com/sigstore/fulcio/blob/main/docs/setup.md#serving-over-tls): listener-specific certificate reload behavior and serving certificate flags.
- [Fulcio serve implementation](https://github.com/sigstore/fulcio/blob/main/cmd/app/serve.go): startup loading of the duplex TLS certificate and separation of serving configuration from CA backends.
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets-as-files-from-a-pod): eventual volume updates and the subPath update limitation.
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment): rolling updates, availability, and surge controls.
- [kubectl rollout restart](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/): Deployment resource syntax and namespace selection.
- [kubectl rollout status](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/): rollout monitoring syntax.
- [OpenSSL x509](https://docs.openssl.org/3.5/man1/openssl-x509/): certificate metadata, SAN extension, and public-key output options.
- [OpenSSL pkey](https://docs.openssl.org/3.5/man1/openssl-pkey/): extraction of public components from a private key using -pubout.
- [OpenSSL s_client](https://docs.openssl.org/3.5/man1/openssl-s_client/): connection target, SNI, hostname verification, CA trust input, and verification failure handling.
- [RFC 8446, TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446.html): certificate authentication, established connection state, and session resumption.

## Issues Found

No technical issues found.

## Review Notes

- The README was left unchanged. Its external technical links resolve to the intended official resources.
- Upstream Fulcio documentation explicitly distinguishes automatic on-disk certificate rotation for the separate gRPC listener from restart-based rotation for HTTP and duplex listeners. The duplex implementation loads the certificate with tls.LoadX509KeyPair at startup. These claims concern upstream main; the post appropriately requires checking the deployed release.
- The Secret delivery guidance correctly separates filesystem propagation from application reload behavior. It does not promise an immediate update or automatic updates for subPath mounts.
- The certificate inspection flags are documented and the public-key extraction commands produce public material for comparison. Matching public keys alone does not validate names, trust, usage, or certificate lifetime, as the post states.
- All three Bash command blocks passed bash -n syntax checking. The kubectl commands match official examples; no cluster rollout was executed.
- The s_client command supplies SNI independently of hostname validation and uses -verify_return_error to make certificate verification errors fatal. A fresh invocation without imported session state is suitable for observing a new certificate handshake. Reused application connections or resumed sessions should not be treated as evidence of a newly presented certificate.
- The example service DNS name, port, namespace, Deployment name, and CA file are deployment-specific. The article identifies these as contextual values. No live Fulcio endpoint, ingress, or staging signing flow was available for integration testing.
- s_client includes the peer certificate in PEM form; readers can inspect that certificate with the demonstrated x509 options to compare its serial and expiration. A successful handshake and a healthy pod do not replace the normal-path signing check.
- Trust overlap, retaining valid rollback material, and verifying every replica and ingress are appropriate operational recommendations. Actual availability depends on rollout settings, readiness, and spare capacity.
