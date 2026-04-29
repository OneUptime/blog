# Validation Summary: How to Rotate K3s Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- TLS / X.509 certificates
- `kubectl`
- `openssl`
- `systemd`

## Sources Consulted
- K3s certificate CLI documentation: https://docs.k3s.io/cli/certificate
- K3s cluster access documentation: https://docs.k3s.io/cluster-access
- K3s token CLI documentation: https://docs.k3s.io/cli/token
- K3s quick-start guide: https://docs.k3s.io/quick-start
- Kubernetes PKI Certificates and Requirements: https://kubernetes.io/docs/setup/best-practices/certificates/

## Issues Found
- The introduction and automatic-rotation section used the older 90-day renewal window. Updated both to the current K3s behavior: client and server certificates are valid for 365 days and are automatically renewed on restart when expired or within 120 days of expiry.
- The expiration-check section used a filesystem loop as the primary method. Updated it to use `k3s certificate check --output table`, which is the documented K3s command and correctly reports certificate-chain information from bundled certificate files.
- The manual rotation examples used unsupported service names such as `kube-apiserver`, `kube-scheduler`, and `kube-controller-manager`. Replaced them with the current supported names `api-server`, `scheduler`, and `controller-manager`, and updated the multi-service example to use the documented `--service <SERVICE>,<SERVICE>` format.
- The manual rotation section said `k3s certificate rotate` regenerates all certificates. Corrected that wording to client and server certificates, because CA rotation uses the separate `k3s certificate rotate-ca` workflow.
- The CA rotation section documented deleting `/var/lib/rancher/k3s/server/tls` to force regeneration. Replaced it with the official self-signed CA rotation workflow using `rotate-default-ca-certs.sh` and `k3s certificate rotate-ca --path=...`, because current K3s documentation explicitly warns not to overwrite or remove the in-use TLS directory.
- The CA rotation section instructed readers to read a token from `node-token` and rewrite a specific agent env file directly. Updated it to match the documented behavior: use the updated token values produced by the CA-rotation workflow and update whatever `.env`, systemd unit, or `config.yaml` location the node actually uses before restarting servers first and then agents.

## Review Notes
- The post now reflects current K3s certificate behavior as documented on April 29, 2026. K3s changed the automatic warning and renewal threshold from 90 days to 120 days in the May 2025 release line, so older tutorials may still show the previous value.
- Refreshing copied kubeconfig files after certificate renewal or rotation remains important because K3s updates the admin kubeconfig on the server at startup, but copied local files are not updated automatically.
