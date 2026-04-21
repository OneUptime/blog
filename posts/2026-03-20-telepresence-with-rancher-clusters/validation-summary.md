# Validation Summary: How to Use Telepresence with Rancher Clusters - With Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Telepresence
- Kubernetes
- kubectl
- Helm-based Traffic Manager installation
- Local development and debugging

## Sources Consulted
- Telepresence Client Installation: https://telepresence.io/docs/install/client
- Telepresence Install Traffic Manager: https://telepresence.io/docs/install/manager
- Telepresence `helm install` CLI reference: https://telepresence.io/docs/reference/cli/telepresence_helm_install
- Telepresence `connect` CLI reference: https://telepresence.io/docs/reference/cli/telepresence_connect
- Telepresence `intercept` CLI reference: https://telepresence.io/docs/reference/cli/telepresence_intercept
- Telepresence workload engagement and HTTP header intercept documentation: https://telepresence.io/docs/reference/engagements/cli
- Telepresence DNS resolution documentation: https://telepresence.io/docs/reference/dns
- Telepresence environment variables documentation: https://telepresence.io/docs/reference/environment
- Rancher cluster access with kubectl and kubeconfig: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The macOS install command used the older `datawire/blackbird` Homebrew tap. Updated it to the current official `telepresenceio/telepresence/telepresence-oss` Homebrew command.
- The Linux install command used an older `app.getambassador.io` download path. Updated it to the current official GitHub release artifact URL for the Linux AMD64 binary and used `sudo` for writing to `/usr/local/bin`.
- The Traffic Manager install snippet said it was connecting Telepresence to the cluster and did not pass the Rancher kubeconfig shown later in the post. Updated the comment and added `--kubeconfig ~/.kube/rancher-production.yaml` to the Telepresence and kubectl commands so the commands target the intended Rancher cluster.
- The local debugging snippet claimed cluster environment variables are automatically available in the current shell and used non-exported shell assignments. Updated the snippet to explicitly export the settings the local process needs.

## Review Notes
- Header-based intercepts with `--http-header` are current Telepresence functionality, but they require a Telepresence version that supports HTTP-filtered intercepts.
- The intercept examples assume the `order-service` workload and service can be matched by Telepresence. If a real cluster uses different workload and service names, the command should include `--workload` or `--service` as appropriate.
