# Validation Summary: How to Rebuild an Entire Cluster from Git with Flux CD

## Status
validated

## Post Type
Tutorial / Guide (Disaster recovery runbook)

## Technologies Covered
- Flux CD (v2 / GitOps Toolkit)
- Kubernetes (kubectl)
- Kustomize / Kustomization controller (`kustomize.toolkit.fluxcd.io/v1`)
- Helm / HelmRelease (Flux helm-controller)
- Sealed Secrets (Bitnami)
- External Secrets Operator
- GitHub (as Git provider for Flux bootstrap)
- Bash scripting

## Sources Consulted
- Flux CD CLI reference — `flux bootstrap github`: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux CD CLI top-level reference: https://fluxcd.io/flux/cmd/flux/
- Flux CD CLI reference — `flux get all`: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux CD Kustomization API (`kustomize.toolkit.fluxcd.io/v1`): https://fluxcd.io/flux/components/kustomize/kustomizations/
- Bitnami Sealed Secrets repository and docs: https://github.com/bitnami-labs/sealed-secrets
- External Secrets Operator docs: https://external-secrets.io/

## Issues Found

1. **Invalid `--token-env` flag on `flux bootstrap github`.**
   - What was wrong: The post used `--token-env=GITHUB_TOKEN` in two places (the inline example and the recovery script). There is no `--token-env` flag on `flux bootstrap github`. The Flux CLI reads the `GITHUB_TOKEN` environment variable automatically.
   - Fix: Replaced the flag with an explicit `export GITHUB_TOKEN=<your-personal-access-token>` step before the bootstrap command. In the script, added a `: "${GITHUB_TOKEN:?...}"` guard to fail fast if it is unset, and removed the bogus flag.
   - Why: Calling `flux bootstrap github` with an unknown flag fails immediately, which would make the runbook unusable as written.

2. **`flux describe` is not a valid subcommand.**
   - What was wrong: Step 4 used `flux describe kustomization apps -n flux-system`. The Flux CLI has no `describe` subcommand (commands are `bootstrap`, `build`, `check`, `create`, `delete`, `diff`, `events`, `export`, `get`, `install`, `logs`, `reconcile`, `resume`, `stats`, `suspend`, `trace`, `tree`, `uninstall`, etc.).
   - Fix: Replaced with `kubectl describe kustomization apps -n flux-system` and added `flux events --for Kustomization/apps -n flux-system` as an alternative for viewing recent events.
   - Why: The original command exits with an "unknown command" error, defeating the purpose of the troubleshooting step.

## Review Notes
- The `sealed-secrets` deployment name in `kubectl rollout restart deployment sealed-secrets -n kube-system` is correct for the default Helm chart install, but the upstream manifest install (`controller.yaml` release artifact) names the deployment `sealed-secrets-controller`. Readers using the manifest install should adjust the name accordingly. Left as-is since both are common.
- `flux get all -A --watch` is valid (`--watch` is an inherited flag on `flux get` commands).
- The example smoke-test Kustomization uses `apiVersion: kustomize.toolkit.fluxcd.io/v1`, which is the current stable Flux v2 API version.
- `flux reconcile kustomization flux-system --with-source` is correct and triggers reconciliation of the source first.
- The `--personal` flag combined with `--owner=my-org` in the example is slightly inconsistent (`--personal` implies the owner is a GitHub user, not an organization). Left as-is because the example is illustrative and the placeholder name is generic; readers should drop `--personal` if their owner is actually an org.
- Recovery time estimates (e.g., "under an hour") will depend heavily on cluster size, image pull bandwidth, and PVC restore strategy — the post correctly avoids over-promising.
