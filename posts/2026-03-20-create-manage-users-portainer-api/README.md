# How to Create and Manage Users via the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, User Management, Automation, Access Control

Description: Learn how to create, update, and manage Portainer users programmatically using the REST API.

## User Management Endpoints

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/users` | List all users |
| GET | `/api/users/{id}` | Get a specific user |
| POST | `/api/users` | Create a new user |
| PUT | `/api/users/{id}` | Update a user |
| DELETE | `/api/users/{id}` | Delete a user |
| GET | `/api/users/{id}/memberships` | Get team memberships |

## Listing All Users

```bash
# List all users

curl -s "https://portainer.mycompany.com/api/users" \
  -H "Authorization: Bearer ${API_TOKEN}" | \
  jq '[.[] | {id: .Id, username: .Username, role: .Role}]'
```

User roles:
- **1** = Administrator
- **2** = Standard user

## Creating a New User

```bash
# Create a standard user
curl -X POST "https://portainer.mycompany.com/api/users" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Username": "jane.smith",
    "Password": "Temp@ssword123!",
    "Role": 2
  }'

# Create an administrator
curl -X POST "https://portainer.mycompany.com/api/users" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Username": "john.doe",
    "Password": "Adm1n@ssword!",
    "Role": 1
  }'
```

## Updating a User

```bash
# Change a user's password (admin only needs NewPassword)
curl -X PUT "https://portainer.mycompany.com/api/users/5" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "NewPassword": "NewP@ssword456!",
    "Role": 2
  }'

# Promote a user to administrator
curl -X PUT "https://portainer.mycompany.com/api/users/5" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"Role": 1}'
```

## Deleting a User

```bash
# Delete user by ID
curl -X DELETE "https://portainer.mycompany.com/api/users/5" \
  -H "Authorization: Bearer ${API_TOKEN}"
```

## Bulk User Creation Script

```bash
#!/bin/bash
# Create multiple users from a CSV file (username,password,role)
# CSV format: username,password,role

API_TOKEN="your_token"
PORTAINER_URL="https://portainer.mycompany.com"

while IFS=',' read -r username password role; do
  echo "Creating user: ${username} with role ${role}"

  RESPONSE=$(curl -s -X POST "${PORTAINER_URL}/api/users" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"Username\": \"${username}\",
      \"Password\": \"${password}\",
      \"Role\": ${role}
    }")

  USER_ID=$(echo $RESPONSE | jq '.Id')
  echo "  Created with ID: ${USER_ID}"
done < users.csv
```

## Assigning Users to Teams

```bash
# Create a team first
TEAM_ID=$(curl -s -X POST "${PORTAINER_URL}/api/teams" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"Name": "frontend-team"}' | jq '.Id')

# Add a user to the team
curl -X POST "${PORTAINER_URL}/api/team_memberships" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"TeamID\": ${TEAM_ID},
    \"UserID\": 5,
    \"Role\": 2
  }"
```

Team membership roles:
- **1** = Team Leader
- **2** = Team Member

## Conclusion

The Portainer user management API enables automated provisioning for onboarding workflows. Combine it with your company's identity management system to sync users and roles automatically when team members join or leave.
