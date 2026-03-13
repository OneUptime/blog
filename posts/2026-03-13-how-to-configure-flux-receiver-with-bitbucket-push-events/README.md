# How to Configure Flux Receiver with Bitbucket Push Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Bitbucket, Webhooks

Description: Learn how to configure a Flux Receiver for Bitbucket push events to trigger immediate reconciliation when code is pushed to Bitbucket repositories.

---

## Introduction

Bitbucket is widely used in enterprise environments, particularly by teams already invested in the Atlassian ecosystem. When using Flux with Bitbucket repositories, you can eliminate the polling delay by configuring a Receiver that responds to Bitbucket webhook push events. This triggers immediate reconciliation whenever code is pushed to your tracked branches.

This guide covers setting up a Flux Receiver for Bitbucket Server and Bitbucket Cloud push events, configuring the webhook in Bitbucket, and verifying the integration.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux v2 installed and bootstrapped
- The notification controller accessible from Bitbucket (via ingress or LoadBalancer)
- A Bitbucket repository (Cloud or Server/Data Center) tracked by Flux
- Admin access to the Bitbucket repository or project
- kubectl access to the flux-system namespace

## Bitbucket Cloud vs Bitbucket Server

Flux supports both Bitbucket Cloud and Bitbucket Server (Data Center) through different receiver types:

- **Bitbucket Server/Data Center**: Use `type: bitbucket`
- **Bitbucket Cloud**: Use `type: bitbucketserver` is not used; instead Bitbucket Cloud webhooks work with `type: generic` or `type: bitbucket` depending on your Flux version

For this guide, we will focus on the standard Bitbucket receiver type that works with Bitbucket Server and Cloud.

## Creating the Webhook Secret

Create the secret for webhook authentication:

```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic bitbucket-webhook-token \
  --namespace=flux-system \
  --from-literal=token=$TOKEN
```

As a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-webhook-token
  namespace: flux-system
stringData:
  token: "your-secure-random-token-here"
```

## Configuring the Receiver for Bitbucket Server

For Bitbucket Server (Data Center), create a Receiver with the `bitbucket` type:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: bitbucket-push-receiver
  namespace: flux-system
spec:
  type: bitbucket
  events:
    - "repo:refs_changed"
  secretRef:
    name: bitbucket-webhook-token
  resources:
    - kind: GitRepository
      name: app-repo
```

The `repo:refs_changed` event fires whenever references (branches, tags) change in the repository, which covers push events.

## Configuring the Receiver for Bitbucket Cloud

For Bitbucket Cloud, the event format is slightly different:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: bitbucket-cloud-receiver
  namespace: flux-system
spec:
  type: bitbucket
  events:
    - "repo:push"
  secretRef:
    name: bitbucket-webhook-token
  resources:
    - kind: GitRepository
      name: app-repo
```

Bitbucket Cloud uses `repo:push` as the event key for push events.

## Applying and Getting the Webhook URL

Apply the Receiver and retrieve the webhook path:

```bash
kubectl apply -f bitbucket-receiver.yaml
kubectl get receiver bitbucket-push-receiver -n flux-system
kubectl get receiver bitbucket-push-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

Combine the webhook path with your notification controller's external URL to get the complete webhook URL.

## Exposing the Notification Controller

Create an ingress for the notification controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-bitbucket-webhook
  namespace: flux-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - flux-webhook.yourdomain.com
      secretName: webhook-tls
  rules:
    - host: flux-webhook.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: notification-controller
                port:
                  number: 80
```

## Configuring the Webhook in Bitbucket Server

For Bitbucket Server, navigate to your repository settings:

1. Go to Repository Settings, then Webhooks
2. Click "Create webhook"
3. Fill in the details:
   - **Name**: Flux Reconciliation Trigger
   - **URL**: Your full webhook URL
   - **Secret**: The token from your Kubernetes secret
   - **Events**: Select "Repository: Push" under Repository events
4. Click "Create"

## Configuring the Webhook in Bitbucket Cloud

For Bitbucket Cloud, navigate to your repository:

1. Go to Repository Settings, then Webhooks
2. Click "Add webhook"
3. Configure:
   - **Title**: Flux Reconciliation Trigger
   - **URL**: Your full webhook URL
   - **Triggers**: Choose "Repository push" or select specific triggers
4. Click "Save"

Note that Bitbucket Cloud does not natively support webhook secrets in the same way as GitHub or GitLab. The token validation relies on the Flux Receiver's built-in verification.

## Triggering Multiple Resources

Configure the Receiver to reconcile multiple resources on push:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: bitbucket-full-reconcile
  namespace: flux-system
spec:
  type: bitbucket
  events:
    - "repo:refs_changed"
  secretRef:
    name: bitbucket-webhook-token
  resources:
    - kind: GitRepository
      name: app-repo
    - kind: GitRepository
      name: config-repo
    - kind: Kustomization
      name: apps
    - kind: Kustomization
      name: infrastructure
```

## Separate Receivers per Repository

When managing multiple Bitbucket repositories, create dedicated receivers:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: frontend-bitbucket-receiver
  namespace: flux-system
spec:
  type: bitbucket
  events:
    - "repo:refs_changed"
  secretRef:
    name: bitbucket-webhook-token
  resources:
    - kind: GitRepository
      name: frontend-repo
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: backend-bitbucket-receiver
  namespace: flux-system
spec:
  type: bitbucket
  events:
    - "repo:refs_changed"
  secretRef:
    name: bitbucket-webhook-token
  resources:
    - kind: GitRepository
      name: backend-repo
```

Each receiver generates a unique webhook URL to configure in the respective Bitbucket repository.

## Network Considerations for Bitbucket Server

If your Bitbucket Server instance runs behind a corporate firewall, ensure network connectivity between Bitbucket and your Kubernetes cluster:

- Open outbound access from Bitbucket Server to your webhook endpoint
- If using a VPN or private network, the notification controller service may need to be exposed internally rather than through a public ingress
- Consider using a reverse proxy or API gateway if direct connectivity is not possible

```yaml
apiVersion: v1
kind: Service
metadata:
  name: notification-controller-lb
  namespace: flux-system
spec:
  type: LoadBalancer
  loadBalancerIP: 10.0.0.50
  selector:
    app: notification-controller
  ports:
    - port: 80
      targetPort: 9292
      protocol: TCP
```

## Verifying the Integration

Push a commit to your Bitbucket repository and check the logs:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=50 -f
```

Verify the GitRepository was reconciled:

```bash
flux get sources git app-repo -n flux-system
```

In Bitbucket Server, check the webhook request history under Repository Settings, Webhooks, then click on your webhook to see recent deliveries.

## Troubleshooting

If the webhook is not working:

Check the Receiver status:

```bash
kubectl describe receiver bitbucket-push-receiver -n flux-system
```

Verify the event name matches exactly. Bitbucket Server uses `repo:refs_changed` while Bitbucket Cloud uses `repo:push`. Using the wrong event name causes silent failures.

Check notification controller logs for authentication or parsing errors:

```bash
kubectl logs -n flux-system deployment/notification-controller | grep -i "error\|bitbucket\|receiver"
```

## Conclusion

Configuring a Flux Receiver for Bitbucket push events brings event-driven reconciliation to teams using Bitbucket for their Git repositories. Whether you are on Bitbucket Cloud or Bitbucket Server, the setup follows the same pattern: create a shared secret, define a Receiver with the appropriate type and event, expose the notification controller, and configure the webhook in Bitbucket. The integration eliminates polling delays, giving you immediate deployments when code is pushed to your tracked branches.
