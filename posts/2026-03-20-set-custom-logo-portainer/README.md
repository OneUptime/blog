# How to Set a Custom Logo in Portainer - Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Customization, Branding, Business Edition, UI

Description: Learn how to replace the default Portainer logo with your own organization's branding in Portainer Business Edition.

---

Portainer allows organizations to customize the interface by replacing the default Portainer logo with a custom image. This is useful for MSPs and enterprises delivering Portainer as a managed service.

## Prerequisites

- Portainer Community Edition or Business Edition
- Admin access to the Portainer UI
- Logo image hosted at a URL reachable by users' browsers (PNG, SVG, or JPEG)

## Set Custom Logo via the UI

### Step 1: Prepare Your Logo

Your logo should:
- Use an HTTPS URL reachable by users' browsers when possible
- Have a transparent background for best results (PNG or SVG recommended)
- Ideally be 155×55 pixels or a similar landscape format

Example: `https://example.com/images/company-logo.png`

### Step 2: Navigate to Customization Settings

1. Log in to Portainer as an administrator
2. Go to **Settings** in the left sidebar
3. Stay on **General**
4. Find **Use custom logo**

### Step 3: Enter the Logo URL

Toggle **Use custom logo** on, paste the full URL to your logo image, and click **Apply Changes**. The logo appears in the top-left of the Portainer interface.

## Set Custom Logo via API

```bash
# Authenticate

TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Set custom logo URL
curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "LogoURL": "https://your-company.com/assets/logo.png"
  }' \
  --insecure

echo "Custom logo configured"
```

## Hosting Your Logo for Portainer

If your logo isn't already hosted, you can host it inside the same Docker environment:

```yaml
# docker-compose.yml - Include a simple nginx server to host the logo
services:
  portainer:
    image: portainer/portainer-ee:latest
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

  logo-server:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      # Place your logo.png in ./static/
      - ./static:/usr/share/nginx/html:ro

volumes:
  portainer_data:
```

Then set the logo URL to `http://<host-ip-or-dns>:8080/logo.png` so users' browsers can fetch the image.

## Remove Custom Logo

To restore the default Portainer logo:

```bash
# Clear the LogoURL by setting it to an empty string
curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"LogoURL": ""}' \
  --insecure
```

---

*Deliver a branded container management experience and monitor it with [OneUptime](https://oneuptime.com).*
