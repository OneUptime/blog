# How to Automate Portainer User Onboarding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Automation, User Management, DevOps, Scripting

Description: Learn how to use the Portainer API to automate user creation, team assignment, and environment access provisioning for new team members.

---

Manually onboarding new users in Portainer - creating accounts, assigning teams, granting environment access - doesn't scale. The Portainer API lets you automate the entire process: create users, assign them to teams, and grant environment-level permissions in a single script run. This is useful for HR-triggered provisioning, CI/CD user management, or team bootstrapping.

---

## Step 1: Get Your Admin API Key

In Portainer UI:
1. Click your username → **My Account**
2. Go to **Access tokens > Add access token**
3. Enter `onboarding-automation` as the token description
4. Re-enter your password when prompted
5. Copy the token

---

## Step 2: Create a New User

```bash
#!/bin/bash
# portainer-onboard.sh - automate user creation and access setup

PORTAINER_URL="https://portainer.example.com"
ADMIN_TOKEN="ptr_your_admin_token_here"

# Function: create a new user

create_user() {
  local username="$1"
  local password="$2"
  local role="${3:-2}"   # 1 = Admin, 2 = Standard User
  local user_response
  local user_id

  echo "Creating user: $username" >&2
  user_response=$(curl -s -X POST \
    -H "X-API-Key: $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"Username\": \"$username\",
      \"Password\": \"$password\",
      \"Role\": $role
    }" \
    "$PORTAINER_URL/api/users")

  user_id=$(printf '%s' "$user_response" | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")
  echo "Created user '$username' with ID: $user_id" >&2
  printf '%s\n' "$user_id"
}
```

---

## Step 3: List Teams and Find Team ID

```bash
# List all teams
get_team_id() {
  local team_name="$1"
  local team_id

  team_id=$(curl -s \
    -H "X-API-Key: $ADMIN_TOKEN" \
    "$PORTAINER_URL/api/teams" | \
    python3 -c "
import sys, json
team_name = sys.argv[1]
teams = json.load(sys.stdin)
for t in teams:
    if t['Name'] == team_name:
        print(t['Id'])
        break
" "$team_name")
  printf '%s\n' "$team_id"
}
```

---

## Step 4: Add User to a Team

```bash
add_user_to_team() {
  local user_id="$1"
  local team_id="$2"
  local membership_role="${3:-2}"  # 1 = Team Leader, 2 = Team Member

  echo "Adding user $user_id to team $team_id" >&2
  curl -s -X POST \
    -H "X-API-Key: $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"UserID\": $user_id, \"TeamID\": $team_id, \"Role\": $membership_role}" \
    "$PORTAINER_URL/api/team_memberships" > /dev/null
  echo "User added to team." >&2
}
```

---

## Step 5: Grant Environment Access

Use `GET /api/roles` to look up the role ID you want to assign to the team for the environment. Because the endpoint update call replaces `TeamAccessPolicies`, fetch the current environment access first and merge the new team into the existing policy map.

```bash
grant_environment_access() {
  local endpoint_id="$1"
  local team_id="$2"
  local role_id="$3"
  local access_payload

  echo "Granting team $team_id access to environment $endpoint_id (role ID: $role_id)" >&2
  access_payload=$(curl -s \
    -H "X-API-Key: $ADMIN_TOKEN" \
    "$PORTAINER_URL/api/endpoints/$endpoint_id" | \
    python3 -c "
import json, sys
team_id = sys.argv[1]
role_id = int(sys.argv[2])
endpoint = json.load(sys.stdin)
policies = endpoint.get('TeamAccessPolicies') or {}
policies[str(team_id)] = {'RoleId': role_id}
print(json.dumps({'TeamAccessPolicies': policies}))
" "$team_id" "$role_id")

  curl -s -X PUT \
    -H "X-API-Key: $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$access_payload" \
    "$PORTAINER_URL/api/endpoints/$endpoint_id" > /dev/null
  echo "Access granted." >&2
}
```

---

## Step 6: Full Onboarding Script

```bash
# Complete onboarding for a new team member
NEW_USERNAME="john.doe"
NEW_PASSWORD=$(openssl rand -base64 16)  # generate random temp password
TEAM_NAME="developers"
ENVIRONMENT_ID="3"  # get from: GET /api/endpoints
ROLE_ID="1"         # example only; replace with a role ID from: GET /api/roles

# Run onboarding steps
USER_ID=$(create_user "$NEW_USERNAME" "$NEW_PASSWORD" 2)
TEAM_ID=$(get_team_id "$TEAM_NAME")
add_user_to_team "$USER_ID" "$TEAM_ID"
grant_environment_access "$ENVIRONMENT_ID" "$TEAM_ID" "$ROLE_ID"

echo ""
echo "=== Onboarding Complete ==="
echo "Username: $NEW_USERNAME"
echo "Temp Password: $NEW_PASSWORD"
echo "Team: $TEAM_NAME"
echo "Environment Role ID: $ROLE_ID"
echo "(Ask the user to change this password after first login)"
```

---

## Step 7: Send Welcome Email

Integrate with your email system to notify new users of their credentials.

```python
# send_welcome_email.py - send onboarding credentials to new user
import smtplib
from email.message import EmailMessage

def send_welcome(username: str, password: str, portainer_url: str):
    msg = EmailMessage()
    msg["From"] = "devops@example.com"
    msg["To"] = f"{username}@example.com"
    msg["Subject"] = "Your Portainer Access"
    msg.set_content(f"""
Welcome to Portainer!

URL: {portainer_url}
Username: {username}
Temporary Password: {password}

Please log in and change your password immediately.
""")
    with smtplib.SMTP("smtp.example.com", 587) as smtp:
        smtp.starttls()
        smtp.login("devops@example.com", "smtp-password")
        smtp.send_message(msg)
```

---

## Summary

The Portainer API provides full control over user lifecycle management. Combining `POST /api/users`, team membership APIs, and endpoint access policies into a single onboarding script makes it easy to provision new users consistently and repeatably - or to integrate user creation into your existing HR or identity management workflows.
