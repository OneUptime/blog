# Validation Summary: How to Implement ArgoCD Autopilot

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- ArgoCD
- ArgoCD Autopilot (argoproj-labs/argocd-autopilot)
- GitOps
- Kubernetes
- Kustomize
- Helm
- GitHub Actions
- GitLab CI
- ArgoCD Notifications

## Sources Consulted
- ArgoCD Autopilot official docs: https://argocd-autopilot.readthedocs.io/en/stable/
- ArgoCD Autopilot Installation Guide: https://argocd-autopilot.readthedocs.io/en/stable/Installation-Guide/
- ArgoCD Autopilot command reference (GitHub `docs/commands/`):
  - `argocd-autopilot_repo_bootstrap.md`
  - `argocd-autopilot_project_create.md`
  - `argocd-autopilot_application_create.md`
- ArgoCD Autopilot source: https://github.com/argoproj-labs/argocd-autopilot (`pkg/application/application.go`)
- ArgoCD Autopilot latest release (v0.4.20) asset list via GitHub API
- ArgoCD CLI docs: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Homebrew formula API for `argocd-autopilot`

## Issues Found

1. **Linux installation — wrong binary name after extraction.** The original `sudo mv argocd-autopilot /usr/local/bin/` fails because the tarball extracts a file named `argocd-autopilot-linux-amd64`. Replaced with `sudo mv ./argocd-autopilot-* /usr/local/bin/argocd-autopilot`, matching the official install script. Also quoted `"$VERSION"` to match the official command.

2. **Windows installation — non-existent `.exe` artifact.** The PowerShell snippet downloaded `argocd-autopilot-windows-amd64.exe`, but no such asset exists in any release — only `argocd-autopilot-windows-amd64.tar.gz`. The official docs recommend Scoop, Chocolatey, or WSL. Replaced the snippet with the documented `scoop install argocd-autopilot` / `choco install argocd-autopilot` commands.

3. **`project create --dest-namespace` is not a real flag.** The example used `argocd-autopilot project create staging --dest-kube-context staging-cluster --dest-namespace "staging-*"`, but `--dest-namespace` exists only on `app create`, not `project create` (verified against `argocd-autopilot_project_create.md`). Removed the `--dest-namespace` flag from the example.

4. **`app create --type helm` and `--helm-set` do not exist.** The CLI `--type` flag accepts only `kustomize|dir` (verified from both the help text and the source: `cmd.Flags().StringVar(&opts.AppType, "type", "", "The application type (kustomize|dir)")` and the supported switch cases in `application.go`). There is no `--helm-set` flag. The original Helm example would fail outright. Rewrote the example to deploy a Helm chart the way Autopilot actually supports it — through a Kustomize source that uses Kustomize's `helmCharts` inflation — and added a brief explanation of the constraint.

## Review Notes
- The post uses `patchesStrategicMerge` in Kustomize overlays. This field still works but has been deprecated in favor of the unified `patches` field since Kustomize 5.0 (2023). Not changed because the snippet still functions correctly.
- The Lua health-check snippet for Ingress omits `hs.message`, which is optional but conventional. Not changed.
- The custom ArgoCD install example pins `v2.9.0` of ArgoCD. That's an older release; readers should substitute a current stable version when adopting this guide. Not changed because the post explicitly frames it as a "modify the installation" example rather than a recommendation.
- The `argocd app get my-app --refresh` snippet is captioned "Force refresh"; `--refresh` does a normal refresh while `--hard-refresh` is the truly "forced" form. Functional, just slightly imprecise wording — left as-is.
- Bitnami chart URL referenced in the rewritten Helm example uses the public Bitnami repo; readers on a current setup may want to point at their own mirror given recent changes to Bitnami's public catalog.
