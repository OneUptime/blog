# How to Assign Dashboard Permissions in Grafana Helm Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Helm, Kubernetes, RBAC, Dashboards

Description: Configure dashboard folder permissions and access control through Grafana Helm chart values using provisioning, including team-based access, organization roles, and RBAC settings.

---

Managing dashboard permissions through Helm values enables GitOps workflows where access control is versioned alongside dashboards. This guide covers provisioning folder permissions, team access, and role-based access control in Grafana deployed via Helm.

## Understanding Grafana Permission Model

Grafana uses a hierarchical permission model with organizations, teams, folders, and dashboards.

```mermaid
flowchart TD
    A[Organization] --> B[Teams]
    A --> C[Folders]
    B --> D[Team Members]
    C --> E[Dashboards]
    C --> F[Folder Permissions]
    E --> G[Dashboard Permissions]
    F --> H[Team Access]
    F --> I[User Access]
    F --> J[Role Access]
```

## 1. Basic Helm Values Structure

The Grafana Helm chart supports dashboard provisioning through ConfigMaps.

`values.yaml`

```yaml
# Grafana Helm chart values
grafana.ini:
  users:
    viewers_can_edit: false
  auth:
    disable_login_form: false
  security:
    admin_user: admin
    admin_password: ${GRAFANA_ADMIN_PASSWORD}

# Enable RBAC
rbac:
  enabled: true

# Dashboard provisioning
dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
      - name: 'default'
        orgId: 1
        folder: 'General'
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/default
      - name: 'infrastructure'
        orgId: 1
        folder: 'Infrastructure'
        type: file
        disableDeletion: true
        editable: false
        options:
          path: /var/lib/grafana/dashboards/infrastructure
```

## 2. Provision Folders with Permissions

Define folders and their permissions in provisioning files.

`values.yaml`

```yaml
# Folder provisioning with permissions
dashboards:
  default:
    infrastructure-overview:
      file: dashboards/infrastructure/overview.json
    kubernetes-cluster:
      file: dashboards/infrastructure/k8s-cluster.json

# Additional ConfigMaps for folder provisioning
extraConfigmapMounts:
  - name: grafana-folders
    mountPath: /etc/grafana/provisioning/dashboards/folders.yaml
    subPath: folders.yaml
    configMap: grafana-folder-provisioning
    readOnly: true
```

Create the folder provisioning ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-folder-provisioning
  namespace: monitoring
data:
  folders.yaml: |
    apiVersion: 1
    providers:
      - name: 'sre-dashboards'
        orgId: 1
        folder: 'SRE'
        folderUid: 'sre-folder'
        type: file
        disableDeletion: true
        editable: false
        options:
          path: /var/lib/grafana/dashboards/sre
      - name: 'dev-dashboards'
        orgId: 1
        folder: 'Development'
        folderUid: 'dev-folder'
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/dev
```

## 3. Configure Team-Based Access

Provision teams and assign folder permissions.

`values.yaml`

```yaml
# Grafana provisioning for access control
grafana.ini:
  # Enable team sync if using OAuth
  auth.generic_oauth:
    enabled: true
    team_ids_attribute_path: groups
    teams_url: ""

# Access control provisioning
extraConfigmapMounts:
  - name: grafana-access
    mountPath: /etc/grafana/provisioning/access-control
    configMap: grafana-access-provisioning
    readOnly: true
```

Access control provisioning ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-access-provisioning
  namespace: monitoring
data:
  roles.yaml: |
    apiVersion: 1
    roles:
      - name: 'sre:reader'
        description: 'Read-only access to SRE dashboards'
        permissions:
          - action: 'dashboards:read'
            scope: 'folders:uid:sre-folder'
          - action: 'folders:read'
            scope: 'folders:uid:sre-folder'
      - name: 'sre:editor'
        description: 'Edit access to SRE dashboards'
        permissions:
          - action: 'dashboards:read'
            scope: 'folders:uid:sre-folder'
          - action: 'dashboards:write'
            scope: 'folders:uid:sre-folder'
          - action: 'dashboards:create'
            scope: 'folders:uid:sre-folder'
          - action: 'folders:read'
            scope: 'folders:uid:sre-folder'
```

## 4. Assign Roles to Teams via LDAP/OAuth

Map external groups to Grafana roles.

`values.yaml`

