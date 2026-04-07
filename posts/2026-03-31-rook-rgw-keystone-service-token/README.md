# How to Set Service Token Support for Keystone in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Keystone, OpenStack, Security

Description: Configure service token support in Ceph RGW for Keystone authentication to allow service-to-service API calls using short-lived tokens.

---

Service tokens in Keystone allow service accounts to make trusted API calls on behalf of users without requiring user credentials. Ceph RGW supports service tokens to enable secure service-to-service communication in OpenStack environments.

## What Are Service Tokens?

Service tokens are Keystone tokens issued to OpenStack services (like Nova, Cinder, or Swift) rather than end users. They allow:
- Service accounts to make authenticated API calls
- Delegation of operations without exposing user passwords
- Fine-grained access control for service-initiated operations

## Configuring Service Token Support

```bash
# Enable service token support
ceph config set client.rgw rgw_keystone_service_token_enabled true

# List of accepted service roles (Keystone roles that are service accounts)
ceph config set client.rgw rgw_keystone_service_token_accepted_roles "service,admin"
```

## Keystone Configuration on the OpenStack Side

On the OpenStack/Keystone side, create a service account:

```bash
# Create a service user
openstack user create --domain default --password SERVICE_PASSWORD rgw-service

# Assign the 'service' role
openstack role add --project service --user rgw-service service
```

## Configuring RGW to Trust Service Tokens

```bash
# Set the service credentials
ceph config set client.rgw rgw_keystone_admin_user rgw-service
ceph config set client.rgw rgw_keystone_admin_password SERVICE_PASSWORD
ceph config set client.rgw rgw_keystone_admin_project service
ceph config set client.rgw rgw_keystone_admin_domain Default
ceph config set client.rgw rgw_keystone_service_token_enabled true
```

## Applying in Rook

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_keystone_url = https://keystone.example.com:5000
    rgw_keystone_api_version = 3
    rgw_keystone_admin_user = rgw-service
    rgw_keystone_admin_password = SERVICE_PASSWORD
    rgw_keystone_admin_project = service
    rgw_keystone_admin_domain = Default
    rgw_keystone_service_token_enabled = true
    rgw_keystone_service_token_accepted_roles = service,admin
```

Apply and restart:

```bash
kubectl apply -f rook-config-override.yaml
kubectl -n rook-ceph rollout restart deployment rook-ceph-rgw-my-store-a
```

## Testing Service Token Authentication

```bash
# Obtain a service token
SERVICE_TOKEN=$(openstack token issue \
  --os-username rgw-service \
  --os-password SERVICE_PASSWORD \
  --os-project-name service \
  -f value -c id)

# Use service token to access RGW
curl http://rook-ceph-rgw-my-store.rook-ceph.svc/swift/v1/my-container \
  -H "X-Auth-Token: $SERVICE_TOKEN"
```

## Summary

Service token support in Ceph RGW enables secure service-to-service API calls in OpenStack environments. Enable it with `rgw_keystone_service_token_enabled = true` and specify accepted service roles in `rgw_keystone_service_token_accepted_roles`. Create a dedicated Keystone service user and store credentials as Kubernetes Secrets for Rook-managed deployments.
