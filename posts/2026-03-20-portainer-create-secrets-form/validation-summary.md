# Validation Summary: How to Create Secrets via Form in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes Secrets
- `kubectl`
- AWS CLI for Amazon ECR
- OpenSSL
- Kubernetes RBAC
- Kubernetes audit logging

## Sources Consulted
- Portainer documentation: Add a Secret - https://docs.portainer.io/user/kubernetes/configurations/add-1
- Portainer documentation: Kubernetes cluster setup - https://docs.portainer.io/user/kubernetes/cluster/setup
- Kubernetes documentation: Secrets - https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes reference: `kubectl create secret docker-registry` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes reference: `kubectl create secret tls` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes reference: `kubectl get` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: Define Environment Variables for a Container - https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes documentation: Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- AWS CLI reference: `aws ecr get-login-password` - https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- OpenSSL documentation: `openssl req` - https://docs.openssl.org/3.6/man1/openssl-req/

## Issues Found
- The Portainer navigation step used `+ Add Secret`, but current Portainer docs label this action `Add with form`. I updated the button text to match the documented UI.
- The secret type list described `kubernetes.io/service-account-token` without noting that it is a legacy mechanism. I marked it as legacy to align with current Kubernetes guidance.
- The sentence about Portainer “automatically base64-encoding” values was too specific about implementation details. I changed it to the more accurate statement that Portainer handles Kubernetes' required encoding.
- The Docker registry section treated the email field as mandatory and used a Docker Hub `kubectl` example with `--docker-server=docker.io`. I marked email as optional and changed the Docker Hub command to use the documented default server behavior instead.
- The Amazon ECR example omitted the region from `aws ecr get-login-password`. I added `--region us-east-1` because AWS documents that the password request should use the same region as the registry.
- The self-signed TLS example created a certificate without a Subject Alternative Name. I added `-addext "subjectAltName = DNS:example.com"` so the certificate is usable with modern TLS clients.
- The “view all keys” command piped `kubectl` output that is not guaranteed to be valid JSON into `python3 -m json.tool`. I replaced it with a supported `kubectl -o go-template` command that reliably prints secret keys.
- The Deployment manifest was incomplete for `apps/v1` because it lacked `spec.selector` and matching pod labels. I added the required selector and labels so the manifest is valid.
- The secret rotation section claimed updates happen “without downtime” and gave an overly specific propagation time for mounted Secrets. I changed the wording to describe a rollout accurately and noted that mounted Secret updates depend on kubelet detection and do not apply to `subPath` mounts.
- The audit recommendation used `kubectl get events` as if it were an audit trail for Secret access. I replaced it with the correct kube-apiserver audit logging guidance and flags.

## Review Notes
- `kubectl` is not installed in this workspace, so `kubectl` command syntax was verified against the current official Kubernetes reference rather than local `--help` output.
- The self-signed certificate example is appropriate for testing, but production TLS should use a certificate issued by a trusted CA and SANs that match the real hostnames.
