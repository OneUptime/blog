# How to Automate Portainer User Onboarding - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Automation, Users, RBAC

Description: Automate the process of onboarding new users to Portainer including creating accounts, assigning teams, and granting environment access via the API.

## Introduction

As teams grow, manually onboarding new users to Portainer becomes tedious. The Portainer API provides endpoints to create users, assign teams, and grant environment access programmatically. This guide shows how to build an automated user onboarding workflow.

## Prerequisites

- Portainer BE (for advanced RBAC and teams)
- Admin access token
- Python 3.8+ with `requests` installed, or shell scripting

## The Onboarding Script

```python
#!/usr/bin/env python3
# onboard_user.py

import requests
import secrets
import string
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

PORTAINER_URL = "https://portainer.example.com"
ADMIN_API_KEY = "your-admin-api-key"
SMTP_HOST = "smtp.example.com"
SMTP_PORT = 587
SMTP_USER = "noreply@example.com"
SMTP_PASS = "smtp-password"

headers = {"X-API-Key": ADMIN_API_KEY, "Content-Type": "application/json"}


def generate_password(length=16) -> str:
    """Generate a secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def create_user(username: str, password: str, role: int = 2) -> dict:
    """
    Create a new Portainer user.
    role: 1=Administrator, 2=Standard User
    """
    resp = requests.post(
        f"{PORTAINER_URL}/api/users",
        headers=headers,
        json={"Username": username, "Password": password, "Role": role}
    )
    resp.raise_for_status()
    return resp.json()


def get_teams() -> list:
    """Get all teams."""
    resp = requests.get(f"{PORTAINER_URL}/api/teams", headers=headers)
    resp.raise_for_status()
    return resp.json()


def get_roles() -> list:
    """Get all available RBAC roles."""
    resp = requests.get(f"{PORTAINER_URL}/api/roles", headers=headers)
    resp.raise_for_status()
    return resp.json()


def get_role_id_by_name(name: str) -> int:
    """Find an RBAC role ID by role name."""
    for role in get_roles():
        if role["Name"].lower() == name.lower():
            return role["Id"]
    raise ValueError(f"Role not found: {name}")


def get_team_by_name(name: str) -> Optional[dict]:
    """Find a team by name."""
    teams = get_teams()
    for team in teams:
        if team['Name'].lower() == name.lower():
            return team
    return None


def create_team(name: str) -> dict:
    """Create a new team."""
    resp = requests.post(
        f"{PORTAINER_URL}/api/teams",
        headers=headers,
        json={"Name": name}
    )
    resp.raise_for_status()
    return resp.json()


def add_user_to_team(user_id: int, team_id: int, role: int = 2) -> bool:
    """
    Add user to a team.
    role: 1=Leader, 2=Regular Member
    """
    resp = requests.post(
        f"{PORTAINER_URL}/api/team_memberships",
        headers=headers,
        json={"UserID": user_id, "TeamID": team_id, "Role": role}
    )
    resp.raise_for_status()
    return True


def grant_environment_access(endpoint_id: int, user_id: int, role_id: int) -> bool:
    """
    Grant user access to an environment.
    role_id must be a valid Portainer RBAC role ID from /api/roles.
    """
    # Get current endpoint
    resp = requests.get(
        f"{PORTAINER_URL}/api/endpoints/{endpoint_id}",
        headers=headers
    )
    resp.raise_for_status()
    endpoint = resp.json()
    
    # Add user access policy
    user_policies = endpoint.get('UserAccessPolicies', {})
    user_policies[str(user_id)] = {"RoleId": role_id}
    
    resp = requests.put(
        f"{PORTAINER_URL}/api/endpoints/{endpoint_id}",
        headers=headers,
        json={"UserAccessPolicies": user_policies}
    )
    resp.raise_for_status()
    return True


def send_welcome_email(to_email: str, username: str, password: str, team: str):
    """Send welcome email with credentials."""
    msg = MIMEMultipart("alternative")
    msg['Subject'] = "Welcome to Portainer - Your Access Credentials"
    msg['From'] = SMTP_USER
    msg['To'] = to_email
    
    html = f"""
    <h2>Welcome to Portainer!</h2>
    <p>Your account has been created. Here are your credentials:</p>
    <ul>
        <li><strong>URL:</strong> {PORTAINER_URL}</li>
        <li><strong>Username:</strong> {username}</li>
        <li><strong>Password:</strong> {password}</li>
        <li><strong>Team:</strong> {team}</li>
    </ul>
    <p>Please change your password after first login.</p>
    <p><a href="{PORTAINER_URL}">Login to Portainer</a></p>
    """
    
    msg.attach(MIMEText(html, 'html'))
    
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())


def onboard_user(
    username: str,
    email: str,
    team_name: str,
    environment_ids: list,
    is_admin: bool = False,
    environment_role: str = "Helpdesk"
):
    """Complete user onboarding workflow."""
    
    print(f"Onboarding user: {username}")
    
    # 1. Generate a secure password
    password = generate_password()
    
    # 2. Create the user
    role = 1 if is_admin else 2
    user = create_user(username, password, role)
    user_id = user['Id']
    print(f"  Created user ID: {user_id}")
    environment_role_id = get_role_id_by_name(environment_role)
    
    # 3. Get or create team
    team = get_team_by_name(team_name)
    if not team:
        team = create_team(team_name)
        print(f"  Created team: {team_name}")
    
    # 4. Add user to team
    if add_user_to_team(user_id, team['Id']):
        print(f"  Added to team: {team_name}")
    
    # 5. Grant environment access
    for env_id in environment_ids:
        if grant_environment_access(env_id, user_id, environment_role_id):
            print(f"  Granted {environment_role} access to environment: {env_id}")
    
    # 6. Send welcome email
    send_welcome_email(email, username, password, team_name)
    print(f"  Welcome email sent to: {email}")
    
    print(f"Onboarding complete for {username}!")
    return {"user_id": user_id, "username": username, "team": team_name}


if __name__ == '__main__':
    if len(sys.argv) > 1:
        if len(sys.argv) < 5:
            print(
                f"Usage: {sys.argv[0]} USERNAME EMAIL TEAM ENV_IDS [IS_ADMIN] [ENVIRONMENT_ROLE]",
                file=sys.stderr
            )
            sys.exit(1)

        onboard_user(
            username=sys.argv[1],
            email=sys.argv[2],
            team_name=sys.argv[3],
            environment_ids=[
                int(env_id.strip())
                for env_id in sys.argv[4].replace(",", ";").split(";")
                if env_id.strip()
            ],
            is_admin=len(sys.argv) > 5 and sys.argv[5].lower() in {"1", "true", "yes"},
            environment_role=sys.argv[6] if len(sys.argv) > 6 else "Helpdesk"
        )
    else:
        # Example usage
        onboard_user(
            username="jdoe",
            email="jdoe@example.com",
            team_name="backend-team",
            environment_ids=[1, 2],  # Development and Staging
            is_admin=False,
            environment_role="Helpdesk"
        )
```