```yaml
grafana.ini:
  auth.generic_oauth:
    enabled: true
    name: OAuth
    client_id: ${OAUTH_CLIENT_ID}
    client_secret: ${OAUTH_CLIENT_SECRET}
    scopes: openid profile email groups
    auth_url: https://auth.example.com/oauth/authorize
    token_url: https://auth.example.com/oauth/token
    api_url: https://auth.example.com/userinfo
    # Map groups to roles
    role_attribute_path: contains(groups[*], 'grafana-admins') && 'Admin' || contains(groups[*], 'grafana-editors') && 'Editor' || 'Viewer'
    # Sync teams from OAuth groups
    teams_url: https://auth.example.com/teams
    team_ids_attribute_path: groups
```

## 5. Dashboard JSON with Permissions

Include permission metadata in dashboard JSON files.

`dashboards/sre/alerts-dashboard.json`

```json
{
  "uid": "sre-alerts",
  "title": "SRE Alerts Dashboard",
  "tags": ["sre", "alerts"],
  "timezone": "browser",
  "schemaVersion": 38,
  "version": 1,
  "refresh": "30s",
  "__inputs": [],
  "__requires": [],
  "annotations": {
    "list": []
  },
  "panels": [],
  "meta": {
    "folderUid": "sre-folder",
    "canAdmin": false,
    "canEdit": false,
    "canSave": false
  }
}
```

## 6. Role-Based Access Control Provisioning

Enable and configure Grafana RBAC.

`values.yaml`

```yaml
grafana.ini:
  rbac:
    permission_cache: true

  # Define basic roles
  users:
    default_theme: dark
    viewers_can_edit: false

# RBAC provisioning
extraConfigmapMounts:
  - name: grafana-rbac
    mountPath: /etc/grafana/provisioning/access-control
    configMap: grafana-rbac-config
    readOnly: true
```

RBAC configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-rbac-config
  namespace: monitoring
data:
  rbac.yaml: |
    apiVersion: 1
    roles:
      # Custom role for infrastructure team
      - name: 'infrastructure:viewer'
        description: 'View infrastructure dashboards'
        version: 1
        global: false
        permissions:
          - action: 'dashboards:read'
            scope: 'folders:uid:infrastructure'
          - action: 'folders:read'
            scope: 'folders:uid:infrastructure'
          - action: 'datasources:query'
            scope: 'datasources:*'

      # Custom role for development team
      - name: 'development:editor'
        description: 'Edit development dashboards'
        version: 1
        global: false
        permissions:
          - action: 'dashboards:read'
            scope: 'folders:uid:development'
          - action: 'dashboards:write'
            scope: 'folders:uid:development'
          - action: 'dashboards:create'
            scope: 'folders:uid:development'
          - action: 'dashboards:delete'
            scope: 'folders:uid:development'
          - action: 'folders:read'
            scope: 'folders:uid:development'
          - action: 'datasources:query'
            scope: 'datasources:*'
          - action: 'datasources:explore'
            scope: 'datasources:*'

    roleGrants:
      - builtinRole: 'Viewer'
        roles:
          - 'infrastructure:viewer'
      - builtinRole: 'Editor'
        roles:
          - 'development:editor'
          - 'infrastructure:viewer'
```

## 7. Folder Permissions via API Initialization

Use an init container to set permissions via API.

`values.yaml`

```yaml
initChownData:
  enabled: true

extraInitContainers:
  - name: init-permissions
    image: curlimages/curl:latest
    command:
      - /bin/sh
      - -c
      - |
        # Wait for Grafana to start
        until curl -s http://localhost:3000/api/health; do
          sleep 5
        done

        # Set folder permissions
        curl -X POST http://admin:${GRAFANA_ADMIN_PASSWORD}@localhost:3000/api/folders/sre-folder/permissions \
          -H "Content-Type: application/json" \
          -d '{
            "items": [
              {"role": "Viewer", "permission": 1},
              {"role": "Editor", "permission": 2},
              {"teamId": 1, "permission": 4}
            ]
          }'
    env:
      - name: GRAFANA_ADMIN_PASSWORD
        valueFrom:
          secretKeyRef:
            name: grafana-admin
            key: password
