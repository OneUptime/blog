# How to Use kubectl certificate Commands to Manage CSR Approvals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Security

Description: Master kubectl certificate commands to manage Certificate Signing Requests in Kubernetes, including CSR approval, denial, and troubleshooting for secure cluster certificate management.

---

Kubernetes includes a built-in certificate management system that handles certificate signing requests. This system lets you request, approve, and issue certificates for users, services, and internal cluster components. The `kubectl certificate` commands give you control over this process.

Understanding CSR management is critical for cluster security. You need to know how to approve legitimate certificate requests, deny suspicious ones, and troubleshoot certificate issues. This guide walks you through the complete CSR workflow.

## Understanding Kubernetes CSR Workflow

The certificate workflow in Kubernetes involves several steps. First, a client or component creates a certificate signing request. This request includes a public key and identifying information. The CSR is submitted to the Kubernetes API server.

The request enters a pending state where it waits for approval. An administrator reviews the request and either approves or denies it. Once approved, the cluster certificate authority signs the certificate and makes it available to the requester.

This workflow ensures that only authorized entities receive certificates, maintaining cluster security.

## Viewing Certificate Signing Requests

Start by listing all CSRs in your cluster:

```bash
kubectl get csr
```

This shows all certificate requests, their status, and requester information. The output looks like this:

```
NAME        AGE   SIGNERNAME                      REQUESTOR          CONDITION
user-1-csr  5m    kubernetes.io/kube-apiserver   admin              Pending
node-csr    2h    kubernetes.io/kubelet-serving  system:node:node1  Approved,Issued
```

To see detailed information about a specific CSR:

```bash
kubectl describe csr user-1-csr
```

This shows the certificate request details, including the subject, requested usages, and current status.

To view the actual certificate request in PEM format:

```bash
kubectl get csr user-1-csr -o jsonpath='{.spec.request}' | base64 -d
```

This decodes the base64-encoded certificate request, letting you inspect it with OpenSSL:

```bash
kubectl get csr user-1-csr -o jsonpath='{.spec.request}' | \
  base64 -d | \
  openssl req -text -noout
```

## Creating a Certificate Signing Request

Before approving CSRs, you should understand how they are created. Here is how to create a CSR for a new user.

First, generate a private key:

```bash
openssl genrsa -out user-1.key 2048
```

Create a certificate signing request:

```bash
openssl req -new -key user-1.key -out user-1.csr -subj "/CN=user-1/O=developers"
```

The Common Name (CN) becomes the username, and the Organization (O) becomes the group membership.

Create a Kubernetes CSR object:

```yaml
# user-1-csr.yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: user-1-csr
spec:
  request: LS0tLS1CRUdJTi... # base64 encoded CSR
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400  # 24 hours
  usages:
  - client auth
```

Generate the base64-encoded request:

```bash
cat user-1.csr | base64 | tr -d '\n'
```

Paste this value into the spec.request field, then submit the CSR:

```bash
kubectl apply -f user-1-csr.yaml
```

## Approving Certificate Signing Requests

Once you have reviewed a CSR and determined it is legitimate, approve it:

```bash
kubectl certificate approve user-1-csr
```

The cluster CA signs the certificate immediately. Check the status:

```bash
kubectl get csr user-1-csr
```

The condition should show "Approved,Issued".

Retrieve the signed certificate:

```bash
kubectl get csr user-1-csr -o jsonpath='{.status.certificate}' | \
  base64 -d > user-1.crt
```

Now you have a signed certificate that can be used for cluster authentication.

You can approve multiple CSRs at once:

```bash
kubectl certificate approve csr-1 csr-2 csr-3
```

## Denying Certificate Signing Requests

If a CSR looks suspicious or is unauthorized, deny it:

```bash
kubectl certificate deny user-suspicious-csr
```

Once denied, the requester cannot use that CSR. They must create a new request if they still need a certificate.

Add a message explaining why you denied the request:

```bash
kubectl certificate deny user-suspicious-csr \
  --reason="Unauthorized request from unknown source"
```

Check denied CSRs:

```bash
kubectl get csr --field-selector status.conditions[*].type=Denied
```

## Automating CSR Approval

For trusted automated systems like kubelet node certificates, you can set up automatic approval. Kubernetes includes a controller that auto-approves certain types of CSRs based on configurable rules.

The kubelet-serving CSRs for nodes are often auto-approved if they meet specific criteria:

```bash
kubectl get csr --field-selector spec.signerName=kubernetes.io/kubelet-serving
```

You can write a custom controller or script to auto-approve CSRs that match your criteria:

```bash
#!/bin/bash
# auto-approve-nodes.sh

while true; do
  # Get pending node CSRs
  PENDING_CSRS=$(kubectl get csr -o json | \
    jq -r '.items[] | select(.status.conditions == null) | select(.spec.signerName == "kubernetes.io/kubelet-serving") | .metadata.name')

  for CSR in $PENDING_CSRS; do
    # Validate the CSR meets your criteria
    REQUESTOR=$(kubectl get csr $CSR -o jsonpath='{.spec.username}')

    if [[ $REQUESTOR == system:node:* ]]; then
      echo "Auto-approving node CSR: $CSR"
      kubectl certificate approve $CSR
    fi
  done

  sleep 30
done
```

Use caution with automatic approval. Always validate that CSRs meet your security requirements before approving them.

