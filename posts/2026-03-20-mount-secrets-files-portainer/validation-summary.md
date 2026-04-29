# Validation Summary: How to Mount Secrets as Files in Portainer

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Kubernetes (Pod spec, Secrets, Volumes)
- kubectl CLI (create secret tls, create secret generic, exec)
- Portainer (Kubernetes deployment UI)
- TLS / OpenSSL
- YAML configuration

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Secret volume reference (SecretVolumeSource API): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.30/#secretvolumesource-v1-core
- kubectl create secret tls reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-secret-tls-em-
- kubectl create secret generic reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-secret-generic-em-
- Kubernetes documentation on mounted Secrets and automatic updates: https://kubernetes.io/docs/concepts/configuration/secret/#mounted-secrets-are-updated-automatically
- Portainer Kubernetes documentation: https://docs.portainer.io/user/kubernetes
- OpenSSL x509 command reference: https://docs.openssl.org/master/man1/openssl-x509/

## Issues Found
No technical issues found.

## Review Notes
- The `defaultMode: 0400` and `mode: 0400` notation follows the Kubernetes documentation convention. While YAML 1.2 strictly parses `0400` as decimal 400, the Kubernetes Go-YAML parser interprets the leading-zero notation as octal (yielding 256, i.e., owner read-only). This matches the official Kubernetes examples and the inline comments in the post.
- The post's claim that mounted Secrets update automatically is correct, but it should be noted that Secrets mounted as `subPath` volumes do NOT receive updates — this caveat isn't mentioned, though the post doesn't use subPath in any of the examples.
- Portainer UI menu names (e.g., "Volumes", "Persistent storage", "Add volume", "Secret" type) may vary slightly across Portainer Business Edition / Community Edition versions, but the described workflow is consistent with current Portainer Kubernetes deployment screens.
- The TLS Secret example correctly assumes the standard `kubernetes.io/tls` type, where Kubernetes enforces the keys `tls.crt` and `tls.key`.
