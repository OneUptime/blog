# Validation Summary: How to Build Developer Onboarding Scripts That Auto-Configure Kubernetes Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl
- Helm
- Krew
- Bash scripting
- Node.js
- Express
- VS Code Kubernetes and YAML extensions
- Homebrew and apt-based Linux tooling

## Sources Consulted
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes Linux kubectl installation guide: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Kubernetes RBAC authorization guide: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Helm installation documentation: https://helm.sh/docs/v3/intro/install/
- Krew installation documentation: https://krew.sigs.k8s.io/docs/user-guide/setup/install/
- Krew plugin installation documentation: https://krew.sigs.k8s.io/docs/user-guide/installing-plugins/
- GNU Bash Reference Manual: https://www.gnu.org/software/bash/manual/bash.html
- Node.js child_process documentation: https://nodejs.org/api/child_process.html
- Node.js release and end-of-life documentation: https://nodejs.org/en/about/releases/ and https://nodejs.org/en/about/eol
- NodeSource Node.js 22 setup script: https://github.com/nodesource/distributions/blob/master/scripts/deb/setup_22.x
- React Create React App deprecation notice: https://react.dev/blog/2025/02/14/sunsetting-create-react-app
- Vue CLI maintenance mode notice: https://cli.vuejs.org/guide/creating-a-project.html
- K9s installation documentation: https://github.com/derailed/k9s
- Stern installation documentation: https://github.com/stern/stern

## Issues Found
- The base onboarding script always called `main` at the end, so sourcing it from a team-specific script would run the full onboarding flow before the team-specific override. I changed the base function to `onboard_developer_main` and guarded execution with `if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then ... fi`, which is the standard Bash pattern for scripts that can also be sourced.
- The frontend-specific script attempted to call `onboard-developer.sh::main`, which was not defined in the base script. I changed it to call `onboard_developer_main`.
- The frontend tooling installed Node.js 18, which is end-of-life as of this review date. I updated the examples to Node.js 22 using `node@22` on Homebrew and `setup_22.x` from NodeSource for Debian/Ubuntu systems.
- The frontend tooling installed `create-react-app` and `@vue/cli`, both of which are no longer recommended for new projects. I replaced them with `vite` and `create-vue` while keeping the same intent of installing frontend project tooling.
- The Express example used `child_process.exec` with a shell command built from request body data. I changed it to `execFile(scriptPath, [email, name, team], ...)`, which passes arguments without spawning a shell by default.

## Review Notes
- The Kubernetes namespace, label, ResourceQuota, RoleBinding, kubeconfig merge, context, and Krew examples match the current official command references.
- The Linux kubectl install snippet follows the official amd64 example, but a production onboarding script should detect CPU architecture rather than assuming amd64.
- The sample onboarding API URLs use company placeholder domains and are plausible examples, not publicly verifiable endpoints.
