# How to Implement Vault Control Groups for Secret Approval Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, Control Groups, Approval Workflow, Governance, Enterprise

Description: Learn how to configure HashiCorp Vault Enterprise control groups to enforce multi-party authorization for sensitive secret access, implementing robust approval workflows in Kubernetes.

---

HashiCorp Vault Enterprise control groups provide multi-party authorization for secret access. Instead of granting direct access to sensitive secrets, control groups require approval from authorized users before releasing the secret. This implements the principle of least privilege and provides oversight for critical operations. This guide demonstrates implementing control group workflows in Kubernetes environments.

## Understanding Control Groups

Control groups add an authorization gate between a request and its response. When a user requests a secret protected by a control group, Vault returns a response-wrapping token and waits for the required number of authorizations. Only after sufficient approvals can the requester unwrap the token to retrieve the actual secret.

This pattern is valuable for production database credentials, encryption keys, API tokens with elevated privileges, and any secret where dual authorization reduces risk.

Control groups are an Enterprise feature and require Vault Enterprise license.

## Configuring Control Group Policies

Define control group requirements in policies:

```hcl
# Policy requiring control group for production database credentials

path "database/creds/production" {
  capabilities = ["read"]
  control_group = {
    factor "approvers" {
      identity {
        group_names = ["database-admins", "security-team"]
        approvals = 2
      }
    }
    ttl = "1h"
  }
}

# Policy for highly sensitive secrets requiring 3 approvals
path "secret/data/production/master-keys" {
  capabilities = ["read"]
  control_group = {
    factor "approvers" {
      identity {
        group_names = ["security-team"]
        approvals = 3
      }
    }
    ttl = "30m"
  }
}
```

The `approvals` parameter specifies how many authorizers must approve the request. The `ttl` sets the lifetime of the response-wrapping token used for the request.

## Setting Up Approver Groups

Create identity groups for approvers:

```bash
# Enable the userpass auth method
vault auth enable userpass

# Create users
vault write auth/userpass/users/alice password=secure-password
vault write auth/userpass/users/bob password=secure-password
vault write auth/userpass/users/charlie password=secure-password

# Get the auth method accessor and create identity entities for the users
USERPASS_ACCESSOR=$(vault auth list -format=json | jq -r '.["userpass/"].accessor')

ALICE_ENTITY=$(vault write -format=json identity/entity name="alice" | jq -r ".data.id")
BOB_ENTITY=$(vault write -format=json identity/entity name="bob" | jq -r ".data.id")
CHARLIE_ENTITY=$(vault write -format=json identity/entity name="charlie" | jq -r ".data.id")

vault write identity/entity-alias name="alice" \
    canonical_id="$ALICE_ENTITY" \
    mount_accessor="$USERPASS_ACCESSOR"

vault write identity/entity-alias name="bob" \
    canonical_id="$BOB_ENTITY" \
    mount_accessor="$USERPASS_ACCESSOR"

vault write identity/entity-alias name="charlie" \
    canonical_id="$CHARLIE_ENTITY" \
    mount_accessor="$USERPASS_ACCESSOR"

# Create internal group
vault write identity/group name="database-admins" \
    policies="approver-policy" \
    type="internal" \
    member_entity_ids="$ALICE_ENTITY,$BOB_ENTITY"

# Create security team group
vault write identity/group name="security-team" \
    policies="approver-policy" \
    type="internal" \
    member_entity_ids="$CHARLIE_ENTITY"
```

## Creating Approver Policy

Approvers need permission to authorize requests:

```hcl
# approver-policy.hcl
# Allow checking control group request status
path "sys/control-group/request" {
  capabilities = ["create", "update"]
}

# Allow authorizing control group requests
path "sys/control-group/authorize" {
  capabilities = ["create", "update"]
}
```

Apply the policy:

```bash
vault policy write approver-policy approver-policy.hcl
```

## Requesting Secrets with Control Groups

When an application requests a protected secret:

