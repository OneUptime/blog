# Validation Summary: How to Run ArgoCD in FIPS Compliance Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Red Hat OpenShift GitOps
- Go FIPS 140-3 cryptographic module
- Kubernetes
- Redis
- TLS
- Linux FIPS mode
- eksctl

## Sources Consulted
- Go FIPS 140-3 Compliance documentation: https://go.dev/doc/security/fips140
- Go blog, The FIPS 140-3 Go Cryptographic Module: https://go.dev/blog/fips140
- Argo CD TLS configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD `argocd-cmd-params-cm` example for v2.13: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD Operator ArgoCD CR reference: https://argocd-operator.readthedocs.io/en/stable/reference/argocd/
- Red Hat OpenShift GitOps release notes, FIPS SSH known issue: https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/1.17/html/release_notes/gitops-release-notes
- NIST FIPS 140-3 publication page: https://csrc.nist.gov/pubs/fips/140-3/final
- Argo CD v2.13.0 source tree and Makefile, cloned from https://github.com/argoproj/argo-cd

## Issues Found
- The post described FIPS 140-2 as the current standard. Updated the wording to FIPS 140 and noted that FIPS 140-3 supersedes FIPS 140-2.
- The custom build path recommended `GOEXPERIMENT=boringcrypto`, which Go now documents as a legacy unsupported mechanism. Replaced it with Go 1.24+ native FIPS 140-3 build settings using `GOFIPS140`.
- The Dockerfile used Go 1.22 and installed OpenSSL in the runtime image, which does not make a Go binary use a validated FIPS module. Updated the image to Go 1.24 and enabled `GOFIPS140` at build time.
- The Argo CD TLS ConfigMap used the nonexistent key `server.tls.ciphersuites` and comma-separated ciphers. Corrected it to `server.tls.ciphers` with colon-separated values and added repo-server TLS keys.
- The Redis TLS ConfigMap used unsupported keys `redis.tls.enabled` and `redis.tls.minversion`. Replaced them with Argo CD Redis TLS command flags for the server, application controller, and repo-server.
- The SSH known-hosts example implied that `argocd-ssh-known-hosts-cm` restricts SSH key exchange algorithms. Replaced this with HTTPS repository guidance and an `argocd-tls-certs-cm` private CA example.
- The Linux FIPS mode section overstated OS-level FIPS mode as applying to all process cryptography. Clarified that applications still need FIPS-aware cryptographic modules.
- The ArgoCD custom resource used unsupported per-component fields such as `server.image`, `controller.image`, `server.tls`, and placeholder images that are not known official FIPS images. Replaced it with supported global image/version fields, operator command arguments, and Redis/repo TLS fields.
- The node FIPS audit command did not read the host filesystem from a node debug pod. Updated it to use `chroot /host`.
- The conclusion still referred to custom BoringCrypto builds. Updated it to custom Go FIPS builds.

## Review Notes
The guide is now technically consistent with Argo CD v2.13-era command parameters and current Go FIPS guidance. Operators should still confirm that their exact container images, Go module version, operating environment, and Redis image are covered by the relevant CMVP validation or vendor documentation before claiming compliance.
