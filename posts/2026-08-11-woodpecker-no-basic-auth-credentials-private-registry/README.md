# Woodpecker Says “No Basic Auth Credentials”: Fixing Private Registry Hostnames and Pull Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, Container Registry, Kubernetes, Docker

Description: Fix Woodpecker private-image pulls by matching registry hostnames exactly and configuring backend-appropriate pull credentials.

---

“No basic auth credentials” often appears before a Woodpecker step starts because the agent or Kubernetes runtime cannot pull its private image. The key diagnostic is to separate **pull credentials**, which Woodpecker supplies to the backend and does not expose inside the step, from **push credentials**, which a publishing step receives through secrets.

For pulls, Woodpecker matches credentials to the hostname extracted from the image reference. A missing port, a scheme in the wrong field, or an unqualified image that actually resolves to Docker Hub is enough to select no credential.

## Identify Which Operation Failed

Look at the pipeline and backend logs:

- Failure while preparing a step or service image: configure Woodpecker registry pull credentials.
- Kubernetes `ErrImagePull` or `ImagePullBackOff`: inspect Pod events and image pull secrets.
- Failure inside a running `docker push`, Buildx plugin, or release step: inject push credentials into that step or plugin.
- A Git failure inside an already-running clone step: registry settings are unrelated; inspect forge clone credentials.

Do not add a registry password to the step environment when the container never started. The process cannot use a variable inside an image that the backend failed to pull.

## Match the Image's Registry Host

Woodpecker's current registry documentation gives these examples:

- `gcr.io/foo/bar` has hostname `gcr.io`;
- `foo/bar` has hostname `docker.io`;
- `qux.com:8000/foo/bar` has hostname `qux.com:8000`.

The registry entry must use the corresponding host and port:

~~~text
Image:     registry.example.com:5443/acme/api:2026.08
Registry:  registry.example.com:5443
~~~

Do not configure:

~~~text
https://registry.example.com:5443
registry.example.com
registry.example.com:5443/acme
~~~

The credential address is a registry host, not a URL with a scheme or repository path. The explicit port is part of the host match.

For Docker Hub, an unqualified `golang:1.26`, `library/golang:1.26`, and `owner/image:tag` all use `docker.io` under Woodpecker's documented matching rules. Do not enter `registry-1.docker.io` merely because a network trace shows that backend endpoint.

## Add Repository Registry Credentials

In the repository settings, add a registry with:

- hostname exactly matching the image reference;
- username or robot-account identifier;
- token/password with pull permission;
- no scheme or repository suffix.

Then retry with the exact image:

~~~yaml
steps:
  - name: private-build
    image: registry.example.com:5443/acme/build-image:2026.08
    pull: true
    commands:
      - ./build.sh
~~~

`pull: true` asks the backend to check for an updated image. It does not supply authentication. A failed pull remains failed until the matching credentials and registry trust are correct.

Woodpecker keeps pull credentials outside build containers, which makes them suitable for pulling step images in pull-request pipelines. They cannot be reused by a command to push an image.

## Global Registry Configuration

Administrators can provide a Docker configuration file through the server setting `WOODPECKER_DOCKER_CONFIG`:

~~~ini
WOODPECKER_DOCKER_CONFIG=/run/secrets/docker-config.json
~~~

Use global credentials only when every intended repository may pull from that registry. Prefer robot accounts with read-only access to a limited namespace. Persist the file securely, keep it outside workflow workspaces, and rotate it.

Woodpecker also supports registry credentials at repository, user/organization, and global management levels and through a registry extension. For duplicate registry addresses, repository-extension results override global-extension results, extension results override directly configured credentials, and repository entries override user/organization entries, then database global entries, then `WOODPECKER_DOCKER_CONFIG`. The repository registry view cannot show credentials returned dynamically by an extension, so inspect that source separately.

## Kubernetes: Create an Image Pull Secret

The Kubernetes backend can use registries configured in Woodpecker. It can also use Kubernetes Secrets named by the agent.

Create the secret in the workflow Pod's namespace. With the default namespace configuration, this is the namespace configured by `WOODPECKER_BACKEND_K8S_NAMESPACE`:

~~~bash
kubectl -n woodpecker create secret docker-registry private-registry \
  --docker-server=registry.example.com:5443 \
  --docker-username=woodpecker-pull \
  --docker-password="$REGISTRY_PULL_TOKEN"
~~~

Configure the agent:

~~~ini
WOODPECKER_BACKEND_K8S_NAMESPACE=woodpecker
WOODPECKER_BACKEND_K8S_PULL_SECRET_NAMES=private-registry
~~~

Restart or roll out the agent configuration, then inspect a newly created workflow Pod:

~~~bash
kubectl -n woodpecker get pod <pod-name> -o jsonpath='{.spec.imagePullSecrets}'
kubectl -n woodpecker describe pod <pod-name>
~~~

The events at the end of `describe` show the image reference and pull error. A `FailedToRetrieveImagePullSecret` event means Kubernetes could not retrieve a named Secret; events do not reliably identify which matching credential was tried.

Woodpecker 3.0 removed the old Kubernetes backend's hard-coded `regcred` default. Current 3.x installations must set `WOODPECKER_BACKEND_K8S_PULL_SECRET_NAMES` explicitly when referencing Kubernetes pull Secrets through agent configuration. An existing Secret named `regcred` is no longer referenced automatically by Woodpecker; configure the agent to use it or attach it through the workflow Pod's ServiceAccount.

