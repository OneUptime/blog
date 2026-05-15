# How to Set Up Podman Secret Management for Sensitive Data on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Linux

Description: Step-by-step guide on set up podman secret management for sensitive data using Red Hat Enterprise Linux 9.

---

Podman secrets provide a secure way to pass sensitive data like passwords, API keys, and certificates to containers without embedding them in images or source-controlled configuration files.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Podman installed through the `container-tools` package

## Step 1: Install Podman

Install the RHEL container tools package if Podman is not already available:

```bash
sudo dnf install -y container-tools
```

Confirm Podman is installed:

```bash
podman --version
```

## Step 2: Create a Secret

Create a secret from standard input:

```bash
# Create a secret named db_password
printf '%s' 'replace-with-real-password' | podman secret create db_password -

# List available secrets
podman secret ls

# Inspect metadata for the secret
podman secret inspect db_password
```

Podman stores the secret separately from the container image. The secret is available to containers only when you explicitly pass it with the `--secret` option.

## Step 3: Use the Secret in a Container

By default, Podman mounts a secret as a file under `/run/secrets/<secret-name>` inside the container.

```bash
# Mount the secret in a test container
podman run --rm --secret db_password docker.io/library/alpine \
  sh -c 'test -f /run/secrets/db_password && echo "Secret mounted"'
```

You can also expose a secret as an environment variable when an application requires that format:

```bash
podman run --rm --secret db_password,type=env,target=DB_PASSWORD docker.io/library/alpine \
  sh -c 'test -n "$DB_PASSWORD" && echo "Secret environment variable is set"'
```

## Verification

Confirm everything is working by checking Podman and the secret metadata:

```bash
# Verify Podman is working
podman info

# Confirm the secret exists
podman secret exists db_password

# Inspect the secret metadata
podman secret inspect db_password
```

## Troubleshooting

- If `podman secret create` fails, confirm Podman is installed with `rpm -q podman`.
- If the container cannot access the secret, confirm the container was started with `--secret db_password`.
- For container issues, check container logs with `podman logs <container-name>` when the container is not removed with `--rm`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to rotate secrets regularly, avoid printing real secret values in logs, and keep your RHEL system updated with the latest security patches.