```go
package main

import (
    "fmt"
    "time"
    "github.com/hashicorp/vault/api"
)

type ControlGroupRequest struct {
    client    *api.Client
    token     string
    accessor  string
    requestID string
}

func RequestProtectedSecret(vaultAddr, token, path string) (*ControlGroupRequest, error) {
    config := api.DefaultConfig()
    config.Address = vaultAddr

    client, err := api.NewClient(config)
    if err != nil {
        return nil, fmt.Errorf("failed to create client: %w", err)
    }

    client.SetToken(token)

    // Request the secret
    secret, err := client.Logical().Read(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read secret: %w", err)
    }

    // Check if control group authorization is required
    if secret == nil {
        return nil, fmt.Errorf("no response received")
    }

    // Extract wrap info which contains control group details
    if secret.WrapInfo != nil && secret.WrapInfo.Token != "" && secret.WrapInfo.Accessor != "" {
        fmt.Printf("Control group authorization required\n")
        fmt.Printf("Accessor: %s\n", secret.WrapInfo.Accessor)
        fmt.Printf("Request must be approved within: %d seconds\n", secret.WrapInfo.TTL)

        return &ControlGroupRequest{
            client:    client,
            token:     secret.WrapInfo.Token,
            accessor:  secret.WrapInfo.Accessor,
            requestID: secret.WrapInfo.Accessor,
        }, nil
    }

    return nil, fmt.Errorf("expected control group response")
}

// PollForApproval waits for control group approval
func (cgr *ControlGroupRequest) PollForApproval(timeout time.Duration) (*api.Secret, error) {
    ticker := time.NewTicker(10 * time.Second)
    defer ticker.Stop()

    deadline := time.After(timeout)

    for {
        select {
        case <-ticker.C:
            // Check authorization status
            status, err := cgr.client.Logical().Write(
                "sys/control-group/request",
                map[string]interface{}{
                    "accessor": cgr.accessor,
                },
            )
            if err != nil {
                return nil, fmt.Errorf("failed to check status: %w", err)
            }

            authorized := status.Data["approved"].(bool)
            if authorized {
                // Unwrap the secret
                secret, err := cgr.client.Logical().Unwrap(cgr.token)
                if err != nil {
                    return nil, fmt.Errorf("failed to unwrap: %w", err)
                }
                return secret, nil
            }

            approvalCount := 0
            if authorizations, ok := status.Data["authorizations"].([]interface{}); ok {
                approvalCount = len(authorizations)
            }

            fmt.Printf("Waiting for approval... (%d approvals recorded)\n", approvalCount)

        case <-deadline:
            return nil, fmt.Errorf("approval timeout exceeded")
        }
    }
}
```

## Approving Control Group Requests

Approvers authorize requests using their credentials:

```go
package main

import (
    "fmt"
    "github.com/hashicorp/vault/api"
)

type Approver struct {
    client           *api.Client
    pendingAccessors []string
}

func NewApprover(vaultAddr, token string, pendingAccessors []string) (*Approver, error) {
    config := api.DefaultConfig()
    config.Address = vaultAddr

    client, err := api.NewClient(config)
    if err != nil {
        return nil, fmt.Errorf("failed to create client: %w", err)
    }

    client.SetToken(token)

    return &Approver{client: client, pendingAccessors: pendingAccessors}, nil
}

// ListPendingRequests returns accessors collected by the application.
// Vault's control group API checks a specific accessor; it does not provide
// a list endpoint for pending requests.
func (a *Approver) ListPendingRequests() ([]string, error) {
    return a.pendingAccessors, nil
}

// GetRequestDetails retrieves information about a control group request
func (a *Approver) GetRequestDetails(accessor string) (map[string]interface{}, error) {
    secret, err := a.client.Logical().Write(
        "sys/control-group/request",
        map[string]interface{}{
            "accessor": accessor,
        },
    )
    if err != nil {
        return nil, fmt.Errorf("failed to read request: %w", err)
    }

    if secret == nil {
        return nil, fmt.Errorf("request not found")
    }

    return secret.Data, nil
}

// ApproveRequest authorizes a control group request
func (a *Approver) ApproveRequest(accessor string) error {
    _, err := a.client.Logical().Write(
        "sys/control-group/authorize",
        map[string]interface{}{
            "accessor": accessor,
        },
    )
    if err != nil {
        return fmt.Errorf("failed to approve: %w", err)
    }

    fmt.Printf("Successfully approved request %s\n", accessor)
    return nil
}
```

## Building an Approval Dashboard

Create a web interface for managing approvals:

