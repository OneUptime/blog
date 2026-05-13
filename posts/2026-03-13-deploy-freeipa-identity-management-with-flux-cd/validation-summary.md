# Validation Summary: How to Deploy FreeIPA Identity Management with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- FreeIPA
- Kubernetes
- Flux CD
- Kustomize
- LDAP
- Kerberos
- Containerized systemd workloads

## Sources Consulted
- FreeIPA container README: https://github.com/freeipa/freeipa-container
- FreeIPA container Kubernetes example: https://github.com/freeipa/freeipa-container/blob/master/tests/freeipa-k8s.yaml
- FreeIPA installation documentation: https://www.freeipa.org/page/InstallAndDeploy
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes user namespaces documentation: https://kubernetes.io/docs/concepts/workloads/pods/user-namespaces
- Kubernetes Service protocol documentation: https://kubernetes.io/docs/reference/networking/service-protocols/

## Issues Found
- The original manifest used `freeipa/freeipa-server:fedora-40`, which is based on an old Fedora release. Changed the example to the canonical `quay.io/freeipa/freeipa-server:rocky-9` image path and a longer-lived base tag.
- The original Kubernetes prerequisites listed v1.26+, but current FreeIPA container Kubernetes guidance depends on pod user namespaces via `hostUsers: false`. Updated the prerequisite and manifest to include this requirement.
- The original install command passed `--hostname=ipa.example.com`. FreeIPA container documentation advises setting the container hostname or `IPA_SERVER_HOSTNAME` instead. Updated the manifest to use a Kubernetes FQDN, `setHostnameAsFQDN: true`, and `IPA_SERVER_HOSTNAME`.
- The original secret created separate admin and Directory Manager password values, but the container only consumed `PASSWORD`, which sets both passwords. The LDAP verification command used the unused DM password and would fail. Simplified the secret and updated verification to use the installed password.
- The original example enabled FreeIPA DNS without including the additional Kubernetes DNS/runtime requirements. Changed the minimal deployment to omit integrated DNS setup and clarified DNS as optional.
- The original service omitted Kerberos password-change port 464. Added TCP and UDP service and container ports for 464.
- The original readiness probe used HTTPS against the UI. The upstream Kubernetes example checks `systemctl status ipa`, which better matches the systemd-based FreeIPA container startup model. Updated the readiness probe accordingly.
- The original security context added Linux capabilities even though the current container documentation states privileged-style setup is not supported and the upstream Kubernetes example uses user namespaces and a read-only root filesystem. Updated the security context and best-practice note.
- The original backup recommendation used `ipa-backup --data`; the FreeIPA container documentation recommends backing up the persistent `/data` volume for container deployments. Updated the best-practice text.

## Review Notes
The Flux Kustomization API version and `healthChecks` usage are current. The example still requires environment-specific DNS planning for clients outside the cluster, especially for Kerberos, because FreeIPA service principals are hostname-sensitive.