## Namespace-per-Organization Changes the Secret Location

If `WOODPECKER_BACKEND_K8S_NAMESPACE_PER_ORGANIZATION=true`, Woodpecker creates organization-specific worker namespaces. A Secret that exists only in the base `woodpecker` namespace may not exist where the workflow Pod is scheduled.

Confirm the Pod namespace:

~~~bash
kubectl get pods -A -l woodpecker-ci.org/repo-name=api
~~~

Then verify the named pull secret exists there. Kubernetes Secrets are namespaced. Copying credentials automatically into every tenant namespace can weaken isolation, so use an approved controller or provisioning process with per-organization scope rather than an ad hoc broad secret.

## Validate the Registry Credential Directly

Use a safe workstation or isolated agent host:

~~~bash
printf '%s' "$REGISTRY_PULL_TOKEN" | docker login registry.example.com:5443 \
  --username woodpecker-pull \
  --password-stdin
docker pull registry.example.com:5443/acme/build-image:2026.08
docker logout registry.example.com:5443
~~~

This proves the registry account and image permission. It does not prove Woodpecker selected the same credential, so still verify the configured hostname.

Avoid `docker login -p` because the password can appear in shell history or process listings. Never run this diagnostic inside an untrusted pipeline or print the Docker config.

## Check Repository Scope and Token Type

An authenticated account can still lack pull permission. Registry authorization may distinguish:

- login permission;
- catalog access;
- pull on one repository path;
- push on another path;
- token audience or service;
- project membership;
- robot-account expiration.

Test the exact image repository and tag. Pulling `registry.example.com/public/alpine` does not prove access to `registry.example.com/acme/private-api`.

For cloud registries, tokens may be short-lived or require a specific username convention. Follow that registry's official authentication guide. Rotate expired tokens rather than granting a broader static password.

## TLS and Network Failures Can Look Similar

A certificate error is not basic authentication, but proxies and registry front ends sometimes turn upstream TLS or routing problems into a generic authorization response.

From the agent or Kubernetes node network, verify DNS and test the TLS chain and hostname against that host's OpenSSL trust store:

~~~bash
getent hosts registry.example.com
openssl s_client -connect registry.example.com:5443 \
  -servername registry.example.com \
  -verify_hostname registry.example.com \
  -verify_return_error </dev/null
~~~

For Docker, install the private CA where the Docker daemon trusts registries, not only inside the Woodpecker agent container. For Kubernetes, the node container runtime needs the CA. Do not set insecure-registry or skip verification as a permanent substitute for a valid trust chain.

Also confirm the registry reverse proxy preserves the `Authorization` header and serves the Docker Registry HTTP API correctly.

## Pull Credentials Are Not Push Credentials

This registry entry lets the backend pull `registry.example.com/acme/builder`:

~~~yaml
steps:
  - name: build
    image: registry.example.com/acme/builder:2
~~~

It does not let a running Docker client push `registry.example.com/acme/output`. For a publishing plugin:

~~~yaml
steps:
  - name: publish
    image: woodpeckerci/plugin-docker-buildx:6.1.1
    settings:
      repo: registry.example.com/acme/output
      registry: registry.example.com
      username:
        from_secret: registry_push_username
      password:
        from_secret: registry_push_password
~~~

On Woodpecker 3.x, an administrator must also allow this exact tagged plugin image through `WOODPECKER_PLUGINS_PRIVILEGED`.

Use separate read-only pull and scoped push identities. Keep push secrets out of pull-request events.

## A Systematic Checklist

1. Copy the full image reference from the failing Pod or step.
2. Derive its registry hostname, including port.
3. Confirm the Woodpecker registry entry has exactly that host.
4. Confirm the account can pull that exact repository and tag.
5. Distinguish repository, organization, global, and extension credentials.
6. On Kubernetes, inspect `imagePullSecrets` and Pod events.
7. Confirm the Secret exists in the worker Pod's namespace.
8. On 3.x, when referencing Kubernetes pull Secrets through agent configuration, set `WOODPECKER_BACKEND_K8S_PULL_SECRET_NAMES` explicitly.
9. Verify node/daemon DNS and CA trust.
10. Configure separate step secrets if the failing operation is a push.

## Official Documentation

- [Woodpecker: Registries and hostname matching](https://woodpecker-ci.org/docs/usage/registries)
- [Woodpecker: Kubernetes private registries](https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes#private-registries)
- [Woodpecker: Server Docker configuration](https://woodpecker-ci.org/docs/administration/configuration/server#docker_config)
- [Woodpecker: Registry extension](https://woodpecker-ci.org/docs/usage/extensions/registry-extension)
- [Woodpecker: 3.0 Kubernetes pull-secret migration](https://woodpecker-ci.org/migrations#300)
- [Kubernetes: Pull an image from a private registry](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)

## Conclusion

Fix a private-image pull at the layer performing it. Match the registry credential to the exact image hostname and port, without a scheme or path. On Kubernetes, when referencing pull Secrets through agent configuration, name them explicitly and place them in the worker Pod's namespace—especially after the Woodpecker 3.x migration. Keep backend pull credentials separate from narrowly scoped push secrets inside publishing steps.
