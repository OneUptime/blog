# How to Deploy Ingress-Nginx Controller on Kubernetes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, Container, Ingresses, Nginx, Linux

Description: Learn how to deploy Ingress-Nginx Controller on Kubernetes on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Deploy Ingress-Nginx Controller on Kubernetes on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- An existing Kubernetes cluster
- A kubeconfig file with cluster-admin permissions
- A stable network connection

## Overview

Deploying Ingress-Nginx Controller on Kubernetes requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl ca-certificates
```

## Step 2: Install kubectl

```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

Verify the installation:

```bash
kubectl version --client
kubectl cluster-info
```

## Step 3: Deploy the Ingress-Nginx Controller

For a bare-metal Kubernetes cluster on RHEL, apply the official ingress-nginx bare-metal manifest:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.15.1/deploy/static/provider/baremetal/deploy.yaml
```

This creates the `ingress-nginx` namespace, controller Deployment, Service, RBAC resources, and admission webhook resources.

## Step 4: Wait for the Controller

```bash
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx
kubectl get pods -n ingress-nginx
```

## Step 5: Verify the Configuration

Test the setup:

```bash
kubectl get ingressclass
kubectl get svc -n ingress-nginx
```

Check the logs for any errors:

```bash
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

## Step 6: Configure Firewall Rules

The bare-metal manifest exposes the controller through a NodePort Service. Open the NodePort range on any RHEL nodes that should receive ingress traffic:

```bash
sudo firewall-cmd --permanent --add-port=30000-32767/tcp
sudo firewall-cmd --reload
```

If you later expose the controller with host networking or an external load balancer on standard web ports, open HTTP and HTTPS instead:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
kubectl top pods -n ingress-nginx
kubectl describe deployment ingress-nginx-controller -n ingress-nginx
```

The `kubectl top` command requires the Kubernetes metrics API to be available in the cluster.

## Security Considerations

- Use TLS secrets for HTTPS ingress traffic
- Restrict access with firewall rules
- Keep the ingress-nginx controller manifest and image updated
- Review RBAC permissions and admission webhook settings before production use

## Troubleshooting

Common issues and solutions:

1. **Controller pods fail to start**: Check `kubectl describe pod -n ingress-nginx <pod-name>` and `kubectl logs -n ingress-nginx <pod-name>`
2. **Ingress has no external address**: On bare-metal clusters, NodePort does not assign a load-balancer IP. Use the Service node ports, MetalLB, or another external load balancer.
3. **Traffic cannot reach the controller**: Verify the NodePort Service with `kubectl get svc -n ingress-nginx` and confirm the RHEL firewall allows the required ports.

## Conclusion

You have successfully deployed ingress-nginx controller on Kubernetes on RHEL. Monitor the controller regularly and keep it updated to maintain security and performance.
