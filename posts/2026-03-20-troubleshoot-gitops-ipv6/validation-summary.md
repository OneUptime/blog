# Validation Summary: How to Troubleshoot GitOps IPv6 Connectivity Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- IPv6 networking
- GitOps
- Argo CD
- Flux CD source-controller and GitRepository
- Kubernetes and kubectl
- OpenSSL
- OpenSSH known_hosts and ssh-keyscan
- Calico and Cilium CNI IPv6 configuration

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Node status documentation: https://kubernetes.io/docs/reference/node/node-status
- Argo CD private repository documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/declarative-setup/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI reconcile source git reference: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- OpenSSH ssh, sshd, and ssh-keyscan manual pages: https://man.openbsd.org/ssh, https://man.openbsd.org/sshd.8, https://man.openbsd.org/ssh-keyscan
- OpenSSL s_client and req documentation: https://docs.openssl.org/master/man1/openssl-s_client/ and https://docs.openssl.org/3.4/man1/openssl-req/
- RFC 3849, IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 3986, URI IPv6 literal syntax: https://datatracker.ietf.org/doc/rfc3986/
- Calico IPv6 and FelixConfiguration documentation: https://docs.tigera.io/calico/latest/networking/ipam/ipv6 and https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Cilium Kubernetes configuration documentation: https://docs.cilium.io/en/latest/network/kubernetes/configuration/

## Issues Found
1. Invalid IPv6 example address: Replaced `2001:db8::git` with `2001:db8::10`. The `2001:db8::/32` prefix is correct for documentation, but `git` is not valid hexadecimal IPv6 text.

2. Overly narrow pod IPv6 requirement: Changed "global IPv6 address" to "usable non-link-local IPv6 address (global or ULA)" because private IPv6 ULA addresses can be valid in internal GitOps environments.

3. Incorrect node IPv6 check: Replaced a YAML/grep pipeline looking for the literal word `ipv6` with a JSONPath command that prints node `InternalIP` and `ExternalIP` values. Kubernetes node addresses are reported as address values, not with an `ipv6` label.

4. Overspecific TLS error explanation: Changed the generic `SSL certificate problem` explanation from only "missing IPv6 SAN" to "TLS trust or SAN problem" because CA trust, expiry, hostname mismatch, and SAN issues can all produce TLS failures.

5. Incorrect Argo CD TLS trust store: Changed `argocd-cm` / `tls.certs.data` to `argocd-tls-certs-cm` with the Git server hostname as the ConfigMap data key, matching Argo CD's documented TLS certificate storage.

6. Incorrect Argo CD SSH known_hosts storage: Replaced repository-secret `knownHosts` commands with `argocd-ssh-known-hosts-cm` and `argocd cert add-ssh --batch`, matching Argo CD's documented SSH known hosts handling.

7. Incorrect IPv6 known_hosts guidance: Updated the known_hosts examples to use a raw IPv6 literal for default SSH port 22 and `[ipv6]:port` only for non-standard ports, matching OpenSSH known_hosts format.

8. Incorrect ssh-keyscan formatting pipeline: Removed the awk wrapper that could produce malformed host fields and now uses `ssh-keyscan` output directly, which is already in known_hosts format.

9. Fragile diagnostic script pod selection: Replaced a Flux-specific `app=source-controller` pod label selector with `deployment/source-controller`, which matches documented `kubectl exec TYPE/NAME` usage and avoids relying on a label that may not exist.

## Review Notes
- The commands are diagnostically correct but assume the target controller images contain tools such as `curl`, `ssh`, `nslookup`, and `ip`; minimal production images may require a debug pod instead.
- `2001:db8::10` is intentionally non-routable documentation space and must be replaced with the reader's real Git server IPv6 address.
