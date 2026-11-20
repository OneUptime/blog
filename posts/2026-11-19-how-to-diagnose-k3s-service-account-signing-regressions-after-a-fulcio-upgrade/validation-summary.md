# Validation Summary: How to Diagnose K3s Service Account Signing Regressions After a Fulcio Upgrade

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- Sigstore Fulcio and certificate issuance
- K3s and Kubernetes service accounts
- OpenID Connect (OIDC), JWT audiences, discovery, and JWKS
- Kubernetes RBAC, projected tokens, and TLS trust
- kubectl, jq, and shell file checks

## Sources Consulted
- [Fulcio issue 2355: K3s regression and reproducer](https://github.com/sigstore/fulcio/issues/2355)
- [Fulcio releases](https://github.com/sigstore/fulcio/releases)
- [Fulcio 1.8.7 release notes](https://github.com/sigstore/fulcio/releases/tag/v1.8.7)
- [Fulcio 1.8.6 configuration implementation](https://raw.githubusercontent.com/sigstore/fulcio/v1.8.6/pkg/config/config.go)
- [Fulcio 1.8.7 configuration implementation](https://raw.githubusercontent.com/sigstore/fulcio/v1.8.7/pkg/config/config.go)
- [Current Fulcio configuration implementation](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go)
- [Fulcio server flags](https://raw.githubusercontent.com/sigstore/fulcio/main/cmd/app/serve.go)
- [Fulcio Kubernetes certificate identity implementation](https://raw.githubusercontent.com/sigstore/fulcio/main/pkg/identity/kubernetes/principal.go)
- [Fulcio security advisory GHSA-f5mr-q85p-6hh6](https://github.com/sigstore/fulcio/security/advisories/GHSA-f5mr-q85p-6hh6)
- [Kubernetes service-account configuration, projection, and issuer discovery](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [kubectl exec reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [OpenID Connect Discovery 1.0, sections 4.3 and 5](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [jq manual](https://jqlang.org/manual/)
- Local Bash built-in documentation: `/bin/bash -c 'help test'`.

## Issues Found
- The introduction to the file-check command claimed that existence checks establish whether files are mounted. The command actually uses `test -r`, which checks readability and cannot distinguish a volume-mounted file from a file provided another way. Reworded the sentence to describe readability and its limitation. The command itself is correct and unchanged.

## Review Notes
- Confirmed the historical version boundary in both tagged source and release notes: 1.8.6 restricted the in-cluster path to the literal default issuer; 1.8.7 restored it for directly configured Kubernetes issuers.
- Confirmed the distinction between requester tokens and discovery credentials, projected token audiences, exact issuer matching, the YAML configuration field names, `--config-path`, and both credential file paths.
- Direct configuration is a trust decision: the restored path can attach local credentials to a directly configured Kubernetes issuer when the default issuer condition is satisfied. Operators must ensure such entries identify their intended local API server; direct configuration alone does not establish that an endpoint is local.
- Confirmed that Kubernetes certificate identities use a URI SAN and preserve the token issuer in a certificate extension. Checking both identity and issuer is appropriate.
- The advisory identifies versions through 1.8.5 as affected and 1.8.6 as its patch. The post correctly treats 1.8.7 as a historical compatibility fix and recommends a supported release with subsequent security fixes. The release listing also contains newer releases, including 1.10.1; no claim that 1.8.7 is current was introduced.
- All referenced links identify the intended official resources. The upstream main-branch source is mutable, so the instruction to inspect the deployed version remains important.
- Checked kubectl flags and resource forms against official references, parsed both shell examples with Bash, and exercised both jq filters with representative JSON. No deprecated syntax was identified.
- The commands assume the namespace, Deployment, and container names shown exist, and the exec example requires a shell. Deployment-based logs and exec select a pod rather than inspecting every replica.
- No live K3s/Fulcio deployment was used: discovery, TLS authentication, issuance, and artifact verification were reviewed against documentation and source rather than executed end to end.