```

## 8. Sidecar Dashboard Provisioning

Use sidecar containers for dynamic dashboard loading with permissions.

`values.yaml`

```yaml
sidecar:
  dashboards:
    enabled: true
    label: grafana_dashboard
    labelValue: "1"
    folder: /tmp/dashboards
    defaultFolderName: "General"
    folderAnnotation: grafana_folder
    searchNamespace: ALL
    provider:
      foldersFromFilesStructure: true
      allowUiUpdates: false
      disableDelete: false
```

Dashboard ConfigMap with folder annotation:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sre-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
  annotations:
    grafana_folder: "SRE"
data:
  sre-overview.json: |
    {
      "uid": "sre-overview",
      "title": "SRE Overview",
      "panels": []
    }
```

## 9. Organization-Level Permissions

Configure multi-organization setups with separate permissions.

`values.yaml`

```yaml
grafana.ini:
  users:
    auto_assign_org: true
    auto_assign_org_id: 1
    auto_assign_org_role: Viewer

  auth.generic_oauth:
    org_mapping: engineering:1:Editor, platform:2:Admin, support:1:Viewer
    org_attribute_path: organization

dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
      # Org 1 dashboards
      - name: 'engineering-dashboards'
        orgId: 1
        folder: 'Engineering'
        type: file
        options:
          path: /var/lib/grafana/dashboards/engineering
      # Org 2 dashboards
      - name: 'platform-dashboards'
        orgId: 2
        folder: 'Platform'
        type: file
        options:
          path: /var/lib/grafana/dashboards/platform
```

## 10. Service Account Permissions

Configure service accounts for API access with specific permissions.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-service-accounts
  namespace: monitoring
data:
  service-accounts.yaml: |
    apiVersion: 1
    serviceAccounts:
      - name: 'ci-pipeline'
        role: 'Viewer'
        isDisabled: false
        tokens:
          - name: 'ci-token'
            secondsToLive: 86400
      - name: 'alerting-bot'
        role: 'Editor'
        isDisabled: false
```

## 11. Complete Helm Values Example

Full configuration with all permission settings.

`values.yaml`

```yaml
replicas: 1

grafana.ini:
  server:
    root_url: https://grafana.example.com
  security:
    admin_user: admin
  users:
    viewers_can_edit: false
    default_theme: dark
  auth.generic_oauth:
    enabled: true
    name: SSO
    client_id: ${OAUTH_CLIENT_ID}
    client_secret: ${OAUTH_CLIENT_SECRET}
    scopes: openid profile email groups
    auth_url: https://sso.example.com/oauth/authorize
    token_url: https://sso.example.com/oauth/token
    role_attribute_path: contains(groups[*], 'sre-admins') && 'Admin' || contains(groups[*], 'sre-team') && 'Editor' || 'Viewer'
  rbac:
    permission_cache: true

envFromSecret: grafana-secrets

dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
      - name: 'sre'
        orgId: 1
        folder: 'SRE'
        folderUid: 'sre'
        type: file
        disableDeletion: true
        editable: false
        options:
          path: /var/lib/grafana/dashboards/sre
      - name: 'dev'
        orgId: 1
        folder: 'Development'
        folderUid: 'dev'
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/dev

sidecar:
  dashboards:
    enabled: true
    label: grafana_dashboard
    folderAnnotation: grafana_folder
    searchNamespace: ALL

extraConfigmapMounts:
  - name: grafana-rbac
    mountPath: /etc/grafana/provisioning/access-control
    configMap: grafana-rbac-provisioning
    readOnly: true

persistence:
  enabled: true
  size: 10Gi
```

## 12. Verify Permissions

Test the permission configuration.

```bash
# Check folder permissions via API
curl -H "Authorization: Bearer ${GRAFANA_TOKEN}" \
  https://grafana.example.com/api/folders/sre/permissions | jq .

# List dashboards visible to a user
curl -H "Authorization: Bearer ${USER_TOKEN}" \
  https://grafana.example.com/api/search?folderIds=1 | jq .

# Check effective permissions
curl -H "Authorization: Bearer ${USER_TOKEN}" \
  https://grafana.example.com/api/access-control/user/permissions | jq .
```

---

Grafana Helm chart provisioning enables declarative permission management that integrates with GitOps workflows. By defining folders, roles, and team mappings in values files and ConfigMaps, you ensure consistent access control across deployments while maintaining the flexibility to evolve permissions over time.