```go
package main

import (
    "encoding/json"
    "net/http"
    "github.com/gorilla/mux"
)

type ApprovalDashboard struct {
    approver *Approver
}

func (ad *ApprovalDashboard) HandleListRequests(w http.ResponseWriter, r *http.Request) {
    requests, err := ad.approver.ListPendingRequests()
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Get details for each request
    type RequestInfo struct {
        Accessor    string
        RequestPath string
        Requester   string
        Approvals   int
        TTL         string
    }

    var requestDetails []RequestInfo
    for _, accessor := range requests {
        details, err := ad.approver.GetRequestDetails(accessor)
        if err != nil {
            continue
        }

        approvalCount := 0
        if authorizations, ok := details["authorizations"].([]interface{}); ok {
            approvalCount = len(authorizations)
        }

        requester := ""
        if requestEntity, ok := details["request_entity"].(map[string]interface{}); ok {
            requester, _ = requestEntity["name"].(string)
        }

        requestDetails = append(requestDetails, RequestInfo{
            Accessor:    accessor,
            RequestPath: details["request_path"].(string),
            Requester:   requester,
            Approvals:   approvalCount,
            TTL:         "tracked by wrapping token TTL",
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(requestDetails)
}

func (ad *ApprovalDashboard) HandleApprove(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    accessor := vars["accessor"]

    if err := ad.approver.ApproveRequest(accessor); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{
        "status": "approved",
    })
}

const dashboardHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Vault Approval Dashboard</title>
    <script>
        async function loadRequests() {
            const response = await fetch('/api/requests');
            const requests = await response.json();

            const table = document.getElementById('requests');
            table.innerHTML = '';

            requests.forEach(req => {
                const row = table.insertRow();
                row.insertCell(0).textContent = req.Requester;
                row.insertCell(1).textContent = req.RequestPath;
                row.insertCell(2).textContent = req.Approvals;
                row.insertCell(3).textContent = req.TTL;

                const approveBtn = document.createElement('button');
                approveBtn.textContent = 'Approve';
                approveBtn.onclick = () => approveRequest(req.Accessor);
                row.insertCell(4).appendChild(approveBtn);
            });
        }

        async function approveRequest(accessor) {
            const response = await fetch('/api/approve/' + accessor, {
                method: 'POST'
            });

            if (response.ok) {
                alert('Request approved');
                loadRequests();
            } else {
                alert('Approval failed');
            }
        }

        setInterval(loadRequests, 5000);
        window.onload = loadRequests;
    </script>
</head>
<body>
    <h1>Pending Approval Requests</h1>
    <table border="1">
        <thead>
            <tr>
                <th>Requester</th>
                <th>Secret Path</th>
                <th>Approvals</th>
                <th>TTL</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody id="requests"></tbody>
    </table>
</body>
</html>
`

func (ad *ApprovalDashboard) HandleDashboard(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/html")
    w.Write([]byte(dashboardHTML))
}
```

## Deploying Approval Dashboard in Kubernetes

Deploy the dashboard as a service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vault-approval-dashboard
  namespace: vault-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: approval-dashboard
  template:
    metadata:
      labels:
        app: approval-dashboard
    spec:
      serviceAccountName: approval-dashboard
      containers:
      - name: dashboard
        image: vault-approval-dashboard:latest
        env:
        - name: VAULT_ADDR
          value: "https://vault.vault-system.svc:8200"
        - name: VAULT_TOKEN
          valueFrom:
            secretKeyRef:
              name: dashboard-token
              key: token
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: approval-dashboard
  namespace: vault-system
spec:
  selector:
    app: approval-dashboard
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: approval-dashboard
  namespace: vault-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - approvals.example.com
    secretName: approvals-tls
  rules:
  - host: approvals.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: approval-dashboard
            port:
              number: 80
```

## Monitoring Control Group Activity

Track control group operations with audit logs:

```bash
# Query control group requests
kubectl exec -n vault-system vault-0 -- cat /vault/logs/audit.log | \
    jq 'select((.request.path // "") | startswith("sys/control-group"))'

# Find failed unwrap attempts, including expired or invalid wrapping tokens
kubectl exec -n vault-system vault-0 -- cat /vault/logs/audit.log | \
    jq 'select((.request.path // "") == "sys/wrapping/unwrap" and (.error != null))'
```

If your approval dashboard exports its own metrics, set up Prometheus alerts for pending and expired requests:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: control-group-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: vault-control-groups
      rules:
      - alert: ControlGroupRequestExpired
        expr: vault_control_group_expired_requests > 0
        labels:
          severity: warning
        annotations:
          summary: "Control group requests expired without approval"

      - alert: HighPendingApprovals
        expr: vault_control_group_pending_requests > 10
        labels:
          severity: info
        annotations:
          summary: "Large backlog of pending approvals"
```

## Best Practices

Set appropriate `ttl` values for control group authorization windows. Balance urgency with security by allowing enough time for approval without creating excessive risk windows.

Ensure approver groups have sufficient members to prevent bottlenecks. If approvals require 3 people but only 3 are authorized, any unavailability blocks access.

Implement notification systems to alert approvers of pending requests. Email, Slack, or PagerDuty integration reduces approval latency.

Audit approval patterns regularly. Identify frequently requested secrets that might benefit from different access patterns or additional automation.

Document escalation procedures for urgent access needs. Define circumstances where emergency access bypasses control groups and requires post-hoc review.

## Conclusion

Control groups transform Vault into a collaborative secret management system with built-in oversight. By requiring multiple approvals for sensitive operations, you reduce the risk of unauthorized access while maintaining audit trails of who requested and approved each secret access. This pattern is essential for organizations with regulatory requirements or high-security environments where separation of duties matters.

Implement control groups for your most sensitive secrets to add robust authorization workflows without sacrificing operational efficiency.
