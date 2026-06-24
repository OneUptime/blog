# How to Set Up Student Environments with Portainer Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Education, Team, RBAC, Student Environments

Description: Configure Portainer team-based access control to give each student an isolated container environment for hands-on learning.

## Introduction

Portainer Business Edition's team and RBAC features allow instructors to create isolated environments where each student or lab group has their own namespace with dedicated resources. Students can experiment freely without affecting each other's work. This guide covers setting up teams, assigning environments, applying resource quotas, and managing a classroom of container environments.

## Architecture Overview

```text
Portainer Instance
├── Admin Account (Instructor)
├── Team: class-a-fall2025
│   ├── Student User: alice
│   ├── Student User: bob
│   └── Environment: dev-cluster (namespace: class-a)
├── Team: class-b-fall2025
│   ├── Student User: charlie
│   └── Environment: dev-cluster (namespace: class-b)
```

## Step 1: Create Teams for Each Class/Group

In Portainer: **User-related > Teams > Add Team**

Or via API:

```bash
#!/bin/bash
PORTAINER_URL="https://portainer.edu.local"
ACCESS_TOKEN="your-portainer-access-token"

# Create a team for each lab group

for group_num in $(seq 1 10); do
  TEAM_NAME="lab-group-${group_num}"
  
  RESPONSE=$(curl -s -X POST \
    -H "X-API-Key: $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"Name\":\"$TEAM_NAME\"}" \
    "$PORTAINER_URL/api/teams")
  
  TEAM_ID=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")
  echo "Created team $TEAM_NAME with ID: $TEAM_ID"
  echo "$TEAM_NAME,$TEAM_ID" >> teams.csv
done
```

## Step 2: Create Student User Accounts

This example assumes Portainer is using internal authentication, because password-based user creation is not allowed when LDAP or OAuth authentication is enabled.

```bash
#!/bin/bash
PORTAINER_URL="https://portainer.edu.local"
ACCESS_TOKEN="your-portainer-access-token"
OUTPUT_FILE="student-passwords.csv"

echo "username,password,team" > $OUTPUT_FILE

# Process students.csv: firstname,lastname,team_name
while IFS=',' read -r firstname lastname team_name; do
  username=$(echo "${firstname,,}.${lastname,,}" | tr ' ' '.')
  password="Docker$(shuf -i 1000-9999 -n 1)!"
  
  # Create user (role 2 = Standard User)
  USER_RESPONSE=$(curl -s -X POST \
    -H "X-API-Key: $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"Username\":\"$username\",\"Password\":\"$password\",\"Role\":2}" \
    "$PORTAINER_URL/api/users")
  
  USER_ID=$(echo $USER_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])" 2>/dev/null)
  
  if [ -n "$USER_ID" ]; then
    # Get team ID
    TEAM_ID=$(grep "^$team_name," teams.csv | cut -d',' -f2)
    
    # Add user to team (role 2 = team member)
    curl -s -X POST \
      -H "X-API-Key: $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"UserID\":$USER_ID,\"TeamID\":$TEAM_ID,\"Role\":2}" \
      "$PORTAINER_URL/api/team_memberships"
    
    echo "$username,$password,$team_name" >> $OUTPUT_FILE
    echo "Created: $username in $team_name"
  else
    echo "Failed to create: $username"
  fi
done < students.csv

echo "Student passwords saved to: $OUTPUT_FILE"
```

## Step 3: Assign Environments to Teams

After creating teams, grant them access to specific environments:

```bash
PORTAINER_URL="https://portainer.edu.local"
ACCESS_TOKEN="your-portainer-access-token"

# Get available environments (endpoints)
curl -s \
  -H "X-API-Key: $ACCESS_TOKEN" \
  "$PORTAINER_URL/api/endpoints" | \
  python3 -m json.tool | grep -E '"Id"|"Name"'

# Assign a team to an environment with Standard User access
# Common RoleId values in Portainer BE: 1=Environment Administrator, 2=Helpdesk,
# 3=Standard User, 4=Read-Only User, 5=Operator
ENDPOINT_ID=1
TEAM_ID=3

curl -s -X PUT \
  -H "X-API-Key: $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"TeamAccessPolicies\":{\"$TEAM_ID\":{\"RoleId\":3}}}" \
  "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID"
```

## Step 4: Create Kubernetes Namespaces Per Team

For Kubernetes environments, isolate each team in their own namespace:

```bash
#!/bin/bash
# create-namespaces.sh
while IFS=',' read -r team_name team_id; do
  NAMESPACE="student-${team_name}"
  
  kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
  
  # Apply resource quotas
  kubectl apply -f - << EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: student-quota
  namespace: $NAMESPACE
spec:
  hard:
    pods: "10"
    requests.cpu: "2"
    requests.memory: "4Gi"
    limits.cpu: "4"
    limits.memory: "8Gi"
    persistentvolumeclaims: "5"
    requests.storage: "20Gi"
EOF

  echo "Created namespace: $NAMESPACE"
done < teams.csv
```

## Step 5: Configure Portainer Namespace Access

Kubernetes RBAC must be enabled and working before namespace access control will work in Portainer.

In Portainer: **Namespaces > Manage access**

Assign the corresponding team to each namespace.

## Step 6: Set Up Lab Exercises as App Templates

Create reusable templates for lab exercises:

```json
{
  "version": "2",
  "templates": [
    {
      "type": 3,
      "title": "Lab 01: Nginx + Go App",
      "description": "Deploy Nginx in front of a Go web app",
      "note": "Access using the environment's public URL on port 80 after deployment",
      "categories": ["lab", "beginner"],
      "repository": {
        "url": "https://github.com/docker/awesome-compose",
        "stackfile": "nginx-golang/compose.yaml"
      }
    },
    {
      "type": 3,
      "title": "Lab 03: WordPress + MySQL",
      "description": "Multi-container app with persistent data",
      "categories": ["lab", "intermediate"],
      "repository": {
        "url": "https://github.com/docker/awesome-compose",
        "stackfile": "wordpress-mysql/compose.yaml"
      }
    }
  ]
}
```

Upload templates in Portainer: **Settings > General > App Templates** and provide the external URL.

## Step 7: Monitor Student Progress

```bash
#!/bin/bash
# check-student-activity.sh
PORTAINER_URL="https://portainer.edu.local"
ACCESS_TOKEN="your-portainer-access-token"

echo "=== Student Environment Activity Report ==="
echo "Generated: $(date)"
echo ""

curl -s \
  -H "X-API-Key: $ACCESS_TOKEN" \
  "$PORTAINER_URL/api/endpoints/1/docker/containers/json?all=true" | \
  python3 -c "
import sys, json
containers = json.load(sys.stdin)
running = sum(1 for c in containers if c['State'] == 'running')
total = len(containers)
print(f'Total containers: {total}')
print(f'Running: {running}')
print(f'Stopped: {total - running}')
print()
for c in sorted(containers, key=lambda x: x['Created'], reverse=True)[:20]:
    name = c['Names'][0].lstrip('/') if c['Names'] else 'unnamed'
    print(f\"  {c['State']:8} | {name}\")
"
```

## Conclusion

Portainer Business Edition's team-based access control enables scalable student environment management. Each team gets isolated access to their namespace with appropriate resource quotas, preventing interference between groups. The API-driven provisioning scripts allow instructors to set up an entire classroom in minutes. Combined with app templates for lab exercises, Portainer creates a structured, repeatable learning environment that scales from a single class to an entire department.
