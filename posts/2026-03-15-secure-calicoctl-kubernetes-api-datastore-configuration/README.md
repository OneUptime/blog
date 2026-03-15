# How to Secure Calicoctl Kubernetes API Datastore Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Kubernetes, Security, RBAC, Networking

Description: Secure your calicoctl Kubernetes API datastore configuration with RBAC, kubeconfig restrictions, and network policy best practices.

---

## Introduction

When calicoctl is configured to use the Kubernetes API datastore, it communicates directly with the Kubernetes API server to read and write Calico resources. This means any security weakness in the calicoctl configuration can expose your entire network policy layer to unauthorized access.

Securing this configuration involves restricting which credentials calicoctl uses, limiting RBAC permissions to the minimum required scope, and ensuring that kubeconfig files are protected on disk and in transit.

This guide walks through practical steps to harden your calicoctl Kubernetes API datastore setup for production environments.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` binary installed (v3.25+)
- `kubectl` with cluster-admin access for initial RBAC setup
- Familiarity with Kubernetes RBAC concepts

## Configuring a Dedicated Service Account

Create a dedicated service account for calicoctl rather than reusing cluster-admin credentials:

```bash
kubectl create namespace calico-system --dry-run=client -o yaml | kubectl apply -f -

kubectl create serviceaccount calicoctl-sa -n calico-system
```

## Creating a Least-Privilege ClusterRole

Define a ClusterRole that grants only the permissions calicoctl needs:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calicoctl-role
rules:
  - apiGroups: ["crd.projectcalico.org"]
    resources:
      - networkpolicies
      - globalnetworkpolicies
      - hostendpoints
      - ippools
      - bgppeers
      - bgpconfigurations
      - felixconfigurations
      - globalnetworksets
      - networksets
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
```

Apply the role and binding:

```bash
kubectl apply -f calicoctl-clusterrole.yaml

kubectl create clusterrolebinding calicoctl-binding \
  --clusterrole=calicoctl-role \
  --serviceaccount=calico-system:calicoctl-sa
```

## Generating a Restricted Kubeconfig

Generate a kubeconfig file scoped to the calicoctl service account:

```bash
SECRET_NAME=$(kubectl get sa calicoctl-sa -n calico-system -o jsonpath='{.secrets[0].name}')
TOKEN=$(kubectl get secret "$SECRET_NAME" -n calico-system -o jsonpath='{.data.token}' | base64 -d)
CA_CERT=$(kubectl get secret "$SECRET_NAME" -n calico-system -o jsonpath='{.data.ca\.crt}')
API_SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

cat > calicoctl-kubeconfig.yaml <<EOF
apiVersion: v1
kind: Config
clusters:
  - cluster:
      certificate-authority-data: ${CA_CERT}
      server: ${API_SERVER}
    name: calico-cluster
contexts:
  - context:
      cluster: calico-cluster
      user: calicoctl-sa
    name: calicoctl-context
current-context: calicoctl-context
users:
  - name: calicoctl-sa
    user:
      token: ${TOKEN}
EOF

chmod 600 calicoctl-kubeconfig.yaml
```

## Setting calicoctl to Use the Restricted Kubeconfig

Configure calicoctl to use the Kubernetes datastore with the restricted kubeconfig:

```bash
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/path/to/calicoctl-kubeconfig.yaml

calicoctl get nodes
```

## Protecting Kubeconfig Files on Disk

Ensure kubeconfig files have strict file permissions:

```bash
chmod 600 /path/to/calicoctl-kubeconfig.yaml
chown root:root /path/to/calicoctl-kubeconfig.yaml

ls -la /path/to/calicoctl-kubeconfig.yaml
```

## Verification

Confirm that the restricted service account works correctly:

```bash
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/path/to/calicoctl-kubeconfig.yaml

calicoctl get ippools -o yaml
calicoctl get felixconfiguration default -o yaml
```

Verify that access outside the allowed scope is denied:

```bash
kubectl --kubeconfig=/path/to/calicoctl-kubeconfig.yaml get secrets -n kube-system
# Expected: Forbidden
```

## Troubleshooting

- **"Unauthorized" errors**: Verify the service account token is valid and the secret exists. Tokens from deleted secrets will fail.
- **"Forbidden" errors on Calico resources**: Check that the ClusterRoleBinding references the correct service account namespace and name.
- **File permission denied**: Ensure the user running calicoctl has read access to the kubeconfig file.
- **Connection refused**: Confirm the API server URL in the kubeconfig matches your cluster endpoint.

## Conclusion

Securing your calicoctl Kubernetes API datastore configuration reduces the blast radius of credential compromise. By using a dedicated service account with least-privilege RBAC and protecting kubeconfig files, you ensure that calicoctl access is tightly controlled in production environments.