## Managing CSR Expiration

Certificates have expiration times. Set appropriate expiration when creating CSRs:

```yaml
spec:
  expirationSeconds: 86400  # 24 hours
```

The default expiration depends on your cluster configuration. Shorter expiration times improve security by limiting the lifetime of compromised certificates.

List CSRs and their expiration times:

```bash
kubectl get csr -o json | \
  jq '.items[] | {name: .metadata.name, expiration: .spec.expirationSeconds}'
```

Certificates must be renewed before they expire. Monitor certificate expiration and create new CSRs as needed.

## Setting Up User Authentication with Certificates

Here is a complete workflow for setting up a new user with certificate-based authentication.

Generate the private key and CSR:

```bash
# Generate key
openssl genrsa -out developer-1.key 2048

# Create CSR
openssl req -new -key developer-1.key \
  -out developer-1.csr \
  -subj "/CN=developer-1/O=developers"

# Encode CSR
CSR_BASE64=$(cat developer-1.csr | base64 | tr -d '\n')
```

Create the Kubernetes CSR:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: developer-1-csr
spec:
  request: $CSR_BASE64
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 31536000  # 1 year
  usages:
  - client auth
EOF
```

Approve the CSR:

```bash
kubectl certificate approve developer-1-csr
```

Retrieve the signed certificate:

```bash
kubectl get csr developer-1-csr -o jsonpath='{.status.certificate}' | \
  base64 -d > developer-1.crt
```

Configure kubectl to use the certificate:

```bash
# Set credentials
kubectl config set-credentials developer-1 \
  --client-certificate=developer-1.crt \
  --client-key=developer-1.key \
  --embed-certs=true

# Create context
kubectl config set-context developer-1-context \
  --cluster=my-cluster \
  --user=developer-1

# Use the context
kubectl config use-context developer-1-context
```

Set up RBAC permissions for the user:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-1-binding
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: User
  name: developer-1
  apiGroup: rbac.authorization.k8s.io
```

Apply the RBAC configuration:

```bash
kubectl apply -f developer-1-rbac.yaml
```

Now developer-1 can authenticate to the cluster using their certificate.

## Troubleshooting CSR Issues

CSRs can fail for various reasons. Here is how to diagnose common problems.

If a CSR is stuck in pending state, check the requester information:

```bash
kubectl get csr pending-csr -o jsonpath='{.spec.username}'
```

Verify the signer name is valid:

```bash
kubectl get csr pending-csr -o jsonpath='{.spec.signerName}'
```

Common signer names include:
- kubernetes.io/kube-apiserver-client
- kubernetes.io/kubelet-serving
- kubernetes.io/legacy-unknown

If the CSR was denied, check the reason:

```bash
kubectl get csr denied-csr -o jsonpath='{.status.conditions[*].message}'
```

If an approved CSR does not have a certificate, check the controller manager logs:

```bash
kubectl logs -n kube-system kube-controller-manager-master-node | grep certificate
```

The controller manager is responsible for signing approved CSRs. Errors here indicate issues with the CA configuration.

## Cleaning Up Old CSRs

Old CSRs accumulate over time. Clean them up regularly:

```bash
# Delete all approved and issued CSRs older than 30 days
kubectl get csr -o json | \
  jq -r '.items[] | select(.status.conditions[].type == "Approved") | select(.metadata.creationTimestamp < "'$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ)'") | .metadata.name' | \
  xargs kubectl delete csr
```

Delete denied CSRs:

```bash
kubectl get csr -o json | \
  jq -r '.items[] | select(.status.conditions[].type == "Denied") | .metadata.name' | \
  xargs kubectl delete csr
```

Automate cleanup with a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: csr-cleanup
  namespace: kube-system
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: csr-cleanup-sa
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Delete approved CSRs older than 30 days
              kubectl get csr -o json | \
                jq -r '.items[] | select(.status.conditions != null) | .metadata.name' | \
                while read csr; do
                  AGE=$(kubectl get csr $csr -o jsonpath='{.metadata.creationTimestamp}')
                  if [[ $(date -d "$AGE" +%s) -lt $(date -d '30 days ago' +%s) ]]; then
                    kubectl delete csr $csr
                  fi
                done
          restartPolicy: OnFailure
```

## Security Best Practices

Always review CSRs before approving them. Check the requestor identity, subject information, and requested usages.

Use appropriate expiration times. Shorter expiration reduces risk but requires more frequent renewal.

Monitor CSR activity. Set up alerts for unusual CSR patterns, such as many denied requests or requests from unexpected sources.

Limit who can approve CSRs. Use RBAC to restrict the `approve` verb on CSR resources to trusted administrators.

Rotate certificates regularly even if they have not expired. This limits the impact of potential compromises.

Audit CSR approvals and denials. Keep logs of who approved what and when for security investigations.

## Conclusion

The kubectl certificate commands provide essential tools for managing Kubernetes certificate infrastructure. Use them to approve legitimate requests, deny suspicious ones, and maintain cluster security.

Master the CSR workflow from creation through approval to certificate retrieval. Implement automation for trusted systems while maintaining manual review for sensitive certificates. Clean up old CSRs regularly and follow security best practices.

Certificate management is a critical aspect of Kubernetes security. Understanding these commands helps you maintain a secure, well-managed cluster.
