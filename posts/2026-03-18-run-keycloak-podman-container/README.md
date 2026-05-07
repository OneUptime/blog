# How to Run Keycloak in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Keycloak, Authentication, Identity Management, SSO

Description: Learn how to run Keycloak in a Podman container for identity and access management with realms, users, and SSO configuration.

---

> Keycloak in Podman provides a full-featured identity and access management platform in a rootless container with SSO and OAuth2 support.

Keycloak is an open-source identity and access management solution that provides single sign-on (SSO), social login, user federation, and fine-grained authorization. Running it in a Podman container gives you a complete IAM platform for development and testing without any host-level installation. This guide covers setup, realm configuration, user management, and client registration.

---

## Pulling the Keycloak Image

Download the official Keycloak image.

```bash
# Pull the latest Keycloak image

podman pull quay.io/keycloak/keycloak:latest

# Verify the image
podman images | grep keycloak
```

## Running Keycloak in Dev Mode

Start Keycloak in development mode for quick testing.

```bash
# Run Keycloak in dev mode with admin credentials
podman run -d \
  --name my-keycloak \
  -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin-secret \
  quay.io/keycloak/keycloak:latest start-dev

# Wait for Keycloak to start (takes about 30 seconds)
sleep 30

# Check the container is running
podman ps

# Verify Keycloak is responding
curl -s http://localhost:8080/realms/master | python3 -m json.tool | head -10

# Access the admin console
echo "Open http://localhost:8080/admin in your browser"
echo "Username: admin"
echo "Password: admin-secret"
```

## Persistent Data with a Database

Use a PostgreSQL database for persistent Keycloak data.

```bash
# Create a pod for Keycloak and PostgreSQL
podman rm -f my-keycloak

podman pod create \
  --name keycloak-pod \
  -p 8080:8080

# Run PostgreSQL in the pod
podman run -d \
  --pod keycloak-pod \
  --name keycloak-db \
  -e POSTGRES_DB=keycloak \
  -e POSTGRES_USER=keycloak \
  -e POSTGRES_PASSWORD=keycloak-db-secret \
  -v keycloak-db-data:/var/lib/postgresql/data:Z \
  postgres:16

# Wait for PostgreSQL to initialize
sleep 5

# Run Keycloak connected to PostgreSQL
podman run -d \
  --pod keycloak-pod \
  --name keycloak-app \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin-secret \
  -e KC_DB=postgres \
  -e KC_DB_URL=jdbc:postgresql://localhost:5432/keycloak \
  -e KC_DB_USERNAME=keycloak \
  -e KC_DB_PASSWORD=keycloak-db-secret \
  quay.io/keycloak/keycloak:latest start-dev
```

## Creating a Realm

Set up a new realm for your application using the Admin REST API.

```bash
# Get an admin access token
ACCESS_TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin-secret" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Create a new realm
curl -s -X POST "http://localhost:8080/admin/realms" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "realm": "myapp",
    "enabled": true,
    "displayName": "My Application Realm",
    "registrationAllowed": true,
    "loginWithEmailAllowed": true
  }'

# Verify the realm was created
curl -s "http://localhost:8080/realms/myapp" | python3 -m json.tool | head -10
```

## Creating Users

Add users to your realm programmatically.

```bash
# Create a user in the myapp realm
curl -s -X POST "http://localhost:8080/admin/realms/myapp/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "testuser@example.com",
    "firstName": "Test",
    "lastName": "User",
    "enabled": true,
    "credentials": [{
      "type": "password",
      "value": "test-password",
      "temporary": false
    }]
  }'

# List users in the realm
curl -s "http://localhost:8080/admin/realms/myapp/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

## Registering a Client Application

Create an OAuth2 client for your application.

```bash
# Create an OpenID Connect client
curl -s -X POST "http://localhost:8080/admin/realms/myapp/clients" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "my-web-app",
    "name": "My Web Application",
    "enabled": true,
    "publicClient": true,
    "redirectUris": ["http://localhost:3000/*"],
    "webOrigins": ["http://localhost:3000"],
    "protocol": "openid-connect",
    "standardFlowEnabled": true,
    "directAccessGrantsEnabled": true
  }'

# List all clients
curl -s "http://localhost:8080/admin/realms/myapp/clients" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool | head -30
```

## Testing Authentication

Authenticate a user and obtain tokens.

```bash
# Get tokens for the test user
curl -s -X POST "http://localhost:8080/realms/myapp/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser" \
  -d "password=test-password" \
  -d "grant_type=password" \
  -d "client_id=my-web-app" | python3 -m json.tool | head -10

# Get the OpenID Connect discovery endpoint
curl -s "http://localhost:8080/realms/myapp/.well-known/openid-configuration" | python3 -m json.tool | head -15
```

## Managing the Container

Common management operations.

```bash
# View Keycloak logs
podman logs my-keycloak

# Stop and start
podman stop my-keycloak
podman start my-keycloak

# Remove standalone container
podman rm -f my-keycloak

# Remove the pod and all containers
podman pod rm -f keycloak-pod
podman volume rm keycloak-db-data
```

## Summary

Running Keycloak in a Podman container provides a complete identity and access management platform with SSO, OAuth2, and OpenID Connect support. Dev mode gets you started instantly, while a PostgreSQL backend ensures data persistence for more permanent setups. The Admin REST API enables programmatic management of realms, users, and client applications. Keycloak's built-in admin console provides visual management of your identity infrastructure. Podman's rootless execution adds security isolation, making this setup ideal for developing and testing authentication flows.