## Bulk Onboarding from CSV

```bash
#!/bin/bash
# bulk-onboard.sh

# CSV format: username,email,team,env_ids(;separated)

CSV_FILE="${1:-users.csv}"

while IFS=',' read -r username email team env_ids; do
  # Skip header
  [[ "$username" == "username" ]] && continue
  
  python3 onboard_user.py "$username" "$email" "$team" "$env_ids"
  echo "Onboarded: $username"
  sleep 1  # Rate limiting
done < "$CSV_FILE"

echo "Bulk onboarding complete"
```

## LDAP Auto-Provisioning (Portainer BE)

```bash
# Configure LDAP authentication and automatic user provisioning
curl -X PUT \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "AuthenticationMethod": 2,
    "LDAPSettings": {
      "AutoCreateUsers": true,
      "URLs": ["ldap.example.com:389"],
      "ReaderDN": "cn=readonly,dc=example,dc=com",
      "Password": "readonly-password",
      "SearchSettings": [{
        "BaseDN": "ou=people,dc=example,dc=com",
        "Filter": "(objectClass=person)",
        "UserNameAttribute": "uid"
      }],
      "GroupSearchSettings": [{
        "GroupBaseDN": "ou=groups,dc=example,dc=com",
        "GroupFilter": "(&(objectClass=groupOfNames)(cn=Portainer*))",
        "GroupAttribute": "member"
      }]
    }
  }' \
  "https://portainer.example.com/api/settings"
```

## Conclusion

Automated user onboarding saves administrators time and ensures consistent access configuration. The Python script handles the full workflow from account creation to environment access to welcome email delivery. For organizations using LDAP with Portainer Business Edition, auto-provisioning can remove most manual steps, allowing users to log in immediately with their corporate credentials when directory groups match Portainer teams.
