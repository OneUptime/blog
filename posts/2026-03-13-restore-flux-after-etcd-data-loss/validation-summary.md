# Validation Summary: How to Restore Flux State After etcd Data Loss

## Status
validated

## Post Type
Tutorial / Disaster Recovery Runbook

## Technologies Covered
- etcd (snapshot backup/restore)
- Kubernetes (API server, control plane)
- Flux CD (bootstrap, reconciliation, GitRepository, Kustomization)
- Sealed Secrets (Bitnami)
- AWS S3 (snapshot storage)
- Kubernetes CronJob (automated backups)

## Sources Consulted
- Flux CLI bootstrap reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux CLI get reference: https://fluxcd.io/flux/cmd/flux_get_all/
- etcd disaster recovery guide: https://etcd.io/docs/v3.5/op-guide/recovery/
- Bitnami Sealed Secrets project: https://github.com/bitnami-labs/sealed-secrets
- Flux Kustomization controller reconciliation docs (fluxcd.io)

## Issues Found

1. **Invalid `--token-env` flag in `flux bootstrap github`** — The post used `--token-env=GITHUB_TOKEN`, which is not a valid flag in the Flux CLI. Flux reads the token from the `GITHUB_TOKEN` environment variable automatically, and `--token-auth` is the actual flag used to switch from SSH deploy key to PAT-based authentication. Changed the example to export `GITHUB_TOKEN` and pass `--token-auth`.

2. **Incorrect Sealed Secrets re-sync procedure** — The post annotated `SealedSecret` objects with `sealedsecrets.bitnami.com/managed=true` to "force a re-sync". That annotation is intended to be applied to existing `Secret` objects (to tell the controller to take ownership of them) and does not trigger a re-sync on SealedSecret resources. According to the Sealed Secrets documentation, after restoring the master sealing key from backup the correct action is to restart the controller so it reloads the keys. Replaced the annotate loop with `kubectl rollout restart deployment/sealed-secrets-controller -n kube-system`.

## Review Notes

- `etcdctl snapshot restore` still works in current etcd releases but is being moved to a separate binary, `etcdutl`, in etcd 3.5+ (and the etcdctl variant emits a deprecation warning). The post's command remains functional, so it was left as-is, but readers on newer etcd versions may want to substitute `etcdutl snapshot restore`.
- `sudo systemctl restart kube-apiserver` only applies to clusters where the API server runs as a systemd unit (e.g., manual installs, some distros). On kubeadm-based clusters the API server is a static pod managed by kubelet — restarting it requires moving the manifest out of `/etc/kubernetes/manifests/` and back, or `crictl` against the running container. The post hedges with "(control plane nodes)", so the wording is acceptable but worth flagging.
- The Step 6 CronJob is illustrative — it would need `hostPath` volume mounts for `/etc/etcd` (certs) and AWS credentials (env vars, IRSA, or instance role) to actually run successfully. As an example pattern this is fine, but a copy-paste deployment would fail. Not corrected, since adding the missing pieces would change the scope of the example significantly.
- `flux get all -A --watch` is valid: the `--watch` (`-w`) flag is inherited from the parent `flux get` command (verified against the Flux CLI reference).
