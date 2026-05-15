# How to Set Up Kubernetes Dashboard on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, Container, Monitoring, Linux

Description: Learn how to set Up Kubernetes Dashboard on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Set Up Kubernetes Dashboard on RHEL. Following these steps will help you deploy and access the Dashboard from a RHEL workstation or server that can reach your Kubernetes cluster.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- An existing Kubernetes cluster
- A kubeconfig file that lets `kubectl` communicate with the cluster

## Overview

Set Up Kubernetes Dashboard requires careful planning and execution. Kubernetes Dashboard is deprecated and no longer actively maintained, so consider Headlamp for new installations. If you still need Dashboard, the supported installation method is Helm, and access should be limited to a local port-forward or another trusted network path.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y ca-certificates curl
```

## Step 2: Install Required Packages

Install `kubectl` from the Kubernetes RPM repository:

```bash
cat <<EOF | sudo tee /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.36/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.36/rpm/repodata/repomd.xml.key
EOF

sudo dnf install -y kubectl
```

Install Helm:

```bash
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-4
chmod 700 get_helm.sh
./get_helm.sh
```

Verify the installation:

```bash
kubectl version --client
helm version
```

## Step 3: Configure the Service

Add the Kubernetes Dashboard Helm repository and deploy the Dashboard into its own namespace:

```bash
helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/
helm repo update
helm upgrade --install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard --create-namespace --namespace kubernetes-dashboard
```

Dashboard uses Kubernetes RBAC. For a quick administrative login token, create a service account and bind it to the built-in `cluster-admin` role:

```bash
kubectl -n kubernetes-dashboard create serviceaccount admin-user
kubectl create clusterrolebinding admin-user --clusterrole=cluster-admin --serviceaccount=kubernetes-dashboard:admin-user
kubectl -n kubernetes-dashboard create token admin-user
```

Use the token printed by the last command on the Dashboard login screen. For production, create a service account with only the permissions the user needs instead of using `cluster-admin`.

## Step 4: Start and Enable the Service

Dashboard is not managed with `systemctl`. Wait for the Dashboard pods to become ready, then start a local port-forward:

```bash
kubectl -n kubernetes-dashboard wait --for=condition=Ready pod --all --timeout=300s
kubectl -n kubernetes-dashboard port-forward svc/kubernetes-dashboard-kong-proxy 8443:443
```

Open the Dashboard from the same machine at:

```text
https://localhost:8443
```

## Step 5: Verify the Configuration

Test the setup:

```bash
kubectl -n kubernetes-dashboard get pods
kubectl -n kubernetes-dashboard get svc kubernetes-dashboard-kong-proxy
```

Check the logs for any errors:

```bash
kubectl -n kubernetes-dashboard logs -l app.kubernetes.io/instance=kubernetes-dashboard --all-containers=true --tail=100
```

## Step 6: Configure Firewall Rules

The recommended local port-forward does not require opening a firewall port because it listens on localhost by default. If you intentionally bind the port-forward to a network interface, restrict the source network and open only the port you need:

```bash
sudo firewall-cmd --permanent --add-port=8443/tcp
sudo firewall-cmd --reload
kubectl -n kubernetes-dashboard port-forward --address 0.0.0.0 svc/kubernetes-dashboard-kong-proxy 8443:443
```

Avoid exposing Dashboard directly to the public internet.

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
kubectl -n kubernetes-dashboard get pods -o wide
kubectl -n kubernetes-dashboard top pods
```

The `kubectl top` command requires Metrics Server or another Kubernetes metrics pipeline to be installed in the cluster.

## Security Considerations

- Use least-privilege RBAC instead of binding Dashboard users to `cluster-admin` in production
- Use short-lived service account tokens generated with `kubectl create token`
- Access Dashboard over HTTPS and keep it behind a trusted network path
- Restrict access with firewall rules if you bind the port-forward to a non-local address
- Keep Kubernetes tools and Helm chart deployments updated
- Remember that Kubernetes Dashboard is deprecated and no longer actively maintained

## Troubleshooting

Common issues and solutions:

1. **Dashboard pods are not ready**: Check `kubectl -n kubernetes-dashboard get pods` and `kubectl -n kubernetes-dashboard describe pod <pod-name>` for scheduling or image pull errors
2. **Login token fails**: Create a fresh token with `kubectl -n kubernetes-dashboard create token admin-user`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using port `8443`

## Conclusion

You have successfully configured set up kubernetes dashboard on RHEL. Monitor the deployment regularly and keep it updated to maintain security and performance.
