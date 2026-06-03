# Validation Summary: How to Use ServiceAccount Token Rotation for Security Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes projected service account token volumes
- kubectl
- client-go
- Go
- Python requests
- GitHub Actions
- Bash and cron

## Sources Consulted
- Kubernetes documentation: Service Accounts - https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes documentation: Projected Volumes - https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes kubectl reference: kubectl create token - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes kubectl reference: kubectl wait - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes client-go source: rest.InClusterConfig and BearerTokenFile behavior - https://github.com/kubernetes/client-go/blob/master/rest/config.go
- Kubernetes client-go source: cached file token source behavior - https://github.com/kubernetes/client-go/blob/master/transport/token_source.go

## Issues Found
- The token watcher decoded the JWT payload using plain `base64 -d`, which is unreliable for JWT base64url payloads. Replaced it with Python base64url decoding.
- The post said kubelet refreshes exactly every 48 minutes. Updated this to the documented proactive refresh trigger: older than 80% of TTL or older than 24 hours.
- The Go client example imported `io/ioutil` without using it, which would not compile. Removed the unused import.
- The post said `rest.InClusterConfig()` reads the token file on each request. Updated this to reflect client-go's actual behavior: it configures `BearerTokenFile`, and current client-go versions periodically re-read the token file.
- The external token script implied `--duration=24h` guarantees a 24-hour token. Added a note that the API server may issue a shorter or longer lifetime depending on cluster configuration.
- The shell rotation examples used unquoted variables and `echo` for token output. Quoted command arguments and used `printf` for token file writes.
- The GitHub Actions example generated a token but did not configure kubectl to use it, and implied no bootstrap authentication was needed. Updated the example to configure a kubeconfig entry with the generated token and noted that initial authentication is still required.
- The long-lived token Secret example created a generic Secret containing a TokenRequest token, which is not a legacy long-lived service account token Secret. Replaced it with a `kubernetes.io/service-account-token` Secret with the required service account annotation.
- The monitoring example used deprecated `io/ioutil`. Updated it to use `os.ReadFile`.
- The fallback token wording implied any fallback token preserves continuity. Clarified that the fallback must be valid for the same audience and permissions.

## Review Notes
The article remains technically relevant. Long-lived service account token Secrets are still supported when manually created, but Kubernetes documentation explicitly recommends TokenRequest or token projection instead for most cases because static bearer tokens do not expire or rotate.
