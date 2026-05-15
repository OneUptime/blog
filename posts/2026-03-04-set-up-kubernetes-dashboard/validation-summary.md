# Validation Summary: How to Set Up Kubernetes Dashboard on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Kubernetes
- Kubernetes Dashboard
- kubectl
- Helm
- firewalld
- Kubernetes RBAC and service accounts

## Sources Consulted
- Kubernetes documentation: Deploy and Access the Kubernetes Dashboard, https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Kubernetes documentation: Install and Set Up kubectl on Linux, https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Kubernetes kubectl reference: port-forward and create token, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes documentation: Service Accounts, https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes documentation: Managing Service Accounts, https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes Dashboard sample user guide, https://github.com/kubernetes-retired/dashboard/blob/master/docs/user/access-control/creating-sample-user.md
- Helm documentation: Installing Helm, https://helm.sh/docs/intro/install/
- firewalld documentation: firewall-cmd, https://firewalld.org/documentation/utilities/firewall-cmd.html
- Red Hat Enterprise Linux documentation: Using and configuring firewalld, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/using-and-configuring-firewalld_configuring-and-managing-networking

## Issues Found
- The original article used placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`; these commands would not install or configure Kubernetes Dashboard. Replaced them with current `kubectl`, Helm, and Kubernetes Dashboard commands.
- The original article treated Dashboard as a RHEL systemd service. Kubernetes Dashboard is deployed into a Kubernetes cluster, so the post now uses Helm, `kubectl wait`, and `kubectl port-forward`.
- The original article omitted the current Kubernetes documentation warning that Kubernetes Dashboard is deprecated and unmaintained. Added that caveat in the overview and security notes.
- The original article used generic firewall service commands. Dashboard port-forwarding binds to localhost by default, so the post now explains that no firewall opening is needed for local access and uses `--add-port=8443/tcp` only for an explicitly network-bound port-forward.
- The original article did not explain Dashboard login. Added verified RBAC service account and `kubectl create token` commands, with a note to avoid `cluster-admin` for production use.
- The original article used systemd and process-level monitoring commands for a Kubernetes workload. Replaced them with `kubectl get`, `kubectl logs`, and `kubectl top` commands.

## Review Notes
Kubernetes Dashboard is deprecated and the upstream repository is archived. The corrected post is technically valid for users who still need Dashboard, but future content should prefer a maintained alternative such as Headlamp for new installations.
