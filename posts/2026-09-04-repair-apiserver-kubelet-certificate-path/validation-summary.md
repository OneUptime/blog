# Validation Summary: `kubectl get` Works but `logs` and `exec` Fail: Repair the API Server-to-Kubelet Certificate Path

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- Kubernetes, kubectl, kube-apiserver, kubelet, and kubeadm
- TLS, X.509 certificates, certificate signing requests, SANs, and certificate rotation
- RBAC, webhook authentication, and webhook authorization
- Control-plane networking, Konnectivity, and streaming protocols
- OpenSSL, shell commands, jq, and systemd journals

## Sources Consulted
- Kubernetes control-plane communication: https://kubernetes.io/docs/concepts/architecture/control-plane-node-communication/
- kube-apiserver flags: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubelet authentication and authorization: https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/
- Kubernetes PKI requirements: https://kubernetes.io/docs/setup/best-practices/certificates/
- kubeadm certificate management: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/
- Kubernetes ports: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- KubeletConfiguration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubelet configuration precedence: https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/
- CSR signer requirements: https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/
- kubectl authorization checks: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl port-forward: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- kubectl JSONPath: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes streaming transition: https://kubernetes.io/blog/2024/08/20/websockets-transition/
- Kubernetes address-selection implementation: https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/util/node/node.go
- kubeadm API-server arguments: https://github.com/kubernetes/kubernetes/blob/v1.35.0/cmd/kubeadm/app/phases/controlplane/manifests.go
- OpenSSL s_client: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL x509: https://docs.openssl.org/3.0/man1/openssl-x509/
- OpenSSL req: https://docs.openssl.org/3.0/man1/openssl-req/
- OpenBSD nc: https://man.openbsd.org/nc
- jq manual: https://jqlang.org/manual/

## Issues Found
1. **Incorrect RBAC check syntax.** `pods/log` and `pods/exec` in `kubectl auth can-i` are interpreted as resource/name. Changed these to `pods --subresource=log` and `pods --subresource=exec` so the checks target the intended permissions.
2. **Misleading secrecy and timeout claim.** Limiting logs to ten lines does not prevent secrets from appearing, and a request timeout is not a universal command-duration limit. Clarified the per-request timeout, the requirement for non-sensitive logs, and the information exposed by verbose output.
3. **Deployment-specific manifest path presented as universal.** The static Pod manifest path is appropriate for kubeadm-style installations, not every self-managed control plane. Scoped the instruction and required comparison with the running configuration.
4. **Ambiguous address selection and SAN scope.** “First usable” implied reachability-based selection, and the wording suggested every kubelet needed the same address in its certificate. Clarified first matching address selection, lack of connection-failure fallback, and matching the selected node's own serving certificate.
5. **Incomplete bootstrap activation prerequisites.** Added the required serving-certificate feature, existing kubeadm configuration updates and kubelet restart, and the need for a signer. Preserved the correct distinction between client rotation and serving bootstrap.
6. **Incomplete CSR inspection output.** Added the CSR object's YAML so readers can inspect authenticated requestor metadata, signer, groups, and usages alongside the decoded PKCS#10 request. The decoded request alone does not contain all Kubernetes CSR metadata.
7. **Configuration inspection omitted nested values and overrides.** The grep expression omitted values such as `enabled` and authorization `mode`. Replaced it with reading the configuration and clarified that process arguments and drop-ins can override the file.
8. **Ineffective streaming timeout advice.** The kubelet configuration reference marks `streamingConnectionIdleTimeout` deprecated with no effect. Replaced the recommendation with checking runtime streaming timeouts and explicitly noted the deprecated field.

## Review Notes
- The central distinction between the user-to-API-server hop and the API-server-to-kubelet hop is correct. Serving trust and the API server's client identity are separate certificate concerns.
- The six Kubernetes documentation links in the post resolve to the intended resources. OpenSSL certificate inspection and verification flags are supported by the consulted OpenSSL 3.0 reference.
- The address order shown is kubeadm's configured order, not the kube-apiserver binary default. The example kubelet CA path must contain the actual trusted serving signer CA and be accessible inside each API-server container.
- Serving CSR approval requires trusted node/SAN ownership verification. Approval and signing are separate steps; approval alone does not guarantee issuance. Serving rotation requires continued monitoring and approval handling.
- Fine-grained kubelet authorization and streaming protocol behavior depend on the installed Kubernetes versions and feature configuration. No new release-specific guarantees were added based on the moving documentation site's version banner.
- Examples assume suitable permissions, existing Pods, Linux kubeadm paths where stated, an installed `true` executable in the target container, and an application listening on port 8080 for the port-forward example. Forwarded traffic must actually be exercised to verify the application path.
- Review used official documentation and upstream source inspection. Shell blocks were syntax-checked after replacing illustrative CSR placeholders. No live cluster, certificate renewal, CSR approval, or network connectivity test was performed; environment-dependent success is not claimed.
