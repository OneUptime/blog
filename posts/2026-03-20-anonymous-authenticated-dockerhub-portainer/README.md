# How to Configure Anonymous vs Authenticated Docker Hub Access in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Hub, Authentication, Rate Limiting, Container Management

Description: Learn the differences between anonymous and authenticated Docker Hub access in Portainer and how to configure each.

## Docker Hub Rate Limits

Understanding Docker Hub's rate limits helps you decide when authentication is necessary:

| Access Type | Pull Limit |
|-------------|-----------|
| Anonymous | 100 pulls per 6 hours per IP |
| Free authenticated account | 200 pulls per 6 hours |
| Docker Pro | Unlimited |
| Docker Team/Business | Unlimited |

In shared environments like CI servers or Swarm clusters where multiple nodes share an IP, anonymous limits are exhausted quickly.

## Anonymous Access (Default)

By default, Portainer provides built-in support for anonymous Docker Hub access. No configuration is needed. Public images can be pulled without configured Docker Hub credentials.

This is fine for:
- Personal/home lab use
- Environments pulling infrequently
- Only needing public images

## Authenticated Access

For production environments, add your Docker Hub username and personal access token to avoid rate limiting and enable private image access.

### Adding Credentials in Portainer

1. Go to **Registries**.
2. Click **Add registry** and select **DockerHub**.
3. Enter a name, your Docker Hub username, and your Docker Hub access token.
4. Click **Test connection**.
5. After the test succeeds, click **Add registry**.

### Creating a Docker Hub Access Token

```bash
# In the Docker Hub UI:

# Docker Home > Account settings > Personal access tokens > Generate new token
# Use a description like "portainer-<environment>" for easy identification

# Test the token from CLI
echo 'your-personal-access-token' | docker login \
  --username your-username \
  --password-stdin
```

## Checking Your Current Rate Limit Status

```bash
# Check remaining rate limit anonymously
TOKEN=$(curl -fsSL \
  "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" \
  | jq -r .token)

# For an authenticated check, Docker documents this token request instead:
# TOKEN=$(curl -fsSL --user 'your-username:your-password' \
#   "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" \
#   | jq -r .token)

curl --head \
  -H "Authorization: Bearer $TOKEN" \
  https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest \
  | grep -i "ratelimit"
```

## When to Use Each Approach

**Use anonymous access when:**
- Running a small personal Portainer instance
- Pull frequency is low (< 10 pulls/hour across all nodes)

**Use authenticated access when:**
- Running production Swarm or Kubernetes clusters
- Multiple nodes need to pull images simultaneously
- You need access to private Docker Hub repositories
- You want consistent and predictable pull availability

## Switching from Anonymous to Authenticated

After adding credentials to Portainer, existing deployments continue working. Future pulls and image updates can use the authenticated registry configuration.

## Conclusion

Authenticated Docker Hub access is a simple configuration change in Portainer that prevents rate limit errors at scale. Use access tokens instead of passwords for better security, and rotate them periodically.
