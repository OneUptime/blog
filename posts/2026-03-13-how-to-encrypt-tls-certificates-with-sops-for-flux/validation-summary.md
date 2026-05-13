# Validation Summary: How to Encrypt TLS Certificates with SOPS for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization SOPS decryption
- Kubernetes Secrets
- Kubernetes TLS Secret type
- Kubernetes Ingress TLS configuration
- SOPS
- age encryption keys
- kubectl
- OpenSSL

## Sources Consulted
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl `create secret tls` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-v1/
- SOPS official documentation: https://github.com/getsops/sops
- ingress-nginx TLS documentation for controller default certificates: https://kubernetes.github.io/ingress-nginx/user-guide/tls/

## Issues Found
- The wildcard TLS certificate section said to deploy the certificate in a shared namespace and reference it from multiple Ingress resources. Standard Kubernetes Ingress `spec.tls[].secretName` is a namespaced reference, so that wording could incorrectly imply cross-namespace Secret references are supported. Updated the sentence to say the TLS Secret must be deployed in each namespace where Ingress resources reference it, and noted that cluster-wide fallback certificates are ingress-controller-specific.

## Review Notes
- The `kubectl create secret tls` command uses current flags and correctly requires PEM-encoded certificate and key files.
- The `kubernetes.io/tls` Secret examples correctly use `tls.crt` and `tls.key` under `data` or `stringData`.
- The Flux Kustomization `spec.decryption.provider: sops` and `secretRef.name` fields are current for Flux kustomize-controller.
- The SOPS `.sops.yaml` `creation_rules`, `path_regex`, `age`, and `encrypted_regex` usage is consistent with SOPS and Flux guidance. Flux documentation specifically recommends leaving `apiVersion`, `kind`, and `metadata` unencrypted and encrypting only `data` or `stringData`.
- Kubernetes documents that `stringData` does not work well with server-side apply. The examples are still valid Kubernetes Secret manifests, but using `data` may be preferable for workflows that rely heavily on server-side apply ownership behavior.
